'use strict';
/* Social media control: manual screen-time entries with a warning limit and a maximum limit per app.
   A web app cannot read other apps' usage, so nothing here is automatic. */
(function () {
  const { icon, esc, fmtMin, dkey, uid, lastNDays, parseD, DOW, sum } = App;
  App.ui.socialDate = dkey();
  App.ui.socialRange = 'week';
  const STATUS = { ok: { label: 'Under warning', cls: 'ok' }, warn: { label: 'Warning passed', cls: 'warn' }, over: { label: 'Maximum crossed', cls: 'bad' } };
  const minsFor = (date, id) => +((App.state.social.logs[date] || {})[id] || 0);
  App.socialToday = (date = dkey()) => App.socialDay(date);

  function streak() {
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const d = dkey(App.addDays(new Date(), -i));
      const log = App.state.social.logs[d];
      if (!log) { if (i === 0) continue; break; }
      if (App.state.social.apps.some((a) => (+log[a.id] || 0) >= a.high)) break;
      n++;
    }
    return n;
  }

  function render() {
    const date = App.ui.socialDate;
    const apps = App.socialDay(date);
    const total = sum(apps, (x) => x.mins);
    const totalHigh = sum(apps, (x) => x.high), totalLow = sum(apps, (x) => x.low);
    const range = App.ui.socialRange;
    const days = lastNDays(range === 'month' ? 30 : 7);
    const series = days.map((d) => {
      const log = App.state.social.logs[d] || {};
      const v = sum(App.state.social.apps, (x) => +log[x.id] || 0);
      return { label: range === 'month' ? (parseD(d).getDate() % 5 === 0 ? String(parseD(d).getDate()) : '') : DOW[parseD(d).getDay()][0], value: v, title: `${d}: ${fmtMin(v)}`, cls: v >= totalHigh ? 'grad-red' : v >= totalLow ? 'grad-amber' : 'grad-lime' };
    });
    const logged = days.filter((d) => App.state.social.logs[d]);
    const rangeTotal = sum(series, (x) => x.value);
    const avg = logged.length ? rangeTotal / logged.length : 0;
    const overDays = days.filter((d) => { const l = App.state.social.logs[d]; return l && App.state.social.apps.some((a) => (+l[a.id] || 0) >= a.high); }).length;
    const st = streak();
    const yesterday = dkey(App.addDays(new Date(), -1));
    const perApp = App.state.social.apps.map((a) => ({ ...a, tot: sum(days, (d) => minsFor(d, a.id)) })).sort((a, b) => b.tot - a.tot);

    const appCard = (a, i) => {
      const s = STATUS[a.status];
      const max = Math.max(a.high * 1.25, a.mins, 1);
      return `<article class="card reveal" style="--i:${i + 4}">
        <div class="row between"><button class="row gap ta-l" data-act="editApp" data-id="${a.id}"><span class="cat-e" style="--c:${esc(a.color)}">${esc(a.name[0] || '?')}</span>
          <span><b>${esc(a.name)}</b><small class="muted block">Warning ${fmtMin(a.low)} · Max ${fmtMin(a.high)}</small></span></button>
          <span class="badge ${s.cls}">${icon(a.status === 'over' ? 'alert' : a.status === 'warn' ? 'bell' : 'shield')}${s.label}</span></div>
        <div class="row between mt12"><span class="big">${App.count(a.mins)}<small class="muted" style="font-size:13px"> min</small></span><span class="muted small">${a.mins < a.high ? `${fmtMin(a.high - a.mins)} to max` : `${fmtMin(a.mins - a.high)} over`}</span></div>
        <div class="bar thick" style="position:relative;overflow:visible"><span class="bar-fill ${a.status === 'over' ? 'grad-red' : a.status === 'warn' ? 'grad-amber' : 'grad-lime'}" style="--w:${(a.mins / max) * 100}%"></span>
          <span style="position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--amber);left:${(a.low / max) * 100}%"></span><span style="position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--red);left:${(a.high / max) * 100}%"></span></div>
        <div class="row gap-s mt12">${[-15, 5, 15, 30].map((n) => `<button class="btn btn-ghost xs grow" data-act="socAdd" data-id="${a.id}" data-n="${n}">${n > 0 ? '+' : '−'}${Math.abs(n)}</button>`).join('')}<button class="btn btn-soft xs" data-act="socSet" data-id="${a.id}" aria-label="Set exact time">${icon('edit')}</button></div>
      </article>`;
    };

    return `${App.back()}
      ${App.header('Social Media', 'Screen-time control', `<button class="icon-btn lg" data-act="addApp" aria-label="Track app">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('socDate', [{ value: dkey(), label: 'Today' }, { value: yesterday, label: 'Yesterday' }], date)}</div>
      <section class="card hero mt12 reveal" style="--i:1"><div class="hero-main">
        ${App.donut(apps.filter((a) => a.mins).map((a) => ({ value: a.mins, color: a.color })), { size: 138, stroke: 16, center: `${App.count(total)}<small>min total</small>` })}
        <div class="hero-side">
          <div class="mini-stat"><span class="dot" style="--c:var(--amber)"></span><div><b>${fmtMin(totalLow)}</b><small>Total warning limit</small></div></div>
          <div class="mini-stat"><span class="dot" style="--c:var(--red)"></span><div><b>${fmtMin(totalHigh)}</b><small>Total maximum</small></div></div>
          <div class="mini-stat"><span class="dot" style="--c:var(--lime)"></span><div><b>${App.plural(st, 'day')}</b><small>Streak under maximum</small></div></div>
        </div></div></section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('chart')}${range === 'month' ? 'Last 30 days' : 'Last 7 days'}</h3>${App.seg('socRange', [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }], range)}</div>
        ${App.barChart(series, { height: 130, lines: [{ v: totalLow, cls: 'warn', label: 'Warning' }, { v: totalHigh, cls: 'bad', label: 'Max' }], fmt: (v) => (range === 'month' ? '' : fmtMin(v)) })}
        <div class="stat-row">${App.stat('Total', fmtMin(rangeTotal))}${App.stat('Avg / logged day', fmtMin(avg))}${App.stat('Days over max', overDays)}</div>
        <div class="list mt12">${perApp.filter((a) => a.tot).map((a) => `<div class="li"><span class="dot" style="--c:${esc(a.color)}"></span><span class="grow">${esc(a.name)}</span><b class="li-amt">${fmtMin(a.tot)}</b></div>`).join('')}</div></section>
      <p class="section-note reveal" style="--i:3">${icon('info')}<span>LifeOS cannot read your phone's app usage. Check Digital Wellbeing (Android) or Screen Time (iPhone) and enter the minutes here.</span></p>
      ${apps.map(appCard).join('')}
      <div class="tabbar-space"></div>`;
  }

  App.actions.socDate = (el) => { App.ui.socialDate = el.dataset.v; App.render({ quiet: true }); };
  App.actions.socRange = (el) => { App.ui.socialRange = el.dataset.v; App.render({ quiet: true }); };
  function setMins(id, mins) {
    const date = App.ui.socialDate;
    const logs = App.state.social.logs;
    const a = App.state.social.apps.find((x) => x.id === id);
    if (!a) return;
    const before = App.socialStatus(minsFor(date, id), a);
    logs[date] = logs[date] || {};
    logs[date][id] = Math.max(0, Math.min(1440, Math.round(mins)));
    const after = App.socialStatus(logs[date][id], a);
    if (after !== before && after !== 'ok') {
      App.buzz(after === 'over' ? [80, 60, 80] : 40);
      App.toast(after === 'over' ? `${a.name}: maximum limit crossed. Time to stop.` : `${a.name}: warning limit passed. ${fmtMin(a.high - logs[date][id])} left before the maximum.`, after === 'over' ? 'bad' : 'warn');
    }
    App.commit();
  }
  App.actions.socAdd = (el) => { App.buzz(); setMins(el.dataset.id, minsFor(App.ui.socialDate, el.dataset.id) + +el.dataset.n); };
  App.actions.socSet = (el) => {
    const a = App.state.social.apps.find((x) => x.id === el.dataset.id);
    const cur = minsFor(App.ui.socialDate, a.id);
    App.sheet({
      title: `${a.name} time`,
      body: `<div class="grid2">${App.field('Hours', App.input('h', { type: 'number', value: Math.floor(cur / 60), min: 0, max: 24, inputmode: 'numeric' }))}${App.field('Minutes', App.input('m', { type: 'number', value: cur % 60, min: 0, max: 59, inputmode: 'numeric' }))}</div>
        <p class="field-hint">Enter the total for ${App.ui.socialDate === dkey() ? 'today' : 'yesterday'} from your phone's screen-time settings.</p>`,
      onSubmit: (d) => setMins(a.id, (+d.h || 0) * 60 + (+d.m || 0)),
    });
  };
  const COLORS = ['#E1306C', '#FF4E45', '#25D366', '#F5E000', '#1877F2', '#8EDCF0', '#B9EF45', '#FF7A00', '#A6B4FF', '#9A9FA0'];
  const PRESETS = [15, 30, 45, 60, 90, 120, 180];
  function appSheet(a) {
    const isNew = !a;
    a = a || { name: '', color: COLORS[App.state.social.apps.length % COLORS.length], low: 30, high: 60 };
    App.sheet({
      title: isNew ? 'Track a new app' : `Edit ${a.name}`,
      submit: isNew ? 'Add app' : 'Save limits',
      body: `${App.field('App name', App.input('name', { value: a.name, placeholder: 'e.g. Facebook, Reels, Games', required: true }))}
        ${App.field('Colour', `<div class="chips">${COLORS.map((c) => `<label class="chip color"><input type="radio" name="color" value="${c}" ${c === a.color ? 'checked' : ''}><span style="--c:${c}"></span></label>`).join('')}</div>`)}
        ${App.field('Warning limit (minutes)', App.input('low', { type: 'number', value: a.low, min: 1, max: 1440, required: true, inputmode: 'numeric' }), 'Amber warning after this many minutes.')}
        <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="low" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>
        ${App.field('Maximum limit (minutes)', App.input('high', { type: 'number', value: a.high, min: 2, max: 1440, required: true, inputmode: 'numeric' }), 'Red alert when you cross this.')}
        <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="high" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>`,
      danger: isNew ? null : { act: 'deleteApp', label: 'Remove', attrs: `data-id="${a.id}"` },
      onSubmit: (d) => {
        const name = (d.name || '').trim().slice(0, 24);
        const low = Math.round(+d.low), high = Math.round(+d.high);
        if (!name) return false;
        if (!(low > 0 && high > low)) { App.toast('Maximum must be more than the warning limit', 'bad'); return false; }
        const obj = { name, color: COLORS.includes(d.color) ? d.color : COLORS[0], low, high };
        if (isNew) App.state.social.apps.push({ id: uid(), ...obj }); else Object.assign(a, obj);
        App.toast(isNew ? `Tracking ${name}` : 'Limits saved');
        App.commit();
      },
    });
  }
  App.actions.addApp = () => appSheet(null);
  App.actions.editApp = (el) => appSheet(App.state.social.apps.find((x) => x.id === el.dataset.id));
  App.actions.deleteApp = (el) => {
    if (!App.confirm('Stop tracking this app? Past logs are kept but hidden.')) return;
    App.state.social.apps = App.state.social.apps.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.commit();
  };

  App.views.social = { render };
})();
