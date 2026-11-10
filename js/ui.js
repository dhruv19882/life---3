'use strict';
/* UI building blocks: rings, charts, bottom sheets, toasts, confetti, rest timer, count-up. */
(function () {
  const { esc, icon, clamp } = App;

  /* ---------- progress ring ---------- */
  App.ring = (pct, { size = 120, stroke = 10, grad = 'g-accent', label = '', sub = '', cls = '' } = {}) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = clamp(pct, 0, 1);
    return `<div class="ring ${cls}" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-val"
          stroke="url(#${grad})" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - p)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>
      <div class="ring-label">${label}${sub ? `<small>${sub}</small>` : ''}</div>
    </div>`;
  };

  /* ---------- linear bar ---------- */
  App.bar = (pct, grad = 'accent', extra = '') =>
    `<div class="bar ${extra}"><span class="bar-fill grad-${grad}" style="--w:${clamp(pct, 0, 1) * 100}%"></span></div>`;

  /* ---------- vertical bar chart ---------- */
  // items: [{label, value, cls, title}], opts: {height, max, lines:[{v, cls, label}]}
  App.barChart = (items, { height = 140, max, lines = [], fmt = (v) => v } = {}) => {
    const m = Math.max(max || 0, ...items.map((i) => i.value), ...lines.map((l) => l.v), 1);
    const ln = lines
      .map((l) => `<div class="chart-line ${l.cls || ''}" style="bottom:${(l.v / m) * 100}%"><span>${esc(l.label || '')}</span></div>`)
      .join('');
    const bars = items
      .map(
        (i, idx) => `<div class="cbar" title="${esc(i.title || '')}">
          <div class="cbar-col"><span class="cbar-val">${i.value ? fmt(i.value) : ''}</span>
          <div class="cbar-fill ${i.cls || 'grad-accent'}" style="--h:${(i.value / m) * 100}%;--d:${idx * 40}ms"></div></div>
          <span class="cbar-label">${esc(i.label)}</span></div>`
      )
      .join('');
    return `<div class="chart" style="--ch:${height}px"><div class="chart-area">${bars}<div class="chart-lines">${ln}</div></div></div>`;
  };

  /* ---------- line chart ---------- */
  App.lineChart = (pts, { height = 150, fmt = (v) => v } = {}) => {
    if (pts.length < 2) return `<div class="empty small">Add at least 2 entries to see your trend</div>`;
    const W = 320, H = height, pad = 18;
    const vs = pts.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
    const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${d} L${x(pts.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
    const dots = pts
      .map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" class="lc-dot" style="--d:${i * 50}ms"><title>${esc(p.label)}: ${fmt(p.v)}</title></circle>`)
      .join('');
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
      <path d="${area}" fill="url(#g-area)" class="lc-area"/>
      <path d="${d}" class="lc-path" stroke="url(#g-accent)" pathLength="1"/>
      ${dots}
      <text x="${pad}" y="12" class="lc-txt">${fmt(hi)}</text>
      <text x="${pad}" y="${H - 4}" class="lc-txt">${fmt(lo)}</text>
    </svg>`;
  };

  /* ---------- donut ---------- */
  App.donut = (parts, { size = 150, stroke = 18, center = '' } = {}) => {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let acc = 0;
    const segs = parts
      .map((p, i) => {
        const len = (p.value / total) * c;
        const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}"
          stroke-dasharray="${Math.max(len - 2, 0)} ${c}" stroke-dashoffset="${-acc}" class="donut-seg" style="--d:${i * 80}ms"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
        acc += len;
        return s;
      })
      .join('');
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>${segs}</svg>
      <div class="ring-label">${center}</div></div>`;
  };

  /* ---------- after-render animations ---------- */
  // Full animations on page entry; quiet re-renders (after a tap) show final values instantly.
  App.animateIn = (root) => {
    const quiet = root.classList.contains('no-reveal');
    const run = () => {
      root.querySelectorAll('.ring-val[data-offset]').forEach((el) => (el.style.strokeDashoffset = el.dataset.offset));
      root.querySelectorAll('[data-count]').forEach((el) => (quiet ? setCount(el) : countUp(el)));
      root.classList.add('ready');
    };
    if (quiet) run();
    else requestAnimationFrame(() => requestAnimationFrame(run));
  };

  function setCount(el) {
    const to = parseFloat(el.dataset.count) || 0;
    const dec = parseInt(el.dataset.dec || '0', 10);
    el.textContent = (el.dataset.prefix || '') + (dec ? to.toFixed(dec) : App.num(to)) + (el.dataset.suffix || '');
  }

  function countUp(el) {
    const to = parseFloat(el.dataset.count) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dec = parseInt(el.dataset.dec || '0', 10);
    const fmt = (v) => prefix + (dec ? v.toFixed(dec) : App.num(v)) + suffix;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return (el.textContent = fmt(to));
    const start = performance.now();
    const dur = 700;
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  App.count = (v, { prefix = '', suffix = '', dec = 0 } = {}) =>
    `<span data-count="${v}" data-prefix="${esc(prefix)}" data-suffix="${esc(suffix)}" data-dec="${dec}">${prefix}0${suffix}</span>`;

  /* ---------- toasts ---------- */
  App.toast = (msg, kind = 'ok') => {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = `toast toast-${kind}`;
    t.innerHTML = `${icon(kind === 'bad' ? 'alert' : kind === 'warn' ? 'bell' : 'check')}<span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  };

  /* ---------- bottom sheet with form ---------- */
  let sheetSubmit = null;
  App.sheet = ({ title, body, submit = 'Save', onSubmit, danger }) => {
    const root = document.getElementById('sheets');
    root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div>
      <form class="sheet" id="sheetForm" autocomplete="off">
        <div class="sheet-grip"></div>
        <div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
        <div class="sheet-body">${body}</div>
        ${onSubmit ? `<div class="sheet-foot">${danger ? `<button type="button" class="btn btn-ghost danger" data-act="${danger.act}" ${danger.attrs || ''}>${icon('trash')}${esc(danger.label)}</button>` : ''}<button type="submit" class="btn btn-primary">${esc(submit)}</button></div>` : ''}
      </form>`;
    sheetSubmit = onSubmit || null;
    requestAnimationFrame(() => root.classList.add('open'));
    document.body.classList.add('no-scroll');
    const first = root.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select');
    if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 250);
  };
  App.closeSheet = () => {
    const root = document.getElementById('sheets');
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 300);
    sheetSubmit = null;
  };
  App.actions.closeSheet = () => App.closeSheet();

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'sheetForm') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (sheetSubmit && sheetSubmit(data, e.target) !== false) App.closeSheet();
  });

  /* ---------- form field helpers ---------- */
  App.field = (label, input, hint = '') =>
    `<label class="field"><span class="field-label">${esc(label)}</span>${input}${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
  App.input = (name, { type = 'text', value = '', placeholder = '', required = false, min, max, step, inputmode } = {}) =>
    `<input class="inp" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}
      ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${step !== undefined ? `step="${step}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''}/>`;
  App.chips = (name, options, selected) =>
    `<div class="chips">${options
      .map((o) => `<label class="chip"><input type="radio" name="${name}" value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'checked' : ''}/><span>${o.label}</span></label>`)
      .join('')}</div>`;

  /* ---------- confetti ---------- */
  App.confetti = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.getElementById('confetti');
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#8b5cf6', '#22d3ee', '#34d399', '#facc15', '#fb7185', '#fb923c'];
    const ps = Array.from({ length: 110 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4,
      s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0], life: 0,
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 110);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (++frame < 110) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    tick();
  };

  /* ---------- rest timer ---------- */
  let rt = null;
  App.startRest = (secs, label = 'Rest') => {
    clearInterval(rt && rt.int);
    const el = document.getElementById('restTimer');
    const end = Date.now() + secs * 1000;
    rt = { end, total: secs };
    el.hidden = false;
    const draw = () => {
      const left = Math.max(0, Math.round((rt.end - Date.now()) / 1000));
      const pct = left / rt.total;
      el.innerHTML = `<div class="rt-ring" style="--p:${pct}"><span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span></div>
        <div class="rt-info"><b>${esc(label)}</b><small>Next set when the timer ends</small></div>
        <button class="icon-btn" data-act="restAdd" aria-label="Add 15 seconds">+15</button>
        <button class="icon-btn" data-act="restStop" aria-label="Stop timer">${icon('x')}</button>`;
      if (left <= 0) {
        clearInterval(rt.int);
        App.buzz([200, 100, 200]);
        App.toast('Rest over. Next set!', 'warn');
        setTimeout(() => (el.hidden = true), 600);
      }
    };
    draw();
    rt.int = setInterval(draw, 250);
  };
  App.actions.restAdd = () => { if (rt) { rt.end += 15000; rt.total += 15; } };
  App.actions.restStop = () => { if (rt) clearInterval(rt.int); document.getElementById('restTimer').hidden = true; };

  /* ---------- small helpers ---------- */
  App.header = (title, sub = '', right = '') =>
    `<header class="page-head reveal"><div><p class="eyebrow">${sub}</p><h1>${title}</h1></div>${right}</header>`;
  App.seg = (act, options, current, attr = 'v') =>
    `<div class="seg" role="tablist">${options
      .map((o) => `<button class="seg-btn ${o.value === current ? 'on' : ''}" data-act="${act}" data-${attr}="${esc(o.value)}" role="tab" aria-selected="${o.value === current}">${o.label}</button>`)
      .join('')}</div>`;
  App.empty = (ic, title, text, btn = '') =>
    `<div class="empty">${icon(ic, 'empty-ic')}<b>${esc(title)}</b><p>${esc(text)}</p>${btn}</div>`;
})();
