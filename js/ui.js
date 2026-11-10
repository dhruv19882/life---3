'use strict';
/* UI building blocks: rings, charts, sheets, toasts, celebrations, receipts, rest timer, count-up. */
(function () {
  const { esc, icon, clamp } = App;
  const GRAD = { lime: 'g-lime', sky: 'g-sky', mint: 'g-mint', amber: 'g-amber', red: 'g-red' };

  /* ---------- progress ring ---------- */
  App.ring = (p, { size = 120, stroke = 10, grad = 'lime', label = '', sub = '', cls = '' } = {}) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = clamp(Number(p) || 0, 0, 1);
    return `<div class="ring ${cls}" style="width:${size}px;height:${size}px" role="img" aria-label="${Math.round(v * 100)}%">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-val"
          stroke="url(#${GRAD[grad] || grad})" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - v)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>
      <div class="ring-label">${label}${sub ? `<small>${sub}</small>` : ''}</div>
    </div>`;
  };

  /** Concentric activity rings (outer → inner). items: [{pct, grad}] */
  App.rings = (items, { size = 150, stroke = 12, gap = 4, center = '' } = {}) => {
    const circles = items.map((it, i) => {
      const r = size / 2 - stroke / 2 - i * (stroke + gap);
      const c = 2 * Math.PI * r;
      const v = clamp(Number(it.pct) || 0, 0, 1);
      return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-val" style="--d:${i * 120}ms"
          stroke="url(#${GRAD[it.grad] || it.grad})" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - v)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    }).join('');
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${circles}</svg><div class="ring-label">${center}</div></div>`;
  };

  /* ---------- linear bar ---------- */
  App.bar = (p, grad = 'lime', extra = '') =>
    `<div class="bar ${extra}"><span class="bar-fill grad-${grad}" style="--w:${clamp(Number(p) || 0, 0, 1) * 100}%"></span></div>`;

  /* ---------- vertical bar chart ---------- */
  App.barChart = (items, { height = 140, max, lines = [], fmt = (v) => v } = {}) => {
    const m = Math.max(max || 0, ...items.map((i) => i.value), ...lines.map((l) => l.v), 1);
    const ln = lines.map((l) => `<div class="chart-line ${l.cls || ''}" style="bottom:${(l.v / m) * 100}%"><span>${esc(l.label || '')}</span></div>`).join('');
    const bars = items.map((i, idx) => `<div class="cbar" title="${esc(i.title || '')}">
        <div class="cbar-col"><span class="cbar-val">${i.value ? fmt(i.value) : ''}</span>
        <div class="cbar-fill ${i.cls || 'grad-lime'}" style="--h:${(i.value / m) * 100}%;--d:${idx * 40}ms"></div></div>
        <span class="cbar-label">${esc(i.label)}</span></div>`).join('');
    return `<div class="chart" style="--ch:${height}px"><div class="chart-area">${bars}<div class="chart-lines">${ln}</div></div></div>`;
  };

  /* ---------- line chart ---------- */
  App.lineChart = (pts, { height = 150, fmt = (v) => v, target, color = 'lime', min, max } = {}) => {
    if (pts.length < 2) return `<div class="empty small">Add at least 2 entries to see a trend</div>`;
    const W = 320, H = height, pad = 18;
    const vs = pts.map((p) => p.v).concat(target !== undefined ? [target] : []);
    let lo = min !== undefined ? min : Math.min(...vs), hi = max !== undefined ? max : Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
    const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${d} L${x(pts.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" class="lc-dot"><title>${esc(p.label)}: ${fmt(p.v)}</title></circle>`).join('');
    const tl = target !== undefined ? `<line x1="${pad}" x2="${W - pad}" y1="${y(target)}" y2="${y(target)}" class="lc-target"/><text x="${W - pad}" y="${y(target) - 4}" text-anchor="end" class="lc-txt">${fmt(target)} target</text>` : '';
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="Trend chart">
      <path d="${area}" fill="url(#${color === 'sky' ? 'g-area-sky' : 'g-area'})" class="lc-area"/>
      ${tl}
      <path d="${d}" class="lc-path" stroke="url(#${GRAD[color]})" pathLength="1"/>
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
    const segs = parts.map((p, i) => {
      const len = (p.value / total) * c;
      const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}"
          stroke-dasharray="${Math.max(len - 2, 0)} ${c}" stroke-dashoffset="${-acc}" class="donut-seg" style="--d:${i * 80}ms"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      acc += len;
      return s;
    }).join('');
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>${segs}</svg>
      <div class="ring-label">${center}</div></div>`;
  };

  /* ---------- after-render animations ---------- */
  App.animateIn = (root) => {
    const quiet = root.classList.contains('no-reveal') || App.reduced();
    const run = () => {
      root.querySelectorAll('.ring-val[data-offset]').forEach((el) => (el.style.strokeDashoffset = el.dataset.offset));
      root.querySelectorAll('[data-count]').forEach((el) => (quiet ? setCount(el) : countUp(el)));
      root.classList.add('ready');
    };
    if (quiet) run();
    else requestAnimationFrame(() => requestAnimationFrame(run));
  };
  const fmtCount = (el, v) => {
    const dec = parseInt(el.dataset.dec || '0', 10);
    return (el.dataset.prefix || '') + (dec ? App.num(v, dec) : App.num(v)) + (el.dataset.suffix || '');
  };
  function setCount(el) { el.textContent = fmtCount(el, parseFloat(el.dataset.count) || 0); }
  function countUp(el) {
    const to = parseFloat(el.dataset.count) || 0;
    const from = parseFloat(el.dataset.from || '0') || 0;
    const start = performance.now();
    const dur = 800;
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtCount(el, from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  App.count = (v, { prefix = '', suffix = '', dec = 0 } = {}) =>
    `<span class="num" data-count="${v}" data-prefix="${esc(prefix)}" data-suffix="${esc(suffix)}" data-dec="${dec}">${prefix}${dec ? App.num(v, dec) : App.num(v)}${suffix}</span>`;

  /* ---------- toasts ---------- */
  App.toast = (msg, kind = 'ok') => {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `toast toast-${kind}`;
    t.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    t.innerHTML = `<span class="toast-ic">${icon(kind === 'bad' ? 'alert' : kind === 'warn' ? 'bell' : 'check')}</span><span>${esc(msg)}</span>`;
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => t.classList.add('out'), 2800);
    setTimeout(() => t.remove(), 3200);
  };

  /* ---------- bottom sheet with form ---------- */
  let sheetSubmit = null;
  let submitting = false;
  let sheetGen = 0;
  App.sheet = ({ title, body, submit = 'Save', onSubmit, danger, full = false, cls = '', onOpen, foot = '' }) => {
    const root = document.getElementById('sheets');
    root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div>
      <form class="sheet ${full ? 'sheet-full' : ''} ${cls}" id="sheetForm" autocomplete="off" novalidate role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-grip"></div>
        <div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
        <div class="sheet-body">${body}</div>
        ${onSubmit || foot || danger ? `<div class="sheet-foot">${foot}${danger ? `<button type="button" class="btn btn-ghost danger" data-act="${danger.act}" ${danger.attrs || ''}>${icon('trash')}${esc(danger.label)}</button>` : ''}${onSubmit ? `<button type="submit" class="btn btn-primary">${esc(submit)}</button>` : ''}</div>` : ''}
      </form>`;
    sheetSubmit = onSubmit || null;
    submitting = false;
    sheetGen++;
    root.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
    requestAnimationFrame(() => root.classList.add('open'));
    document.body.classList.add('no-scroll');
    const first = root.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), textarea, select');
    if (first && !('ontouchstart' in window) && !full) setTimeout(() => first.focus(), 260);
    if (onOpen) onOpen(root.querySelector('.sheet'));
  };
  App.closeSheet = () => {
    const root = document.getElementById('sheets');
    if (!root.classList.contains('open')) return;
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 320);
    sheetSubmit = null;
  };
  App.actions.closeSheet = () => App.closeSheet();
  App.sheetData = () => {
    const f = document.getElementById('sheetForm');
    return f ? Object.fromEntries(new FormData(f).entries()) : {};
  };

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'sheetForm') return;
    e.preventDefault();
    if (submitting || !sheetSubmit) return; // guards against double taps creating duplicates
    const form = e.target;
    // Native validation messages, shown once
    if (!form.checkValidity()) { form.reportValidity(); return; }
    submitting = true;
    const data = Object.fromEntries(new FormData(form).entries());
    data._all = (name) => new FormData(form).getAll(name);
    let ok;
    const gen = sheetGen;
    try { ok = sheetSubmit(data, form); } catch (err) { console.error(err); App.toast('Something went wrong. Nothing was saved.', 'bad'); ok = false; }
    if (ok === false) { submitting = false; return; }
    if (gen === sheetGen) App.closeSheet();
  });

  /* ---------- form field helpers ---------- */
  App.field = (label, input, hint = '') =>
    `<label class="field"><span class="field-label">${esc(label)}</span>${input}${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
  App.input = (name, { type = 'text', value = '', placeholder = '', required = false, min, max, step, inputmode, attrs = '' } = {}) =>
    `<input class="inp" name="${name}" type="${type}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}
      ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${step !== undefined ? `step="${step}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${attrs}/>`;
  App.textarea = (name, value = '', { rows = 3, placeholder = '', attrs = '' } = {}) =>
    `<textarea class="inp" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`;
  App.select = (name, options, selected, attrs = '') =>
    `<select class="inp" name="${name}" ${attrs}>${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  App.chips = (name, options, selected, type = 'radio') =>
    `<div class="chips">${options.map((o) => {
      const on = type === 'checkbox' ? (selected || []).map(String).includes(String(o.value)) : String(o.value) === String(selected);
      return `<label class="chip"><input type="${type}" name="${name}" value="${esc(o.value)}" ${on ? 'checked' : ''}/><span>${o.label}</span></label>`;
    }).join('')}</div>`;
  App.toggle = (name, label, on, hint = '') =>
    `<label class="toggle-row"><span class="grow"><b>${esc(label)}</b>${hint ? `<small class="muted block">${hint}</small>` : ''}</span><input type="checkbox" class="switch" name="${name}" ${on ? 'checked' : ''}></label>`;

  /* ---------- confetti ---------- */
  App.confetti = (strength = 1) => {
    if (App.reduced()) return;
    const cv = document.getElementById('confetti');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#B9EF45', '#DDF5B6', '#8EDCF0', '#F7F8F5', '#F5B83D'];
    const n = Math.round(90 * strength);
    const ps = Array.from({ length: n }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4,
      s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 100);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (++frame < 100) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    tick();
  };

  /* ---------- overlay: achievement unlock, receipts ---------- */
  let overlayTimer = null;
  function showOverlay(html, { autoClose = 0, cls = '' } = {}) {
    const o = document.getElementById('overlay');
    clearTimeout(overlayTimer);
    o.className = `overlay ${cls}`;
    o.innerHTML = `<div class="overlay-bg" data-act="closeOverlay"></div>${html}`;
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add('on'));
    if (autoClose) overlayTimer = setTimeout(App.closeOverlay, autoClose);
  }
  App.closeOverlay = () => {
    const o = document.getElementById('overlay');
    o.classList.remove('on');
    setTimeout(() => { if (!o.classList.contains('on')) { o.hidden = true; o.innerHTML = ''; } }, 300);
  };
  App.actions.closeOverlay = () => App.closeOverlay();

  /** Premium "achievement unlocked" moment for major events. */
  App.celebrate = ({ title, sub = '', ic = 'trophy', label = 'Achievement unlocked' }) => {
    App.buzz([30, 40, 60]);
    showOverlay(`<div class="unlock" role="alertdialog" aria-label="${esc(title)}">
        <div class="unlock-burst"><i></i><i></i><i></i></div>
        <div class="unlock-badge">${icon(ic)}</div>
        <p class="eyebrow">${esc(label)}</p>
        <h2>${esc(title)}</h2>
        ${sub ? `<p class="muted">${esc(sub)}</p>` : ''}
        <button class="btn btn-primary mt16" data-act="closeOverlay">Continue</button>
      </div>`, { autoClose: 4200, cls: 'ov-unlock' });
    App.confetti(1.2);
  };

  /** Digital receipt with money-movement animation. */
  App.receipt = ({ kind = 'out', title, amount, lines = [], no = '', note = '' }) => {
    App.buzz(kind === 'in' ? [20, 30, 20] : 20);
    App.ui.lastReceipt = { kind, title, amount, lines, no, note };
    showOverlay(`<div class="receipt-wrap">
        <div class="money-move ${kind}"><span class="coin">₹</span><span class="trail"></span></div>
        <div class="receipt" role="dialog" aria-label="Receipt">
          <div class="receipt-top"><span class="receipt-ic ${kind}">${icon(kind === 'in' ? 'downT' : 'up')}</span>
            <p class="eyebrow">${kind === 'in' ? 'Money in' : kind === 'transfer' ? 'Transfer' : 'Money out'}</p>
            <h2 class="receipt-amt ${kind}">${kind === 'in' ? '+' : kind === 'transfer' ? '' : '−'}${App.inr(amount, amount % 1 !== 0)}</h2>
            <p class="muted">${esc(title)}</p></div>
          <div class="receipt-cut"></div>
          <dl class="receipt-lines">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          ${note ? `<p class="receipt-note">${esc(note)}</p>` : ''}
          <p class="receipt-no">${esc(no)} · Stored only on this device</p>
          <div class="row gap mt12"><button class="btn btn-ghost grow" data-act="downloadReceipt">${icon('download')}Save</button><button class="btn btn-primary grow" data-act="closeOverlay">Done</button></div>
        </div></div>`, { cls: 'ov-receipt' });
  };
  App.actions.downloadReceipt = () => {
    const r = App.ui.lastReceipt;
    if (!r) return;
    const rows = r.lines.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${esc(v)}</td></tr>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(r.no)}</title><body style="font-family:system-ui;max-width:420px;margin:40px auto;color:#111315">
      <h2 style="margin:0">LifeOS receipt</h2><p style="color:#666">${esc(r.no)}</p><h1>${App.inr(r.amount, true)}</h1><p>${esc(r.title)}</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>${r.note ? `<p>${esc(r.note)}</p>` : ''}
      <p style="color:#888;font-size:12px">Personal record generated offline by LifeOS. Not a tax invoice.</p></body>`;
    App.download(`${r.no || 'receipt'}.html`, html, 'text/html');
  };

  /** Weight-plate loading animation after a completed set. */
  App.plateFx = (text) => {
    if (App.reduced()) return;
    const el = document.createElement('div');
    el.className = 'plate-fx';
    el.innerHTML = `<div class="barbell"><i class="pl l2"></i><i class="pl l1"></i><span class="bar-rod"></span><i class="pl r1"></i><i class="pl r2"></i></div><b>${esc(text)}</b>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  };

  /* ---------- rest timer ---------- */
  let rt = null;
  App.startRest = (secs, label = 'Rest') => {
    clearInterval(rt && rt.int);
    const el = document.getElementById('restTimer');
    rt = { end: Date.now() + secs * 1000, total: secs, label };
    el.hidden = false;
    const draw = () => {
      const left = Math.max(0, Math.ceil((rt.end - Date.now()) / 1000));
      const p = rt.total ? left / rt.total : 0;
      el.innerHTML = `<div class="rt-ring" style="--p:${p}"><span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span></div>
        <div class="rt-info"><b>${esc(rt.label)}</b><small>Rest · next set when the ring empties</small></div>
        <button class="icon-btn" data-act="restAdd" aria-label="Add 15 seconds">+15</button>
        <button class="icon-btn" data-act="restStop" aria-label="Stop timer">${icon('x')}</button>`;
      if (left <= 0) {
        clearInterval(rt.int);
        App.buzz([200, 100, 200]);
        App.toast('Rest over. Next set!', 'warn');
        setTimeout(() => (el.hidden = true), 700);
      }
    };
    draw();
    rt.int = setInterval(draw, 250);
  };
  App.actions.restAdd = () => { if (rt) { rt.end += 15000; rt.total += 15; } };
  App.actions.restStop = () => { if (rt) clearInterval(rt.int); document.getElementById('restTimer').hidden = true; };

  /* ---------- small helpers ---------- */
  App.header = (title, sub = '', right = '') =>
    `<header class="page-head reveal"><div class="grow"><p class="eyebrow">${sub}</p><h1>${title}</h1></div>${right}</header>`;
  App.back = (to = 'more', label = 'More') => `<button class="back-link" data-act="go" data-r="${to}">${icon('left')}${esc(label)}</button>`;
  App.seg = (act, options, current, attr = 'v') =>
    `<div class="seg" role="tablist">${options.map((o) => `<button type="button" class="seg-btn ${o.value === current ? 'on' : ''}" data-act="${act}" data-${attr}="${esc(o.value)}" role="tab" aria-selected="${o.value === current}">${o.label}</button>`).join('')}</div>`;
  App.empty = (ic, title, text, btn = '') =>
    `<div class="empty">${icon(ic, 'empty-ic')}<b>${esc(title)}</b><p>${esc(text)}</p>${btn}</div>`;
  App.stat = (label, value, sub = '') => `<div class="stat"><small>${esc(label)}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;

  App.download = (name, content, type = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  App.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); App.toast('Copied'); }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); App.toast('Copied'); } catch (e) { App.toast('Could not copy', 'bad'); }
      ta.remove();
    }
  };
  /** Confirm dialog for destructive actions. */
  App.confirm = (msg) => window.confirm(msg);
})();
