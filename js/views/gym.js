'use strict';
/* Gym coach: daily workout with set logging + rest timer, Indian budget bulk diet, weekly plan, body/fitness tracker. */
(function () {
  const { icon, esc, dkey, DOW, inr, lastNDays, parseD, prettyDate } = App;
  App.ui.openEx = {};

  const todayKey = () => App.WEEK[new Date().getDay()];
  const logKey = (date, day) => `${date}|${day}`;
  const rangeTop = (reps) => parseInt(String(reps).split('-').pop(), 10) || 0;
  const rangeLow = (reps) => parseInt(String(reps).split('-')[0], 10) || 0;

  App.gymDoneToday = () => Object.entries(App.state.gym.logs).some(([k, l]) => k.startsWith(dkey() + '|') && l.finished);

  function lastPerformance(exId, excludeKey) {
    const keys = Object.keys(App.state.gym.logs).filter((k) => k !== excludeKey).sort().reverse();
    for (const k of keys) {
      const sets = (App.state.gym.logs[k].sets || {})[exId];
      if (sets && sets.some((s) => s.done)) return { date: k.split('|')[0], sets: sets.filter((s) => s.done) };
    }
    return null;
  }

  function suggestion(e, def, last) {
    if (!last) return def.timed ? 'Start with a hold you can do with good form.' : 'First time: pick a weight you can lift for the top of the rep range with 2 reps left in the tank.';
    const top = rangeTop(e.reps);
    const allTop = last.sets.length >= e.sets && last.sets.every((s) => +s.r >= top);
    const w = Math.max(...last.sets.map((s) => +s.w || 0));
    if (def.timed) return allTop ? `Great! Add 10 seconds per set today.` : 'Same hold time as last session, try to beat it.';
    if (allTop && w > 0) return `You hit ${top} reps on every set. Go up to <b>${w + (def.kind === 'lower' ? 5 : 2.5)} kg</b> today.`;
    if (allTop) return 'You hit the top of the range on all sets. Add weight or slow the reps down.';
    return `Stay at <b>${w || '—'} kg</b> and aim for 1 more rep than last time.`;
  }

  /* ---------- food ---------- */
  App.foodToday = (date = dkey()) => {
    const t = App.targets(App.state.profile);
    const plan = App.dietPlan(t);
    const f = App.state.food[date] || { meals: {}, extra: [] };
    const tot = { kcal: 0, p: 0 };
    plan.meals.forEach((m) => { if (f.meals[m.id]) { tot.kcal += m.kcal; tot.p += m.p; } });
    (f.extra || []).forEach((x) => { tot.kcal += x.kcal; tot.p += x.p; });
    return { kcal: Math.round(tot.kcal), p: Math.round(tot.p), plan, log: f };
  };

  /* ---------- tabs ---------- */
  function render() {
    const tab = App.ui.gymTab;
    const body = { today: renderToday, diet: renderDiet, week: renderWeek, body: renderBody }[tab] || renderToday;
    return `
      ${App.header('Coach', 'Gym · Diet · Body', `<button class="icon-btn lg" data-act="settings" aria-label="Profile">${icon('user')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('gymTab', [{ value: 'today', label: 'Workout' }, { value: 'diet', label: 'Diet' }, { value: 'week', label: 'Plan' }, { value: 'body', label: 'Body' }], tab)}</div>
      <div class="stack mt12">${body()}</div>
      <div class="tabbar-space"></div>`;
  }

  function dayPicker(sel) {
    const today = new Date().getDay();
    const order = [1, 2, 3, 4, 5, 6, 0];
    return `<div class="day-pick reveal" style="--i:1">${order.map((i) => {
      const k = App.WEEK[i];
      return `<button class="dp ${k === sel ? 'on' : ''} ${i === today ? 'today' : ''}" data-act="pickDay" data-d="${k}">
        <small>${DOW[i]}</small><b>${k === 'rest' ? 'Rest' : App.DAYS[k].name.split(' ')[0]}</b></button>`;
    }).join('')}</div>`;
  }

  function renderToday() {
    const dayK = App.ui.gymDay || todayKey();
    const day = App.DAYS[dayK];
    const key = logKey(dkey(), dayK);
    const log = App.state.gym.logs[key] || { sets: {} };
    const totalSets = day.list.reduce((a, e) => a + e.sets, 0);
    const doneSets = day.list.reduce((a, e) => a + ((log.sets[e.id] || []).filter((s) => s.done).length), 0);
    const mins = Math.round(day.list.reduce((a, e) => a + e.sets * (e.rest + 40), 0) / 60);

    if (dayK === 'rest') {
      return `${dayPicker(dayK)}
        <section class="card day-hero ${day.color} reveal" style="--i:2"><span class="eyebrow">Today</span><h2>😴 ${day.name}</h2><p>${day.focus}</p></section>
        <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('moon')}Recovery checklist</h3></div>
        ${App.REST_DAY.map((r) => `<div class="rest-item"><span class="tile-ic g-accent sm">${icon('check')}</span><div><b>${r.t}</b><small class="muted block">${r.d}</small></div></div>`).join('')}</section>
        <p class="section-note reveal" style="--i:4">${icon('info')}<span>Want to train anyway? Pick another day above.</span></p>`;
    }

    const exCard = (e, i) => {
      const def = App.EX[e.id];
      const sets = log.sets[e.id] || [];
      const last = lastPerformance(e.id, key);
      const done = sets.filter((s) => s.done).length;
      const open = App.ui.openEx[e.id];
      const prefill = (si) => sets[si] || (last && last.sets[Math.min(si, last.sets.length - 1)]) || {};
      return `<article class="card ex-card ${done >= e.sets ? 'complete' : ''} ${open ? 'open' : ''} reveal" style="--i:${i + 3}">
        <button class="ex-head" data-act="toggleEx" data-id="${e.id}">
          <span class="ex-num">${done >= e.sets ? icon('check') : i + 1}</span>
          <span class="grow ta-l"><b>${esc(def.name)}</b><small class="muted block">${e.sets} × ${e.reps}${def.timed ? ' sec' : ' reps'} · rest ${e.rest}s</small></span>
          <span class="ex-prog">${done}/${e.sets}</span>
          <span class="chev">${icon('down')}</span>
        </button>
        <div class="ex-body"><div class="ex-inner">
          <p class="ex-muscle">${icon('target')}${esc(def.muscle)}</p>
          <ol class="ex-steps">${def.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          <div class="ex-tips"><p><b>✅ Tip:</b> ${esc(def.tip)}</p><p><b>❌ Avoid:</b> ${esc(def.mistake)}</p></div>
          <div class="coach-say">${icon('spark')}<span>${suggestion(e, def, last)}${last ? `<small class="muted block">Last (${prettyDate(last.date)}): ${last.sets.map((s) => (def.timed ? `${s.r}s` : `${s.w || 0}×${s.r}`)).join(', ')}</small>` : ''}</span></div>
          <div class="set-grid">
            <span class="sg-h">Set</span><span class="sg-h">${def.timed ? '—' : 'kg'}</span><span class="sg-h">${def.timed ? 'sec' : 'reps'}</span><span class="sg-h"></span>
            ${Array.from({ length: e.sets }, (_, si) => {
              const s = sets[si] || {};
              const p = prefill(si);
              return `<span class="sg-n">${si + 1}</span>
                ${def.timed ? '<span class="muted ta-c">—</span>' : `<input class="inp sm ta-c" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${p.w ?? ''}" value="${s.w ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="w">`}
                <input class="inp sm ta-c" type="number" inputmode="numeric" min="0" placeholder="${p.r ?? rangeLow(e.reps)}" value="${s.r ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="r">
                <button class="check ${s.done ? 'on' : ''}" data-act="doneSet" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-rest="${e.rest}" aria-label="Set done">${icon('check')}</button>`;
            }).join('')}
          </div>
          <button class="btn btn-ghost sm mt8" data-act="startRest" data-rest="${e.rest}">${icon('timer')}Start ${e.rest}s rest</button>
        </div></div>
      </article>`;
    };

    return `${dayPicker(dayK)}
      <section class="card day-hero ${day.color} reveal" style="--i:2">
        <div class="row between"><div><span class="eyebrow">${dayK === todayKey() ? "Today's workout" : 'Selected workout'}</span><h2>${day.name}</h2><p>${day.focus}</p></div>
        ${App.ring(doneSets / totalSets, { size: 76, stroke: 8, grad: 'g-green', label: `<b>${doneSets}</b>`, sub: `/${totalSets} sets` })}</div>
        <div class="row gap small mt8"><span class="pill light">${icon('clock')}~${mins} min</span><span class="pill light">${icon('dumbbell')}${day.list.length} exercises</span></div>
        <details class="warmup"><summary>${icon('flame')}Warm-up (5–8 min)</summary><ul>${App.WARMUP.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>
      </section>
      ${day.list.map(exCard).join('')}
      ${log.finished
        ? `<div class="card done-card reveal">${icon('trophy')}<div><b>Workout complete!</b><small class="muted block">Now eat your post-workout dinner.</small></div></div>`
        : `<button class="btn btn-primary btn-block btn-lg reveal" data-act="finishWorkout" data-key="${key}" data-day="${dayK}">${icon('trophy')}Finish workout</button>`}`;
  }

  function renderDiet() {
    const p = App.state.profile;
    const t = App.targets(p);
    const food = App.foodToday();
    const plan = food.plan;
    const log = food.log;
    const rate = weightRate();

    const macro = (label, val, goal, grad, unit = 'g') => `<div class="macro">${App.ring(val / goal, { size: 70, stroke: 7, grad, label: `<b class="small">${Math.round(val)}</b>` })}<small>${label}</small><span class="muted">${goal}${unit}</span></div>`;
    const eatenP = food.p;
    const eatenC = plan.meals.filter((m) => log.meals[m.id]).reduce((a, m) => a + m.c, 0);
    const eatenF = plan.meals.filter((m) => log.meals[m.id]).reduce((a, m) => a + m.f, 0);

    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between"><div><span class="eyebrow">${t.mode.label} target</span><h2 class="kcal">${App.count(t.kcal)} <small>kcal/day</small></h2></div>
          <span class="badge">${p.weight} kg</span></div>
        <p class="muted small">Your maintenance is ~${App.num(t.tdee)} kcal (BMR ${App.num(t.bmr)} × activity). ${t.mode.surplus > 0 ? `+${t.mode.surplus} kcal surplus to build muscle.` : t.mode.surplus < 0 ? `${t.mode.surplus} kcal deficit.` : ''}</p>
        <div class="eaten-bar mt12"><div class="row between small"><span>Eaten today</span><b>${App.num(food.kcal)} / ${App.num(t.kcal)} kcal</b></div>${App.bar(food.kcal / t.kcal, food.kcal >= t.kcal ? 'green' : 'accent', 'thick')}</div>
        <div class="macros">${macro('Protein', eatenP, t.protein, 'g-blue')}${macro('Carbs', eatenC, t.carbs, 'g-warm')}${macro('Fat', eatenF, t.fat, 'g-red')}${macro('Water', (App.state.body.water[dkey()] || 0) * 0.25, t.water, 'g-accent', ' L')}</div>
      </section>

      ${rate ? `<div class="inline-alert ${rate.cls} reveal" style="--i:2">${icon(rate.cls === 'ok' ? 'up' : 'info')}<span>${rate.msg}</span></div>` : ''}

      <div class="row between reveal" style="--i:3"><h4 class="group-title">🇮🇳 Low-budget bulk plan<span>${inr(plan.total.cost)}/day</span></h4></div>
      ${plan.meals.map((m, i) => `
        <article class="card meal ${log.meals[m.id] ? 'eaten' : ''} ${m.booster ? 'booster' : ''} reveal" style="--i:${i + 4}">
          <div class="meal-head">
            <span class="meal-emoji">${m.emoji}</span>
            <div class="grow"><small class="muted">${m.time}${m.booster ? ' · Booster to hit your target' : ''}</small><b>${m.name}</b>
              <small class="block"><span class="kc">${Math.round(m.kcal)} kcal</span> · <span class="pc">${Math.round(m.p)}g protein</span> · ${inr(m.cost)}</small></div>
            <button class="check lg ${log.meals[m.id] ? 'on' : ''}" data-act="eatMeal" data-id="${m.id}" aria-label="Mark eaten">${icon('check')}</button>
          </div>
          <ul class="food-items">${m.items.map((k) => { const f = App.FOODS[k]; return `<li><span>${f.name} <small class="muted">${f.qty}</small></span><small>${f.kcal} kcal · ${f.p}g P</small></li>`; }).join('')}</ul>
          <p class="meal-how">${icon('info')}${esc(m.how)}</p>
          <p class="meal-swap">🔁 ${esc(m.swap)}</p>
        </article>`).join('')}

      <section class="card reveal">
        <div class="card-head"><h3>${icon('food')}Extra food today</h3><button class="link" data-act="addFood">${icon('plus')}Add</button></div>
        ${(log.extra || []).length ? (log.extra).map((x) => `<div class="extra-row"><span>${esc(x.name)}</span><small>${x.kcal} kcal · ${x.p}g P</small><button class="icon-btn sm" data-act="delFood" data-id="${x.id}" aria-label="Remove">${icon('x')}</button></div>`).join('') : '<p class="muted small">Ate something outside the plan? Add it here so your calories stay accurate.</p>'}
      </section>

      <section class="card reveal">
        <div class="card-head"><h3>${icon('rupee')}Monthly shopping list</h3><b>${inr(App.SHOPPING.reduce((a, s) => a + s[2], 0))}</b></div>
        <div class="shop">${App.SHOPPING.map((s) => `<div class="shop-row"><span>${s[0]}<small class="muted block">${s[1]}</small></span><b>${inr(s[2])}</b></div>`).join('')}</div>
        <p class="field-hint mt8">Approximate prices. Buy oats, soya, peanuts and dal in bulk packs to save more.</p>
      </section>

      <section class="card reveal">
        <div class="card-head"><h3>${icon('spark')}Bulking rules</h3></div>
        <ul class="rules">
          <li>Plan total: <b>${App.num(plan.total.kcal)} kcal</b>, <b>${Math.round(plan.total.p)} g protein</b>, ${Math.round(plan.total.c)} g carbs, ${Math.round(plan.total.f)} g fat.</li>
          <li>Weigh yourself 3–4 mornings a week. Target: <b>+0.25 to 0.5 kg per week</b>.</li>
          <li>No weight gain for 2 weeks? Add the mass gainer shake or one more roti + dal.</li>
          <li>Gaining more than 0.75 kg/week? Drop the bedtime milk.</li>
          <li>Values are approximate. If you have a medical condition, check with a doctor or dietitian.</li>
        </ul>
      </section>`;
  }

  function weightRate() {
    const w = App.state.body.weights;
    if (w.length < 2) return null;
    const last = w[w.length - 1];
    const ref = [...w].reverse().find((x) => App.daysBetween(x.date, last.date) >= 10);
    if (!ref) return null;
    const days = App.daysBetween(ref.date, last.date);
    const perWeek = ((last.kg - ref.kg) / days) * 7;
    const mode = App.state.profile.mode;
    const r = perWeek.toFixed(2);
    if (mode !== 'bulk') return { cls: 'ok', msg: `Weight trend: ${perWeek >= 0 ? '+' : ''}${r} kg/week.` };
    if (perWeek < 0.15) return { cls: 'warn', msg: `You are gaining only ${r} kg/week. Add ~200 kcal (the mass gainer shake) and check again in 2 weeks.` };
    if (perWeek > 0.75) return { cls: 'warn', msg: `You are gaining ${r} kg/week, which is a bit fast. Drop ~150 kcal (skip bedtime milk).` };
    return { cls: 'ok', msg: `Perfect pace: +${r} kg/week. Keep going!` };
  }

  function renderWeek() {
    const tk = todayKey();
    const order = [1, 2, 3, 4, 5, 6, 0];
    return `
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('cal')}Push · Pull · Legs (6 days)</h3></div>
        <p class="muted small">Each muscle is trained twice a week, which suits a beginner-intermediate lifter who wants size. Sunday is rest.</p></section>
      ${order.map((i, idx) => {
        const k = App.WEEK[i];
        const d = App.DAYS[k];
        return `<button class="card week-row ${k === tk ? 'today' : ''} reveal" style="--i:${idx + 2}" data-act="openDay" data-d="${k}">
          <span class="tile-ic ${d.color}">${icon(k === 'rest' ? 'moon' : 'dumbbell')}</span>
          <span class="grow ta-l"><small class="muted">${DOW[i]}${k === tk ? ' · Today' : ''}</small><b class="block">${d.name}</b><small class="muted">${d.list.length ? d.list.map((e) => App.EX[e.id].name.replace(/^(Barbell|Dumbbell|Seated|Standing|Cable|Lying) /, '')).slice(0, 3).join(', ') + '…' : d.focus}</small></span>
          ${icon('right')}</button>`;
      }).join('')}
      <section class="card reveal"><div class="card-head"><h3>${icon('up')}How to progress</h3></div>
        <ul class="rules">
          <li>Use a weight where the last 1–2 reps are hard but form stays clean.</li>
          <li>When you hit the top of the rep range on every set, add 2.5 kg (upper body) or 5 kg (legs). The app tells you when.</li>
          <li>Rest the full time shown. The timer starts automatically when you tick a set.</li>
          <li>Every 8 weeks, take a lighter week (same exercises, half the sets).</li>
        </ul></section>
      <section class="card reveal"><div class="card-head"><h3>${icon('spark')}Coach tips</h3></div>
        <ul class="rules">${App.COACH_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`;
  }

  function renderBody() {
    const b = App.state.body;
    const p = App.state.profile;
    const today = dkey();
    const w = b.weights;
    const cur = w.length ? w[w.length - 1].kg : p.weight;
    const start = w.length ? w[0].kg : p.weight;
    const diff = Math.round((cur - start) * 10) / 10;
    const water = b.water[today] || 0;
    const steps = b.steps[today] || 0;
    const workouts = Object.entries(App.state.gym.logs).filter(([, l]) => l.finished).sort((a, b2) => b2[0].localeCompare(a[0]));
    const week = lastNDays(7);
    const weekDone = workouts.filter(([k]) => week.includes(k.split('|')[0])).length;
    const bmi = cur / Math.pow(p.height / 100, 2);
    const stepsChart = week.map((d) => ({ label: DOW[parseD(d).getDay()][0], value: b.steps[d] || 0, cls: (b.steps[d] || 0) >= b.stepGoal ? 'grad-green' : 'grad-blue' }));

    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between"><div><span class="eyebrow">Body weight</span><h2 class="kcal">${App.count(cur, { dec: 1 })} <small>kg</small></h2>
          <small class="${diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'muted'}">${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : ''}${diff} kg since ${w.length ? prettyDate(w[0].date) : 'start'}</small></div>
          <button class="btn btn-soft sm" data-act="quickWeight">${icon('plus')}Log</button></div>
        <div class="mt12">${App.lineChart(w.slice(-20).map((x) => ({ v: x.kg, label: x.date })), { fmt: (v) => v.toFixed(1) })}</div>
        <div class="stat-row"><div><small>BMI</small><b>${bmi.toFixed(1)}</b></div><div><small>Height</small><b>${p.height} cm</b></div><div><small>Workouts (7d)</small><b>${weekDone}/6</b></div></div>
      </section>

      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('drop')}Water</h3><span class="muted small">${(water * 0.25).toFixed(2)} / ${(b.waterGoal * 0.25).toFixed(1)} L</span></div>
        <div class="glasses">${Array.from({ length: b.waterGoal }, (_, i) => `<span class="glass ${i < water ? 'full' : ''}" style="--d:${i * 30}ms"></span>`).join('')}</div>
        <div class="row gap mt12"><button class="btn btn-ghost" data-act="subWater">${icon('minus')}</button><button class="btn btn-primary grow" data-act="addWater">${icon('plus')}250 ml glass</button></div>
      </section>

      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('steps')}Steps</h3><button class="link" data-act="logSteps">${App.num(steps)} today ${icon('edit')}</button></div>
        ${App.barChart(stepsChart, { height: 110, lines: [{ v: b.stepGoal, cls: 'ok', label: 'Goal' }], fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) })}
      </section>

      <section class="card reveal" style="--i:4">
        <div class="card-head"><h3>${icon('trophy')}Workout history</h3><span class="muted small">${workouts.length} total</span></div>
        ${workouts.length ? workouts.slice(0, 10).map(([k, l]) => {
          const [date, day] = k.split('|');
          const sets = Object.values(l.sets).flat().filter((s) => s.done);
          const vol = sets.reduce((a, s) => a + (+s.w || 0) * (+s.r || 0), 0);
          return `<div class="hist-row"><span class="tile-ic ${App.DAYS[day].color} sm">${icon('dumbbell')}</span><div class="grow"><b>${App.DAYS[day].name}</b><small class="muted block">${prettyDate(date)} · ${sets.length} sets</small></div><b>${App.num(vol)} kg</b></div>`;
        }).join('') : '<p class="muted small">Finish your first workout to see it here.</p>'}
      </section>`;
  }

  /* ---------- actions ---------- */
  App.actions.gymTab = (el) => { App.ui.gymTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.pickDay = (el) => { App.ui.gymDay = el.dataset.d; App.render({ quiet: true }); };
  App.actions.openDay = (el) => { App.ui.gymDay = el.dataset.d; App.ui.gymTab = 'today'; App.render({ quiet: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  App.actions.toggleEx = (el) => {
    const id = el.dataset.id;
    App.ui.openEx[id] = !App.ui.openEx[id];
    el.closest('.ex-card').classList.toggle('open', App.ui.openEx[id]);
  };

  function setSlot(key, ex, i) {
    const logs = App.state.gym.logs;
    const day = key.split('|')[1];
    logs[key] = logs[key] || { day, sets: {}, finished: false };
    const def = App.DAYS[day].list.find((e) => e.id === ex);
    const arr = (logs[key].sets[ex] = logs[key].sets[ex] || []);
    while (arr.length < (def ? def.sets : i + 1)) arr.push({});
    return arr[i];
  }

  App.changes.setVal = (el) => {
    const s = setSlot(el.dataset.key, el.dataset.ex, +el.dataset.i);
    const v = el.value === '' ? undefined : Math.max(0, +el.value);
    s[el.dataset.f] = v;
    App.save();
  };

  App.actions.doneSet = (el) => {
    const { key, ex } = el.dataset;
    const i = +el.dataset.i;
    const s = setSlot(key, ex, i);
    // Read the current inputs (they may not have fired "change" yet) and fall back to placeholders
    const row = el.closest('.set-grid');
    ['w', 'r'].forEach((f) => {
      const inp = row.querySelector(`[data-ex="${ex}"][data-i="${i}"][data-f="${f}"]`);
      if (!inp) return;
      const v = inp.value !== '' ? inp.value : inp.placeholder;
      if (v !== '') s[f] = Math.max(0, +v);
    });
    s.done = !s.done;
    App.buzz(s.done ? 25 : 8);
    App.save();
    if (s.done) {
      const def = App.DAYS[key.split('|')[1]].list.find((e) => e.id === ex);
      const all = App.state.gym.logs[key].sets[ex].filter((x) => x.done).length;
      if (all >= def.sets) App.toast(`${App.EX[ex].name} done 💪`);
      App.startRest(+el.dataset.rest, App.EX[ex].name);
    }
    App.render({ quiet: true });
  };
  App.actions.startRest = (el) => App.startRest(+el.dataset.rest);

  App.actions.finishWorkout = (el) => {
    const key = el.dataset.key;
    const logs = App.state.gym.logs;
    logs[key] = logs[key] || { day: el.dataset.day, sets: {}, finished: false };
    const done = Object.values(logs[key].sets).flat().filter((s) => s.done).length;
    if (!done && !confirm('No sets ticked yet. Mark the workout finished anyway?')) return;
    logs[key].finished = true;
    App.actions.restStop();
    App.confetti();
    App.toast('Workout complete! Eat well and sleep well.');
    App.commit();
  };

  App.actions.eatMeal = (el) => {
    const t = dkey();
    const f = (App.state.food[t] = App.state.food[t] || { meals: {}, extra: [] });
    f.meals[el.dataset.id] = !f.meals[el.dataset.id];
    App.buzz();
    const food = App.foodToday();
    const target = App.targets(App.state.profile).kcal;
    if (f.meals[el.dataset.id] && food.kcal >= target && food.kcal - food.plan.meals.find((m) => m.id === el.dataset.id).kcal < target) {
      App.confetti();
      App.toast('Calorie target hit! 🎯');
    }
    App.commit();
  };
  App.actions.addFood = () => {
    App.sheet({
      title: 'Add food',
      submit: 'Add',
      body: `${App.field('Food', App.input('name', { placeholder: 'e.g. 2 samosa', required: true }))}
        <div class="grid2">${App.field('Calories', App.input('kcal', { type: 'number', min: 0, max: 5000, required: true, inputmode: 'numeric' }))}
        ${App.field('Protein (g)', App.input('p', { type: 'number', min: 0, max: 300, value: 0, inputmode: 'numeric' }))}</div>
        <p class="field-hint">Quick guide: samosa ~260 kcal, vada pav ~290, 1 plate biryani ~600, 1 paratha ~250.</p>`,
      onSubmit: (d) => {
        const t = dkey();
        const f = (App.state.food[t] = App.state.food[t] || { meals: {}, extra: [] });
        f.extra = f.extra || [];
        f.extra.push({ id: App.uid(), name: (d.name || 'Food').trim().slice(0, 40), kcal: Math.max(0, Math.round(+d.kcal || 0)), p: Math.max(0, Math.round(+d.p || 0)) });
        App.commit();
      },
    });
  };
  App.actions.delFood = (el) => {
    const f = App.state.food[dkey()];
    if (f) f.extra = (f.extra || []).filter((x) => x.id !== el.dataset.id);
    App.commit();
  };
  App.actions.subWater = () => {
    const t = dkey();
    App.state.body.water[t] = Math.max(0, (App.state.body.water[t] || 0) - 1);
    App.commit();
  };

  App.views.gym = { render };
})();
