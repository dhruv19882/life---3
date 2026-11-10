'use strict';
/* Home: life dashboard with greeting, live clock, Life Score, 12 module cards, summary and tomorrow preview. */
(function () {
  const { icon, esc, inr, fmtMin, dkey, r1, sum } = App;

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  const clockText = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  App.initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  /** The MY LIFE SCORE visual: six arc segments, one per pillar. */
  App.lifeScoreViz = (ls, size = 260) => {
    const cx = 130, r = 108, sw = 15;
    const C = 2 * Math.PI * r;
    const seg = C / 6, gap = C * 0.022, vis = seg - gap;
    const grads = ['g-lime', 'g-sky', 'g-mint', 'g-lime', 'g-sky', 'g-mint'];
    const arcs = ls.pillars.map((p, i) => {
      const rot = -90 + i * 60 + (gap / C) * 180;
      const v = p.score === null ? 0 : p.score / 100;
      return `<circle cx="${cx}" cy="${cx}" r="${r}" class="score-seg-track" stroke-width="${sw}" stroke-dasharray="${vis} ${C}" transform="rotate(${rot} ${cx} ${cx})"/>
        <circle cx="${cx}" cy="${cx}" r="${r}" class="score-seg ring-val" style="--d:${i * 110}ms" stroke-width="${sw}" stroke="url(#${grads[i]})"
          stroke-dasharray="${vis} ${C}" stroke-dashoffset="${vis}" data-offset="${vis * (1 - v)}" transform="rotate(${rot} ${cx} ${cx})"
          data-act="pillar" data-id="${p.id}"><title>${esc(p.label)}: ${p.score === null ? 'not scored' : p.score}</title></circle>`;
    }).join('');
    const inner = 2 * Math.PI * 84;
    const ov = ls.overall === null ? 0 : ls.overall / 100;
    return `<div class="score-wrap" style="width:${size}px">
      <svg class="score-svg" viewBox="0 0 260 260" role="img" aria-label="Life score ${ls.overall ?? 'not available'}">
        ${arcs}
        <circle cx="130" cy="130" r="84" class="ring-track" stroke-width="3"/>
        <circle cx="130" cy="130" r="84" class="ring-val" stroke="url(#g-sky)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${inner}" stroke-dashoffset="${inner}" data-offset="${inner * (1 - ov)}" transform="rotate(-90 130 130)"/>
      </svg>
      <div class="score-center"><div>${ls.overall === null ? '<b class="faint">—</b>' : `<b>${App.count(ls.overall)}</b>`}<small>My Life Score</small></div></div>
    </div>`;
  };
  App.pillarChips = (ls) => `<div class="pillars">${ls.pillars.map((p) => `<button class="pillar" data-act="pillar" data-id="${p.id}">
      <small>${icon(p.ic)}${esc(p.label)}</small>${p.score === null ? '<b class="na">n/a</b>' : `<b>${p.score}</b>`}</button>`).join('')}</div>`;

  function dailySummary() {
    const s = App.state;
    const t = App.T();
    const n = App.nutritionDay();
    const g = App.gymDay();
    const cm = sum(App.cmaSessions(dkey(), dkey()), (x) => x.minutes);
    const spentToday = sum(s.money.txns.filter((x) => x.date === dkey()), (x) => (x.type === 'expense' ? x.amount : x.type === 'refund' ? -x.amount : 0));
    const parts = [];
    parts.push(n.items ? `${App.num(n.kcal)} of ${App.num(t.kcal)} kcal and ${Math.round(n.p)} g protein so far` : 'No food logged yet');
    parts.push(g.rest && !g.trainedOther ? 'rest day' : g.finished ? 'workout finished' : `workout ${g.done}/${g.total} sets`);
    parts.push(cm ? `${fmtMin(cm)} CMA study` : 'no study logged');
    parts.push(spentToday ? `${inr(spentToday)} spent` : 'nothing spent');
    return parts.join(' · ') + '.';
  }

  function tile({ act = '', r = '', tab = '', ic, fill = 'f-dark', val, label, extra = '', badge = '', cls = '', attrs = '' }) {
    return `<button class="card tile ${cls}" ${act ? `data-act="${act}"` : 'data-act="go"'} ${r ? `data-r="${r}"` : ''} ${tab ? `data-tab="${tab}"` : ''} ${attrs}>
      <div class="tile-top"><span class="tile-ic ${fill}">${icon(ic)}</span>${badge}</div>
      <span class="tile-val">${val}</span><span class="tile-label">${label}</span>${extra}</button>`;
  }

  function render() {
    const s = App.state;
    const p = s.profile;
    const t = App.T();
    const today = dkey();
    const d = new Date();
    const n = App.nutritionDay();
    const water = App.waterMl();
    const w = App.currentWeight();
    const nextTarget = (p.targets || []).map(Number).find((x) => x > w) || (p.targets || [])[0];
    const g = App.gymDay();
    const cw = App.cmaWeek();
    const cmToday = sum(App.cmaSessions(today, today), (x) => x.minutes);
    const wd = App.workDay();
    const mm = App.monthMoney();
    const bal = App.balance();
    const dc = App.dubaiCalc();
    const soc = App.socialDay();
    const socTot = sum(soc, (a) => a.mins);
    const socBad = soc.filter((a) => a.status === 'over').length, socWarn = soc.filter((a) => a.status === 'warn').length;
    const td = App.todosDay();
    const prodDone = td.done.length + wd.done.length;
    const prodDue = prodDone + td.open.length + wd.dueOpen.length;
    const ls = App.lifeScore();
    const notes = App.notifications();
    const prios = [...s.todos.filter((x) => !x.done && x.due && x.due <= today), ...s.work.tasks.filter((x) => x.status !== 'done' && x.due && x.due <= today).map((x) => ({ ...x, work: true }))]
      .sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.priority || 'med'] - { high: 0, med: 1, low: 2 }[b.priority || 'med']) || (a.due || '').localeCompare(b.due || ''));

    const tom = App.addDays(new Date(), 1);
    const tomKey = dkey(tom);
    const tomDay = App.dayDef(App.dayKeyFor(tomKey));
    const tomTasks = s.todos.filter((x) => !x.done && x.due === tomKey).length + s.work.tasks.filter((x) => x.status !== 'done' && x.due === tomKey).length;
    const tomWork = App.isWorkday(tomKey);

    return `
      <header class="topbar reveal">
        <button class="avatar" data-act="go" data-r="settings" aria-label="Profile">${p.avatar ? esc(p.avatar) : esc(App.initials(p.name))}</button>
        <div class="greet"><small>${App.DOW_LONG[d.getDay()]}, ${d.getDate()} ${App.MON_LONG[d.getMonth()]} · <span class="clock" id="liveClock">${clockText()}</span></small>
          <h1>${greeting()}, ${esc(p.name.split(' ')[0])}</h1></div>
        <button class="icon-btn lg bell" data-act="notifications" aria-label="Notifications (${notes.length})">${icon('bell')}${notes.length ? '<span class="dotn"></span>' : ''}</button>
      </header>

      <div class="desk-2">
      <section class="card hero score-card reveal" style="--i:1">
        <div class="row between"><span class="eyebrow">Today · transparent rules, real data only</span><button class="link" data-act="go" data-r="progress">Details ${icon('right')}</button></div>
        ${App.lifeScoreViz(ls)}
        ${App.pillarChips(ls)}
        <p class="muted small mt12">${esc(dailySummary())}</p>
      </section>

      <div>
      <section class="tiles reveal" style="--i:2">
        ${tile({ r: 'nutrition', ic: 'flame', fill: 'f-lime', val: `${App.count(n.kcal)}<small> / ${App.num(t.kcal)}</small>`, label: 'Calories', extra: App.bar(n.kcal / t.kcal, n.kcal > t.kcal * 1.15 ? 'amber' : 'lime') })}
        ${tile({ r: 'nutrition', ic: 'zap', fill: 'f-sky', val: `${App.count(n.p)}<small> / ${t.protein} g</small>`, label: 'Protein', extra: App.bar(n.p / t.protein, 'sky') })}
        ${tile({ act: 'addWater', ic: 'drop', fill: 'f-sky', val: `${App.count(water / 1000, { dec: 2 })}<small> / ${r1(t.waterMl / 1000)} L</small>`, label: 'Water · tap +250 ml', extra: App.bar(water / t.waterMl, 'sky'), attrs: 'data-ml="250"' })}
        ${tile({ act: 'quickWeight', ic: 'scale', fill: 'f-mint', val: `${App.count(w, { dec: 1 })}<small> kg</small>`, label: nextTarget ? `${r1(nextTarget - w)} kg to ${nextTarget} kg` : 'Current weight' })}
        ${tile({ act: 'gymToday', ic: g.rest ? 'moon' : 'dumbbell', fill: g.finished ? 'f-lime' : 'f-dark', val: g.rest ? 'Rest day' : esc(g.def.short || g.def.name), label: g.rest ? 'Recovery · walk & stretch' : `${g.done}/${g.total} sets${g.finished ? ' · done' : ''}`, badge: g.finished ? `<span class="badge ok">${icon('check')}Done</span>` : '', extra: g.rest ? '' : App.bar(g.finished ? 1 : g.total ? g.done / g.total : 0, 'lime') })}
        ${tile({ r: 'cma', ic: 'book', fill: 'f-dark', val: `${r1(cmToday / 60)}<small> h today</small>`, label: cw.target ? `${r1(cw.minutes / 60)} / ${r1(cw.target / 60)} h this week` : 'CMA study', extra: cw.target ? App.bar(cw.minutes / cw.target, 'mint') : '' })}
        ${tile({ r: 'work', ic: 'briefcase', fill: 'f-dark', val: `${r1(wd.hours)}<small> h</small>`, label: `${wd.done.length} work tasks done · ${wd.journal.length ? 'journal written' : 'no journal yet'}`, badge: wd.workday ? `<span class="badge sky">Workday</span>` : '' })}
        ${tile({ r: 'progress', ic: 'check', fill: 'f-lime', val: `${prodDone}<small> / ${prodDue || 0}</small>`, label: 'Productivity · tasks done today', extra: App.bar(prodDue ? prodDone / prodDue : 0, 'lime') })}
        ${tile({ r: 'money', ic: 'wallet', fill: 'f-dark', val: `<span class="${mm.net < 0 ? 'neg' : ''}">${inr(mm.net)}</span>`, label: `Month net · balance ${inr(bal)}`, extra: mm.budget ? App.bar(mm.spent / mm.budget, mm.spent > mm.budget ? 'red' : mm.spent > mm.budget * 0.8 ? 'amber' : 'lime') : '' })}
        ${tile({ r: 'dubai', ic: 'plane', fill: 'f-sky', val: dc.required ? `${Math.round(dc.progress * 100)}<small>%</small>` : inr(dc.saved), label: dc.required ? `${inr(dc.saved)} of ${inr(dc.required)} for Dubai` : 'Dubai savings · set estimates', extra: dc.required ? App.bar(dc.progress, 'sky') : '' })}
        ${tile({ r: 'social', ic: 'phone', fill: socBad ? 'f-red' : socWarn ? 'f-amber' : 'f-dark', val: fmtMin(socTot), label: socBad ? `${socBad} over maximum` : socWarn ? `${socWarn} past warning` : 'Social media today', badge: socBad ? `<span class="badge bad">Limit</span>` : '' })}
      </section>
      </div>
      </div>

      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('flag')}Today's priorities</h3><button class="link" data-act="addTodoQuick">${icon('plus')}Task</button></div>
        ${prios.length ? `<ul class="todo-list">${prios.slice(0, 5).map((x) => x.work ? App.workTaskItem(x) : App.todoItem(x)).join('')}</ul>` : `<p class="muted small">Nothing due today. Add a task or check tomorrow's plan below.</p>`}
      </section>

      <div class="desk-2">
      <section class="card reveal" style="--i:4">
        <div class="card-head"><h3>${icon('moon')}Tomorrow preview</h3><span class="muted small">${App.DOW_LONG[tom.getDay()]}</span></div>
        <div class="list">
          <div class="li"><span class="tile-ic sm f-dark">${icon('dumbbell')}</span><span class="grow"><b>${esc(tomDay.name)}</b><span class="sub">${tomDay.list.length ? `${tomDay.list.length} exercises` : 'Recovery day'}</span></span></div>
          <div class="li"><span class="tile-ic sm f-dark">${icon('briefcase')}</span><span class="grow"><b>${tomWork ? `Work ${App.fmtClock(p.workStart)} – ${App.fmtClock(p.workEnd)}` : 'No work scheduled'}</b><span class="sub">${tomTasks} task${tomTasks === 1 ? '' : 's'} due</span></span></div>
        </div>
        <button class="btn btn-soft btn-block mt12" data-act="go" data-r="review">${icon('spark')}Daily review & top 3 for tomorrow</button>
      </section>

      <section class="card reveal" style="--i:5">
        <div class="card-head"><h3>${icon('spark')}Coach note</h3></div>
        <p class="small">${esc(App.COACH_TIPS[new Date().getDate() % App.COACH_TIPS.length])}</p>
        ${notes.length ? `<button class="inline-alert ${notes[0].kind}" data-act="go" data-r="${notes[0].route}">${icon(notes[0].ic)}<span><b>${esc(notes[0].title)}</b><br>${esc(notes[0].text)}</span></button>` : ''}
      </section>
      </div>
      <div class="tabbar-space"></div>`;
  }

  let clockInt = null;
  function after() {
    clearInterval(clockInt);
    clockInt = setInterval(() => {
      const el = document.getElementById('liveClock');
      if (!el) return clearInterval(clockInt);
      el.textContent = clockText();
    }, 1000);
  }

  /* ---------- actions ---------- */
  App.actions.notifications = () => {
    const list = App.notifications();
    App.sheet({
      title: 'Notifications',
      body: list.length ? list.map((x, i) => `<button class="notif ${x.kind}" style="--i:${i}" data-act="go" data-r="${x.route}"><span class="tile-ic">${icon(x.ic)}</span><span class="grow"><b>${esc(x.title)}</b><span class="sub muted small block">${esc(x.text)}</span></span>${icon('right')}</button>`).join('')
        : App.empty('bell', 'All clear', 'No alerts right now. Alerts are calculated on this device from your own data.'),
    });
  };
  App.actions.pillar = (el) => {
    const ls = App.lifeScore();
    const p = ls.pillars.find((x) => x.id === el.dataset.id);
    if (!p) return;
    App.sheet({
      title: `${p.label} · ${p.score === null ? 'not scored' : p.score + '/100'}`,
      body: `<p class="muted small">Score = weighted average of the rules that apply today. Rules marked “not scored” are left out instead of counted as zero.</p>
        <div class="list mt12">${p.rules.map((r) => `<div class="li"><span class="grow"><b>${esc(r.label)}</b><span class="sub">${esc(r.detail)} · weight ${r.weight}</span></span>
          <span class="li-amt ${r.applicable ? '' : 'faint'}">${r.applicable ? Math.round(r.value * 100) + '%' : '—'}</span></div>`).join('')}</div>
        <button class="btn btn-primary btn-block mt16" data-act="go" data-r="${p.route}">Open ${esc(App.NAV.find((n) => n.r === p.route).label)} ${icon('right')}</button>`,
    });
  };
  App.actions.addWater = (el) => App.addWater(+(el && el.dataset.ml) || 250);
  App.addWater = (ml) => {
    const t = dkey();
    const b = App.state.body;
    const goal = App.T().waterMl;
    const before = b.waterMl[t] || 0;
    b.waterMl[t] = Math.max(0, before + ml);
    App.buzz();
    if (before < goal && b.waterMl[t] >= goal) App.unlock('water-' + t, 'Hydration goal reached', `${r1(goal / 1000)} L today`, 'drop') || App.toast('Water goal reached');
    else App.toast(`${ml > 0 ? '+' : ''}${ml} ml · ${r1(b.waterMl[t] / 1000)} L today`);
    App.commit();
  };
  App.waterSheet = () => {
    const t = dkey();
    const cur = App.waterMl(t);
    App.sheet({
      title: 'Add water',
      body: `<p class="muted small">Today: <b>${r1(cur / 1000)} L</b> of ${r1(App.T().waterMl / 1000)} L</p>
        <div class="preset-row mt12">${[150, 250, 500, 750, 1000].map((v) => `<button type="button" class="pchip" data-act="preset" data-f="ml" data-v="${v}">${v} ml</button>`).join('')}</div>
        ${App.field('Amount (ml)', App.input('ml', { type: 'number', value: 250, min: -5000, max: 5000, step: 50, required: true, inputmode: 'numeric' }), 'Use a negative number to correct a mistake.')}`,
      submit: 'Add water',
      onSubmit: (d) => { const v = Math.round(+d.ml || 0); if (!v) return false; App.addWater(v); },
    });
  };
  App.actions.quickWeight = () => {
    const last = App.currentWeight();
    App.sheet({
      title: 'Log body weight',
      body: App.field('Weight (kg)', App.input('kg', { type: 'number', value: last || '', min: 25, max: 250, step: 0.1, required: true, inputmode: 'decimal' }), 'Weigh in the morning, after the toilet, before eating. LifeOS uses weekly averages.')
        + App.field('Date', App.input('date', { type: 'date', value: dkey(), max: dkey(), required: true })),
      submit: 'Save weight',
      onSubmit: (d) => {
        const kg = Math.round(+d.kg * 10) / 10;
        if (!(kg >= 25 && kg <= 250)) { App.toast('Enter a weight between 25 and 250 kg', 'bad'); return false; }
        const before = App.currentWeight();
        App.logWeight(kg, d.date || dkey());
        App.state.profile.weight = App.currentWeight();
        const targets = (App.state.profile.targets || []).map(Number).filter(Boolean);
        const hit = targets.find((x) => before < x && kg >= x);
        if (hit) App.unlock('weight-' + hit, `${hit} kg reached`, 'A body-weight milestone on your plan', 'scale');
        else App.toast(`Logged ${kg} kg`);
        App.commit();
      },
    });
  };
  App.logWeight = (kg, date = dkey()) => {
    const w = App.state.body.weights;
    const ex = w.find((x) => x.date === date);
    if (ex) ex.kg = kg; else w.push({ date, kg });
    w.sort((a, b) => a.date.localeCompare(b.date));
  };
  App.actions.gymToday = () => { App.ui.gymDay = null; App.go('fitness', 'today'); };
  App.actions.addTodoQuick = () => App.todoSheet(null);
  App.actions.preset = (el) => {
    const inp = document.querySelector(`#sheetForm [name="${el.dataset.f}"]`);
    if (inp) { inp.value = el.dataset.v; inp.classList.add('flash'); setTimeout(() => inp.classList.remove('flash'), 400); inp.dispatchEvent(new Event('input', { bubbles: true })); }
  };

  App.views.home = { render, after };
})();
