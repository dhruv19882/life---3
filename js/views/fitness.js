'use strict';
/* Personal gym coach: today's workout with set logging, rest timer, PRs and progressive overload;
   editable weekly split; stats (volume, muscle groups, history); body weight with weekly averages. */
(function () {
  const { icon, esc, dkey, DOW, lastNDays, parseD, prettyDate, r1, sum, weekStart } = App;
  App.ui.openEx = {};
  App.ui.fitnessTab = 'today';

  const logKey = (date, day) => `${date}|${day}`;
  const rangeTop = (reps) => parseInt(String(reps).split('-').pop(), 10) || 0;
  const rangeLow = (reps) => parseInt(String(reps).split('-')[0], 10) || 0;
  const G = () => App.state.gym;

  function lastPerformance(exId, excludeKey) {
    const keys = Object.keys(G().logs).filter((k) => k !== excludeKey).sort().reverse();
    for (const k of keys) {
      const sets = (G().logs[k].sets || {})[exId];
      if (sets && sets.some((s) => s && s.done)) return { date: k.split('|')[0], sets: sets.filter((s) => s && s.done) };
    }
    return null;
  }
  /** Progressive overload: only suggests more weight when every prescribed set reached the top of the rep range. */
  function suggestion(e, def, last) {
    if (!last) return { cls: 'hold', text: def.timed ? 'First session: hold with good form and log the seconds.' : 'First session: pick a weight you can lift for the top of the rep range with 1–2 reps in reserve.' };
    const top = rangeTop(e.reps), low = rangeLow(e.reps);
    const ws = last.sets.map((s) => +s.w || 0);
    const w = Math.max(...ws);
    const sameW = ws.every((x) => x === w);
    const allTop = last.sets.length >= e.sets && last.sets.every((s) => +s.r >= top) && sameW;
    const anyLow = last.sets.some((s) => +s.r < low);
    if (def.timed) return allTop ? { cls: '', text: `You held ${top}s on every set. Add 5–10 seconds per set.` } : { cls: 'hold', text: 'Match or beat last session’s hold times.' };
    if (allTop && w > 0) return { cls: '', text: `Last time: ${last.sets.length} sets × ${top}+ reps at ${w} kg. Performance supports <b>${w + (def.kind === 'lower' ? 5 : 2.5)} kg</b> today.` };
    if (allTop && def.bodyweight) return { cls: '', text: 'Every set hit the top of the range. Add a slower lowering phase or a little weight.' };
    if (anyLow) return { cls: 'hold', text: `Stay at <b>${w || 'the same'}${w ? ' kg' : ''}</b>. Some sets were below ${low} reps last time; build reps first.` };
    return { cls: 'hold', text: `Stay at <b>${w || 'the same'}${w ? ' kg' : ' weight'}</b> and aim for one more rep than last time.` };
  }

  function render() {
    const tab = App.ui.fitnessTab;
    const body = { today: renderToday, plan: renderPlan, stats: renderStats, body: renderBody }[tab] || renderToday;
    return `${App.header('Fitness', 'Gym coach · body', `<button class="icon-btn lg" data-act="quickWeight" aria-label="Log weight">${icon('scale')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('fitnessTab', [{ value: 'today', label: 'Workout' }, { value: 'plan', label: 'Split' }, { value: 'stats', label: 'Stats' }, { value: 'body', label: 'Body' }], tab)}</div>
      <div class="stack mt12">${body()}</div>
      <div class="tabbar-space"></div>`;
  }

  function dayPicker(sel) {
    const today = new Date().getDay();
    const split = App.split();
    const week = App.weekDays(weekStart());
    return `<div class="day-pick reveal" style="--i:1">${[1, 2, 3, 4, 5, 6, 0].map((i, idx) => {
      const k = split[i];
      const date = week[idx];
      const done = Object.entries(G().logs).some(([kk, l]) => kk.startsWith(date + '|') && l.finished);
      return `<button class="dp ${k === sel ? 'on' : ''} ${i === today ? 'today' : ''} ${done ? 'done' : ''}" data-act="pickDay" data-d="${k}">
        <small>${DOW[i]}</small><b>${esc(App.dayDef(k).short || k)}</b></button>`;
    }).join('')}</div>`;
  }

  function renderToday() {
    const dayK = App.ui.gymDay || App.dayKeyFor();
    const day = App.dayDef(dayK);
    const key = logKey(dkey(), dayK);
    const log = G().logs[key] || { sets: {} };
    const totalSets = sum(day.list, (e) => e.sets);
    const doneSets = sum(day.list, (e) => (log.sets[e.id] || []).filter((s) => s && s.done).length);
    const exDone = day.list.filter((e) => (log.sets[e.id] || []).filter((s) => s && s.done).length >= e.sets).length;
    const vol = sum(Object.values(log.sets).flat().filter((s) => s && s.done), App.setVolume);
    const prevKey = Object.keys(G().logs).filter((k) => k.endsWith('|' + dayK) && k !== key && G().logs[k].finished).sort().pop();
    const prevVol = prevKey ? sum(Object.values(G().logs[prevKey].sets).flat().filter((s) => s && s.done), App.setVolume) : 0;
    const mins = Math.round(sum(day.list, (e) => e.sets * (e.rest + 40)) / 60);

    if (dayK === 'rest') {
      return `${dayPicker(dayK)}
        <section class="card day-hero hero reveal" style="--i:2"><span class="eyebrow">${App.dayKeyFor() === 'rest' ? 'Today' : 'Selected'}</span><h2>${esc(day.name)}</h2><p class="muted">${esc(day.focus)}</p></section>
        <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('moon')}Recovery checklist</h3></div>
        <div class="list">${App.REST_DAY.map((r) => `<div class="li"><span class="tile-ic sm f-mint">${icon('check')}</span><span class="grow"><b>${esc(r.t)}</b><span class="sub">${esc(r.d)}</span></span></div>`).join('')}</div></section>
        <p class="section-note reveal" style="--i:4">${icon('info')}<span>Want to train anyway? Pick another day above.</span></p>`;
    }

    const prs = App.personalRecords();
    const exCard = (e, i) => {
      const def = App.exDef(e.id);
      const sets = log.sets[e.id] || [];
      const last = lastPerformance(e.id, key);
      const done = sets.filter((s) => s && s.done).length;
      const open = App.ui.openEx[e.id];
      const sug = suggestion(e, def, last);
      const prefill = (si) => { const own = sets[si] && (sets[si].w !== undefined || sets[si].r !== undefined) ? sets[si] : null; const prev = si > 0 && sets[si - 1] && sets[si - 1].done ? sets[si - 1] : null; return own || (last && last.sets[Math.min(si, last.sets.length - 1)]) || prev || {}; };
      const pr = prs[e.id];
      const tempo = def.tempo ? def.tempo.reduce((a, b) => a + b, 0) || 3 : 4;
      return `<article class="card ex-card ${done >= e.sets ? 'complete' : ''} ${open ? 'open' : ''} reveal" style="--i:${i + 3}">
        <button class="ex-head" data-act="toggleEx" data-id="${e.id}">
          <span class="ex-num">${done >= e.sets ? icon('check') : i + 1}</span>
          <span class="grow ta-l"><b>${esc(def.name)}</b><small class="muted block">${e.sets} × ${e.reps}${def.timed ? ' sec' : ' reps'} · rest ${e.rest}s${pr && pr.maxW ? ` · PR ${pr.maxW} kg × ${pr.maxWReps}` : ''}</small></span>
          <span class="ex-prog">${done}/${e.sets}</span><span class="chev">${icon('down')}</span>
        </button>
        <div class="ex-body"><div class="ex-inner">
          <div class="demo"><div class="tempo" style="--t:${tempo}s" aria-hidden="true"><i></i></div><div class="small"><b>Tempo guide</b><span class="muted block">${def.tempo ? `${def.tempo[0]}s down · ${def.tempo[1]}s pause · ${def.tempo[2]}s up` : 'Controlled reps'}</span></div></div>
          <p class="ex-muscle">${icon('target')}${esc(def.muscle)}</p>
          <ol class="ex-steps">${(def.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          ${def.tip ? `<div class="ex-tips"><p><b>Tip:</b> ${esc(def.tip)}</p><p><b>Avoid:</b> ${esc(def.mistake)}</p></div>` : ''}
          <div class="coach-say ${sug.cls}">${icon(sug.cls ? 'info' : 'up')}<span>${sug.text}${last ? `<small class="muted block mt4">Last (${prettyDate(last.date)}): ${last.sets.map((s) => (def.timed ? `${s.r}s` : `${s.w || 0}×${s.r}`)).join(', ')}</small>` : ''}</span></div>
          <div class="set-grid">
            <span class="sg-h">Set</span><span class="sg-h">${def.timed ? '—' : 'kg'}</span><span class="sg-h">${def.timed ? 'sec' : 'reps'}</span><span class="sg-h"></span>
            ${Array.from({ length: e.sets }, (_, si) => {
              const s = sets[si] || {};
              const p = prefill(si);
              return `<span class="sg-n">${si + 1}</span>
                ${def.timed ? '<span class="muted ta-c">—</span>' : `<input class="inp sm ta-c" type="number" inputmode="decimal" step="0.5" placeholder="${p.w ?? ''}" value="${s.w ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="w" aria-label="Set ${si + 1} weight">`}
                <input class="inp sm ta-c" type="number" inputmode="numeric" min="0" placeholder="${p.r ?? rangeLow(e.reps)}" value="${s.r ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="r" aria-label="Set ${si + 1} reps">
                <button class="check ${s.done ? 'on' : ''}" data-act="doneSet" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-rest="${e.rest}" aria-label="Set ${si + 1} done">${icon('check')}</button>`;
            }).join('')}
          </div>
          <button class="btn btn-ghost sm mt12" data-act="startRest" data-rest="${e.rest}">${icon('timer')}Start ${e.rest}s rest</button>
        </div></div>
      </article>`;
    };

    return `${dayPicker(dayK)}
      <section class="card day-hero hero reveal" style="--i:2">
        <div class="row between"><div class="grow"><span class="eyebrow">${dayK === App.dayKeyFor() ? "Today's workout" : 'Selected workout'}</span><h2>${esc(day.name)}</h2><p class="muted small">${esc(day.focus)} · ~${mins} min</p></div>
        ${App.rings([{ pct: totalSets ? doneSets / totalSets : 0, grad: 'lime' }, { pct: prevVol ? vol / prevVol : vol ? 1 : 0, grad: 'sky' }, { pct: day.list.length ? exDone / day.list.length : 0, grad: 'mint' }], { size: 104, stroke: 9, gap: 3, center: `<b class="small">${doneSets}/${totalSets}</b>` })}</div>
        <div class="stat-row">${App.stat('Sets', `${doneSets}/${totalSets}`)}${App.stat('Volume', `${App.num(vol)} kg`, prevVol ? `last ${App.num(prevVol)}` : 'first time')}${App.stat('Exercises', `${exDone}/${day.list.length}`)}</div>
        <details class="mt12"><summary class="small muted" style="cursor:pointer">${icon('flame')} Warm-up (5–8 min)</summary><ul class="small mt8" style="padding-left:18px">${App.WARMUP.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>
      </section>
      ${day.list.map(exCard).join('')}
      ${log.finished
        ? `<div class="card reveal row gap"><span class="tile-ic f-lime">${icon('trophy')}</span><div><b>Workout complete</b><small class="muted block">Eat a protein-rich meal within the next couple of hours.</small></div></div>`
        : `<button class="btn btn-primary btn-block btn-lg reveal" data-act="finishWorkout" data-key="${key}" data-day="${dayK}">${icon('trophy')}Finish workout</button>`}`;
  }

  /* ---------- split / plan ---------- */
  function renderPlan() {
    const tk = App.dayKeyFor();
    const split = App.split();
    const templates = Object.entries(App.DAYS).filter(([, d]) => !d.legacy);
    return `
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('cal')}Weekly split</h3><button class="link" data-act="editSplit">Edit ${icon('edit')}</button></div>
        <div class="list">${[1, 2, 3, 4, 5, 6, 0].map((i) => {
          const k = split[i]; const d = App.dayDef(k);
          return `<button class="li" data-act="openDay" data-d="${k}"><span class="tile-ic sm ${k === 'rest' ? 'f-dark' : 'f-' + d.color}">${icon(k === 'rest' ? 'moon' : 'dumbbell')}</span>
            <span class="grow"><b>${App.DOW_LONG[i]}${k === tk && i === new Date().getDay() ? ' · Today' : ''}</b><span class="sub">${esc(d.name)}${d.list.length ? ` · ${d.list.length} exercises` : ''}</span></span>${icon('right')}</button>`;
        }).join('')}</div></section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('layers')}Workout templates</h3></div>
        <div class="list">${templates.filter(([k]) => k !== 'rest').map(([k]) => { const d = App.dayDef(k); return `<button class="li" data-act="editDay" data-d="${k}"><span class="grow"><b>${esc(d.name)}</b><span class="sub">${d.list.map((e) => esc(App.exDef(e.id).name)).join(', ')}</span></span>${icon('edit')}</button>`; }).join('')}</div></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('book')}Exercise library</h3><span class="muted small">${Object.keys(App.EX).length} exercises</span></div>
        ${Object.entries(App.GROUPS).map(([g, label]) => `<h4 class="group-title">${label}</h4><div class="list">${Object.entries(App.EX).filter(([, e]) => e.group === g).map(([id, e]) => `<button class="li" data-act="exInfo" data-id="${id}"><span class="grow"><b>${esc(e.name)}</b><span class="sub">${esc(e.muscle)}</span></span>${icon('right')}</button>`).join('')}</div>`).join('')}
      </section>
      <section class="card reveal"><div class="card-head"><h3>${icon('up')}How progression works</h3></div>
        <ul class="small" style="padding-left:18px;display:grid;gap:6px">
          <li>Use a weight where the last 1–2 reps are hard but form stays clean.</li>
          <li>LifeOS suggests more weight only after every prescribed set reached the top of the rep range at the same weight.</li>
          <li>Otherwise it tells you to stay and add reps. It never raises weight on a guess.</li>
          <li>Every 8 weeks, take a lighter week (same exercises, half the sets).</li>
        </ul></section>`;
  }
  App.actions.exInfo = (el) => {
    const e = App.exDef(el.dataset.id);
    const pr = App.personalRecords()[el.dataset.id];
    App.sheet({ title: e.name, body: `<p class="ex-muscle">${icon('target')}${esc(e.muscle)}</p>
      <div class="demo"><div class="tempo" style="--t:${e.tempo ? e.tempo.reduce((a, b) => a + b, 0) || 3 : 4}s"><i></i></div><div class="small"><b>Tempo</b><span class="muted block">${e.tempo ? `${e.tempo[0]}s down · ${e.tempo[1]}s pause · ${e.tempo[2]}s up` : 'Controlled'}</span></div></div>
      <ol class="ex-steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="ex-tips"><p><b>Tip:</b> ${esc(e.tip)}</p><p><b>Avoid:</b> ${esc(e.mistake)}</p></div>
      ${pr ? `<dl class="kv mt12"><dt>Heaviest</dt><dd>${pr.maxW} kg × ${pr.maxWReps}</dd><dt>Best estimated 1RM</dt><dd>${pr.best1rm} kg</dd><dt>Date</dt><dd>${prettyDate(pr.date)}</dd></dl>` : '<p class="muted small mt12">No sets logged yet.</p>'}` });
  };
  App.actions.editSplit = () => {
    const split = App.split();
    const opts = Object.entries(App.DAYS).filter(([, d]) => !d.legacy).map(([k]) => ({ value: k, label: App.dayDef(k).name }));
    App.sheet({
      title: 'Weekly split',
      body: [1, 2, 3, 4, 5, 6, 0].map((i) => App.field(App.DOW_LONG[i], App.select('d' + i, opts, split[i]))).join('') + `<button type="button" class="btn btn-ghost btn-block" data-act="resetSplit">${icon('refresh')}Reset to default split</button>`,
      onSubmit: (d) => { G().split = [0, 1, 2, 3, 4, 5, 6].map((i) => (App.DAYS[d['d' + i]] ? d['d' + i] : 'rest')); App.toast('Split saved'); App.commit(); },
    });
  };
  App.actions.resetSplit = () => { G().split = null; App.closeSheet(); App.commit(); };
  App.actions.editDay = (el) => { App.ui.dayEdit = { key: el.dataset.d, list: JSON.parse(JSON.stringify(App.dayDef(el.dataset.d).list)) }; drawDayEdit(); };
  function drawDayEdit() {
    const { key, list } = App.ui.dayEdit;
    App.sheet({
      title: `Edit ${App.DAYS[key].name}`,
      body: `${list.map((e, i) => `<div class="card flat tight mb12"><div class="row between"><b class="small">${esc(App.exDef(e.id).name)}</b><button type="button" class="icon-btn sm" data-act="dayExDel" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>
          <div class="grid3 mt8">${App.field('Sets', App.input('s' + i, { type: 'number', value: e.sets, min: 1, max: 10, required: true }))}${App.field('Reps', App.input('r' + i, { value: e.reps, required: true, placeholder: '8-10' }))}${App.field('Rest (s)', App.input('t' + i, { type: 'number', value: e.rest, min: 15, max: 600, required: true }))}</div></div>`).join('')}
        <div class="qty-row"><select class="inp" id="dayExAdd" style="flex:1;width:auto">${Object.entries(App.EX).map(([id, x]) => `<option value="${id}">${esc(x.name)}</option>`).join('')}</select><button type="button" class="btn btn-soft sm" data-act="dayExAdd">${icon('plus')}Add</button></div>
        <button type="button" class="btn btn-ghost btn-block mt12" data-act="dayReset">${icon('refresh')}Reset this workout</button>`,
      onSubmit: (d) => {
        const out = list.map((e, i) => ({ id: e.id, sets: Math.max(1, Math.min(10, +d['s' + i] || e.sets)), reps: String(d['r' + i] || e.reps).replace(/[^0-9-]/g, '') || e.reps, rest: Math.max(15, +d['t' + i] || e.rest) }));
        G().days[key] = { list: out };
        App.toast('Workout updated');
        App.commit();
      },
    });
  }
  const syncDayEdit = () => { const d = App.sheetData(); App.ui.dayEdit.list.forEach((e, i) => { if (d['s' + i]) e.sets = +d['s' + i]; if (d['r' + i]) e.reps = d['r' + i]; if (d['t' + i]) e.rest = +d['t' + i]; }); };
  App.actions.dayExDel = (el) => { syncDayEdit(); App.ui.dayEdit.list.splice(+el.dataset.i, 1); drawDayEdit(); };
  App.actions.dayExAdd = () => { syncDayEdit(); App.ui.dayEdit.list.push({ id: document.getElementById('dayExAdd').value, sets: 3, reps: '8-12', rest: 90 }); drawDayEdit(); };
  App.actions.dayReset = () => { delete G().days[App.ui.dayEdit.key]; App.closeSheet(); App.toast('Workout reset to default'); App.commit(); };

  /* ---------- stats ---------- */
  function renderStats() {
    const all = App.allDoneSets();
    const prs = App.personalRecords();
    const weeks = Array.from({ length: 8 }, (_, i) => weekStart(App.addDays(new Date(), -7 * (7 - i))));
    const volBy = {};
    for (const s of all) { const w = weekStart(s.date); volBy[w] = (volBy[w] || 0) + s.w * s.r; }
    const last7 = lastNDays(7);
    const groupSets = {};
    for (const s of all.filter((x) => last7.includes(x.date))) { const g = App.exDef(s.ex).group || 'abs'; groupSets[g] = (groupSets[g] || 0) + 1; }
    const maxG = Math.max(20, ...Object.values(groupSets));
    const finished = Object.entries(G().logs).filter(([, l]) => l.finished).sort((a, b) => b[0].localeCompare(a[0]));
    const prList = Object.entries(prs).filter(([, p]) => p.maxW > 0).sort((a, b) => b[1].best1rm - a[1].best1rm);
    return `
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('chart')}Weekly volume</h3><span class="muted small">kg × reps</span></div>
        ${App.barChart(weeks.map((w) => ({ label: `${parseD(w).getDate()}/${parseD(w).getMonth() + 1}`, value: Math.round(volBy[w] || 0), cls: w === weekStart() ? 'grad-lime' : 'grad-sky', title: w })), { height: 130, fmt: (v) => (v >= 1000 ? r1(v / 1000) + 'k' : v) })}</section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('target')}Sets per muscle group</h3><span class="muted small">last 7 days</span></div>
        <div class="muscle-bars">${Object.entries(App.GROUPS).map(([g, label]) => `<div class="muscle-bar"><span>${label}</span>${App.bar((groupSets[g] || 0) / maxG, (groupSets[g] || 0) >= 10 ? 'lime' : 'sky')}<b class="ta-r">${groupSets[g] || 0}</b></div>`).join('')}</div>
        <p class="field-hint">A common guideline for muscle growth is roughly 10–20 hard sets per muscle per week.</p></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('medal')}Personal records</h3><span class="muted small">${prList.length}</span></div>
        ${prList.length ? prList.map(([id, p]) => `<div class="pr-row"><span class="grow"><b class="small">${esc(App.exDef(id).name)}</b><small class="muted block">${prettyDate(p.date)} · est. 1RM ${p.best1rm} kg</small></span><b>${p.maxW} kg × ${p.maxWReps}</b></div>`).join('') : '<p class="muted small">Complete sets with weight to see PRs.</p>'}</section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('trophy')}Workout history</h3><span class="muted small">${finished.length} finished</span></div>
        ${finished.length ? finished.slice(0, 15).map(([k, l]) => {
          const [date, day] = k.split('|');
          const sets = Object.values(l.sets).flat().filter((s) => s && s.done);
          return `<div class="pr-row"><span class="grow"><b class="small">${esc((App.DAYS[day] || { name: day }).name)}</b><small class="muted block">${prettyDate(date)} · ${sets.length} sets</small></span><b>${App.num(sum(sets, App.setVolume))} kg</b></div>`;
        }).join('') : '<p class="muted small">Finish your first workout to see it here.</p>'}</section>`;
  }

  /* ---------- body ---------- */
  function renderBody() {
    const b = App.state.body;
    const p = App.state.profile;
    const w = b.weights;
    const cur = App.currentWeight();
    const start = w.length ? w[0].kg : p.weight;
    const diff = r1(cur - start);
    const ww = App.weeklyWeights();
    const rate = App.weightRate();
    const targets = (p.targets || []).map(Number).filter(Boolean);
    const next = targets.find((t) => t > cur);
    const eta = rate && rate.perWeek > 0 && next ? Math.ceil((next - (ww.length ? ww[ww.length - 1].avg : cur)) / rate.perWeek) : null;
    const bmi = p.height ? cur / Math.pow(p.height / 100, 2) : 0;
    const today = dkey();
    const steps = b.steps[today] || 0;
    const stepsChart = lastNDays(7).map((d) => ({ label: DOW[parseD(d).getDay()][0], value: b.steps[d] || 0, cls: (b.steps[d] || 0) >= b.stepGoal ? 'grad-lime' : 'grad-sky' }));
    let msg = null;
    if (rate) {
      if (p.mode !== 'bulk') msg = { cls: 'info', t: `Trend: ${rate.perWeek >= 0 ? '+' : ''}${rate.perWeek} kg/week over ${r1(rate.weeks)} weeks of weekly averages.` };
      else if (rate.perWeek < 0.15) msg = { cls: 'warn', t: `Weekly averages show ${rate.perWeek >= 0 ? '+' : ''}${rate.perWeek} kg/week. Below the 0.25–0.5 kg target; consider ~200 kcal more per day.` };
      else if (rate.perWeek > 0.75) msg = { cls: 'warn', t: `Weekly averages show +${rate.perWeek} kg/week, faster than needed. Consider ~150 kcal less per day.` };
      else msg = { cls: 'ok', t: `Good pace: +${rate.perWeek} kg/week (weekly averages).` };
    }
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between top"><div><span class="eyebrow">Body weight</span><div class="huge mt4">${App.count(cur, { dec: 1 })} <small class="muted" style="font-size:16px">kg</small></div>
          <small class="${diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'muted'}">${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : ''}${diff} kg since ${w.length ? prettyDate(w[0].date, { absolute: true }) : 'start'}</small></div>
          <button class="btn btn-primary sm" data-act="quickWeight">${icon('plus')}Log</button></div>
        <div class="mt12">${App.lineChart(ww.slice(-16).map((x) => ({ v: x.avg, label: `Week of ${x.week} (${x.n} entries)` })), { fmt: (v) => r1(v), target: next })}</div>
        <p class="muted tiny">Weekly averages (Mon–Sun)${next ? ` · dashed line: ${next} kg target` : ''}</p>
        ${msg ? `<div class="inline-alert ${msg.cls}">${icon(msg.cls === 'ok' ? 'up' : 'info')}<span>${msg.t}</span></div>` : ''}
        <div class="stat-row">${App.stat('BMI', bmi ? r1(bmi) : '—')}${App.stat('Next target', next ? `${next} kg` : '—', next ? `${r1(next - cur)} kg to go` : '')}${App.stat('ETA', eta ? `~${eta} wk` : '—', eta ? 'at current pace' : 'needs 2+ weeks')}</div>
      </section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('list')}Weight log</h3><span class="muted small">${App.plural(w.length, 'entry', 'entries')}</span></div>
        ${w.length ? `<div class="list">${w.slice(-8).reverse().map((x) => `<div class="li"><span class="grow">${prettyDate(x.date)}</span><b class="li-amt">${x.kg} kg</b><button class="icon-btn sm" data-act="delWeight" data-date="${x.date}" aria-label="Delete">${icon('trash')}</button></div>`).join('')}</div>` : '<p class="muted small">No entries yet.</p>'}</section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('steps')}Steps</h3><button class="link" data-act="logSteps">${App.num(steps)} today ${icon('edit')}</button></div>
        ${App.barChart(stepsChart, { height: 110, lines: [{ v: b.stepGoal, cls: 'ok', label: 'Goal' }], fmt: (v) => (v >= 1000 ? r1(v / 1000) + 'k' : v) })}
        <p class="field-hint">Entered manually from your phone's health app. LifeOS does not read sensors.</p></section>`;
  }

  /* ---------- actions ---------- */
  App.actions.fitnessTab = (el) => { App.ui.fitnessTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.pickDay = (el) => { App.ui.gymDay = el.dataset.d; App.render({ quiet: true }); };
  App.actions.openDay = (el) => { App.ui.gymDay = el.dataset.d; App.ui.fitnessTab = 'today'; App.render({ quiet: true }); window.scrollTo({ top: 0, behavior: App.reduced() ? 'auto' : 'smooth' }); };
  App.actions.toggleEx = (el) => {
    const id = el.dataset.id;
    App.ui.openEx[id] = !App.ui.openEx[id];
    el.closest('.ex-card').classList.toggle('open', App.ui.openEx[id]);
  };
  function setSlot(key, ex, i) {
    const logs = G().logs;
    const day = key.split('|')[1];
    logs[key] = logs[key] || { day, sets: {}, finished: false };
    const def = App.dayDef(day).list.find((e) => e.id === ex);
    const arr = (logs[key].sets[ex] = logs[key].sets[ex] || []);
    while (arr.length < (def ? def.sets : i + 1)) arr.push({});
    for (let k = 0; k < arr.length; k++) if (!arr[k]) arr[k] = {};
    return arr[i];
  }
  App.changes.setVal = (el) => {
    const s = setSlot(el.dataset.key, el.dataset.ex, +el.dataset.i);
    s[el.dataset.f] = el.value === '' ? undefined : Math.max(el.dataset.f === 'w' ? -200 : 0, +el.value);
    App.save();
  };
  App.actions.doneSet = (el) => {
    const { key, ex } = el.dataset;
    const i = +el.dataset.i;
    const prsBefore = App.personalRecords();
    const s = setSlot(key, ex, i);
    const row = el.closest('.set-grid');
    ['w', 'r'].forEach((f) => {
      const inp = row.querySelector(`[data-ex="${ex}"][data-i="${i}"][data-f="${f}"]`);
      if (!inp) return;
      const v = inp.value !== '' ? inp.value : inp.placeholder;
      if (v !== '') s[f] = +v;
    });
    if (!s.done && !(+s.r > 0)) { App.toast('Enter reps (or seconds) first', 'warn'); return; }
    s.done = !s.done;
    App.buzz(s.done ? [18, 30, 18] : 8);
    App.save();
    if (s.done) {
      const def = App.dayDef(key.split('|')[1]).list.find((e) => e.id === ex);
      const exd = App.exDef(ex);
      const doneN = G().logs[key].sets[ex].filter((x) => x && x.done).length;
      App.plateFx(exd.timed ? `Set ${i + 1} · ${s.r}s` : `Set ${i + 1} · ${s.w || 0} kg × ${s.r}`);
      const prev = prsBefore[ex];
      const e1 = App.e1rm(+s.w || 0, +s.r || 0);
      if (prev && prev.best1rm > 0 && e1 > prev.best1rm + 0.01) App.unlock(`pr-${ex}-${s.w}x${s.r}`, `New PR: ${exd.name}`, `${s.w} kg × ${s.r} (est. 1RM ${r1(e1)} kg)`, 'medal');
      else if (def && doneN >= def.sets) App.toast(`${exd.name} complete`);
      App.startRest(+el.dataset.rest, exd.name);
    }
    App.render({ quiet: true });
  };
  App.actions.startRest = (el) => App.startRest(+el.dataset.rest);
  App.actions.finishWorkout = (el) => {
    const key = el.dataset.key;
    const logs = G().logs;
    logs[key] = logs[key] || { day: el.dataset.day, sets: {}, finished: false };
    const sets = Object.values(logs[key].sets).flat().filter((s) => s && s.done);
    if (!sets.length && !App.confirm('No sets ticked yet. Mark the workout finished anyway?')) return;
    logs[key].finished = true;
    logs[key].finishedAt = new Date().toISOString();
    App.actions.restStop();
    App.save();
    const n = Object.values(logs).filter((l) => l.finished).length;
    const milestone = [1, 10, 25, 50, 100].includes(n);
    if (milestone) App.unlock('workouts-' + n, n === 1 ? 'First workout complete' : `${n} workouts complete`, `${sets.length} sets · ${App.num(sum(sets, App.setVolume))} kg volume`, 'trophy');
    else App.celebrate({ title: 'Workout complete', sub: `${sets.length} sets · ${App.num(sum(sets, App.setVolume))} kg volume`, ic: 'dumbbell', label: App.dayDef(el.dataset.day).name });
    App.render({ quiet: true });
  };
  App.actions.delWeight = (el) => {
    if (!App.confirm('Delete this weight entry?')) return;
    App.state.body.weights = App.state.body.weights.filter((x) => x.date !== el.dataset.date);
    App.state.profile.weight = App.currentWeight();
    App.commit();
  };
  App.actions.logSteps = () => {
    const t = dkey();
    App.sheet({
      title: 'Steps today',
      body: App.field('Steps', App.input('steps', { type: 'number', value: App.state.body.steps[t] || '', min: 0, max: 100000, required: true, inputmode: 'numeric' }), "Copy the number from your phone's health app.")
        + App.field('Daily step goal', App.input('goal', { type: 'number', value: App.state.body.stepGoal, min: 1000, max: 50000, inputmode: 'numeric' })),
      onSubmit: (d) => {
        App.state.body.steps[t] = Math.max(0, Math.round(+d.steps || 0));
        if (+d.goal) App.state.body.stepGoal = Math.round(+d.goal);
        App.toast('Steps saved');
        App.commit();
      },
    });
  };

  App.views.fitness = { render };
})();
