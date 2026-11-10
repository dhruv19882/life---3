'use strict';
/* Social media tracker: manual time entry with user-set low (warning) and high (stop) limits. */
(function () {
  const { icon, esc, fmtMin, dkey, uid, lastNDays, parseD, DOW } = App;
  App.ui.socialDate = dkey();

  const statusOf = (mins, a) => (mins >= a.high ? 'over' : mins >= a.low ? 'warn' : 'ok');
  const STATUS = {
    ok: { label: 'Safe', cls: 'ok' },
    warn: { label: 'Low limit passed', cls: 'warn' },
    over: { label: 'High limit crossed', cls: 'bad' },
  };

  const minsFor = (date, id) => ((App.state.social.logs[date] || {})[id] || 0);

  App.socialToday = (date = dkey()) =>
    App.state.social.apps.map((a) => {
      const mins = minsFor(date, a.id);
      return { ...a, mins, status: statusOf(mins, a) };
    });

  function streak() {
    // consecutive days (ending yesterday or today) where no app crossed its high limit
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const d = dkey(App.addDays(new Date(), -i));
      const log = App.state.social.logs[d];
      if (!log) { if (i === 0) continue; break; }
      const bad = App.state.social.apps.some((a) => (log[a.id] || 0) >= a.high);
      if (bad) break;
      n++;
    }
    return n;
  }

  function render() {
    const date = App.ui.socialDate;
    const apps = App.socialToday(date);
    const total = apps.reduce((a, x) => a + x.mins, 0);
    const totalHigh = apps.reduce((a, x) => a + x.high, 0);
    const totalLow = apps.reduce((a, x) => a + x.low, 0);
    const days = lastNDays(7);
    const weekly = days.map((d) => {
      const log = App.state.social.logs[d] || {};
      const v = apps.reduce((a, x) => a + (log[x.id] || 0), 0);
      return { label: DOW[parseD(d).getDay()][0], value: v, title: `${d}: ${fmtMin(v)}`,
        cls: v >= totalHigh ? 'grad-red' : v >= totalLow ? 'grad-warm' : 'grad-green' };
    });
    const weekAvg = weekly.reduce((a, x) => a + x.value, 0) / 7;
    const st = streak();
    const yesterday = dkey(App.addDays(new Date(), -1));

    const appCard = (a, i) => {
      const s = STATUS[a.status];
      const max = Math.max(a.high * 1.25, a.mins);
      return `<article class="card app-card status-${a.status} reveal" style="--i:${i + 4}">
        <div class="row between">
          <button class="row gap ta-l" data-act="editApp" data-id="${a.id}">
            <span class="app-dot" style="--c:${esc(a.color)}">${esc(a.name[0] || '?')}</span>
            <span><b>${esc(a.name)}</b><small class="muted block">Low ${fmtMin(a.low)} · High ${fmtMin(a.high)}</small></span>
          </button>
          <span class="badge ${s.cls}">${a.status !== 'ok' ? icon(a.status === 'over' ? 'alert' : 'bell') : icon('shield')}${s.label}</span>
        </div>
        <div class="app-time"><b>${App.count(a.mins)}</b><span>min</span></div>
        <div class="limit-bar">
          <span class="lb-fill lb-${a.status}" style="--w:${(a.mins / max) * 100}%"></span>
          <span class="lb-mark low" style="left:${(a.low / max) * 100}%"><i>Low</i></span>
          <span class="lb-mark high" style="left:${(a.high / max) * 100}%"><i>High</i></span>
        </div>
        <div class="step-row">
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="-15">−15</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="5">+5</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="15">+15</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="30">+30</button>
          <button class="step accent" data-act="socSet" data-id="${a.id}">${icon('edit')}</button>
        </div>
      </article>`;
    };

    return `
      ${App.header('Social', 'Screen time tracker', `<button class="fab-sm" data-act="addApp" aria-label="Add app">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('socDate', [{ value: dkey(), label: 'Today' }, { value: yesterday, label: 'Yesterday' }], date)}</div>

      <section class="card hero reveal mt12" style="--i:1">
        <div class="hero-main">
          ${App.donut(apps.filter((a) => a.mins).map((a) => ({ value: a.mins, color: a.color })), { size: 140, stroke: 16,
            center: `${App.count(total)}<small>min total</small>` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:#facc15"></span><div><b>${fmtMin(totalLow)}</b><small>Total low limit</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#f43f5e"></span><div><b>${fmtMin(totalHigh)}</b><small>Total high limit</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#34d399"></span><div><b>${st} day${st === 1 ? '' : 's'}</b><small>Under-limit streak</small></div></div>
          </div>
        </div>
        <div class="legend">${apps.map((a) => `<span><i style="background:${esc(a.color)}"></i>${esc(a.name)}</span>`).join('')}</div>
      </section>

      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('cal')}Last 7 days</h3><span class="muted small">Avg ${fmtMin(weekAvg)}/day</span></div>
        ${App.barChart(weekly, { height: 130, lines: [{ v: totalLow, cls: 'warn', label: 'Low' }, { v: totalHigh, cls: 'bad', label: 'High' }], fmt: (v) => fmtMin(v) })}
      </section>

      <p class="section-note reveal" style="--i:3">${icon('info')}<span>Check your phone's Digital Wellbeing / Screen Time, then log the minutes here. <b class="warn-t">Yellow</b> = passed low limit, <b class="neg">red</b> = crossed high limit.</span></p>
      ${apps.map(appCard).join('')}
      <div class="tabbar-space"></div>`;
  }

  /* ---------- actions ---------- */
  App.actions.socDate = (el) => { App.ui.socialDate = el.dataset.v; App.render({ quiet: true }); };

  function setMins(id, mins) {
    const date = App.ui.socialDate;
    const logs = App.state.social.logs;
    const a = App.state.social.apps.find((x) => x.id === id);
    if (!a) return;
    const before = statusOf(minsFor(date, id), a);
    logs[date] = logs[date] || {};
    logs[date][id] = Math.max(0, Math.min(1440, Math.round(mins)));
    const after = statusOf(logs[date][id], a);
    if (after !== before && after !== 'ok') {
      App.buzz(after === 'over' ? [80, 60, 80] : 40);
      App.toast(after === 'over' ? `${a.name}: high limit crossed. Put the phone down!` : `${a.name}: low limit passed. ${fmtMin(a.high - logs[date][id])} left.`, after === 'over' ? 'bad' : 'warn');
    }
    App.commit();
  }

  App.actions.socAdd = (el) => {
    App.buzz();
    setMins(el.dataset.id, minsFor(App.ui.socialDate, el.dataset.id) + +el.dataset.n);
  };
  App.actions.socSet = (el) => {
    const a = App.state.social.apps.find((x) => x.id === el.dataset.id);
    const cur = minsFor(App.ui.socialDate, a.id);
    App.sheet({
      title: `${a.name} time`,
      body: `<div class="grid2">
        ${App.field('Hours', App.input('h', { type: 'number', value: Math.floor(cur / 60), min: 0, max: 24, inputmode: 'numeric' }))}
        ${App.field('Minutes', App.input('m', { type: 'number', value: cur % 60, min: 0, max: 59, inputmode: 'numeric' }))}</div>
        <p class="field-hint">Enter the total for ${App.ui.socialDate === dkey() ? 'today' : 'yesterday'} from your phone's screen time settings.</p>`,
      onSubmit: (d) => setMins(a.id, (+d.h || 0) * 60 + (+d.m || 0)),
    });
  };

  const COLORS = ['#e1306c', '#ff3b3b', '#25d366', '#f5e000', '#1877f2', '#1da1f2', '#8b5cf6', '#ff7a00', '#22d3ee', '#a3a3a3'];
  const PRESETS = [15, 30, 45, 60, 90, 120, 180];

  function appSheet(a) {
    const isNew = !a;
    a = a || { name: '', color: COLORS[App.state.social.apps.length % COLORS.length], low: 30, high: 60 };
    App.sheet({
      title: isNew ? 'Track a new app' : `Edit ${a.name}`,
      submit: isNew ? 'Add app' : 'Save limits',
      body: `
        ${App.field('App name', App.input('name', { value: a.name, placeholder: 'e.g. Facebook, Reels, Games', required: true }))}
        ${App.field('Colour', `<div class="chips colors">${COLORS.map((c) => `<label class="chip color"><input type="radio" name="color" value="${c}" ${c === a.color ? 'checked' : ''}><span style="--c:${c}"></span></label>`).join('')}</div>`)}
        <div class="limit-pick">
          ${App.field('🟡 Low limit (warning)', App.input('low', { type: 'number', value: a.low, min: 1, max: 1440, required: true, inputmode: 'numeric' }), 'You get a yellow warning after this many minutes.')}
          <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="low" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>
          ${App.field('🔴 High limit (stop)', App.input('high', { type: 'number', value: a.high, min: 2, max: 1440, required: true, inputmode: 'numeric' }), 'Red alert when you cross this.')}
          <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="high" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>
        </div>`,
      danger: isNew ? null : { act: 'deleteApp', label: 'Remove', attrs: `data-id="${a.id}"` },
      onSubmit: (d) => {
        const name = (d.name || '').trim().slice(0, 24);
        const low = Math.round(+d.low), high = Math.round(+d.high);
        if (!name) return false;
        if (!(low > 0 && high > low)) { App.toast('High limit must be more than the low limit', 'bad'); return false; }
        const obj = { name, color: COLORS.includes(d.color) ? d.color : COLORS[0], low, high };
        if (isNew) App.state.social.apps.push({ id: uid(), ...obj });
        else Object.assign(a, obj);
        App.toast(isNew ? `Tracking ${name}` : 'Limits saved');
        App.commit();
      },
    });
  }
  App.actions.preset = (el) => {
    const inp = document.querySelector(`#sheetForm [name="${el.dataset.f}"]`);
    if (inp) { inp.value = el.dataset.v; inp.classList.add('flash'); setTimeout(() => inp.classList.remove('flash'), 400); }
  };
  App.actions.addApp = () => appSheet(null);
  App.actions.editApp = (el) => appSheet(App.state.social.apps.find((x) => x.id === el.dataset.id));
  App.actions.deleteApp = (el) => {
    if (!confirm('Stop tracking this app? Past logs for it are kept but hidden.')) return;
    App.state.social.apps = App.state.social.apps.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.commit();
  };

  App.views.social = { render };
})();
