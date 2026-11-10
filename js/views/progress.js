'use strict';
/* Progress: Life Score detail and 7-day trend, weekly review with real trends, achievements.
   Daily Review: end-of-day summary, reflection, and three rule-based priorities for tomorrow. */
(function () {
  const { icon, esc, dkey, prettyDate, sum, r1, inr, fmtMin, weekStart, parseD, addDays, lastNDays } = App;
  App.ui.reviewWeek = null;
  App.ui.reviewDate = null;

  function render() {
    const ls = App.lifeScore();
    const days = lastNDays(7);
    const trend = days.map((d) => ({ d, s: App.lifeScore(d).overall }));
    const ws = App.ui.reviewWeek || weekStart();
    const wr = App.weekReview(ws);
    const ach = Object.entries(App.state.achievements).sort((a, b) => b[1].date.localeCompare(a[1].date));
    const goals = App.state.goals.filter((g) => !g.done && g.term === 'long').slice(0, 3);
    return `${App.header('Progress', 'Life Score · reviews · achievements', `<button class="icon-btn lg" data-act="go" data-r="review" aria-label="Daily review">${icon('moon')}</button>`)}
      <div class="desk-2">
      <section class="card hero score-card reveal" style="--i:1">
        ${App.lifeScoreViz(ls, 240)}
        ${App.pillarChips(ls)}
        <p class="muted small mt12">Each pillar uses only data you logged today. Tap a pillar to see its rules. Pillars with nothing to score are shown as n/a and left out of the average (${ls.counted}/6 counted).</p>
      </section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('chart')}Life Score · last 7 days</h3></div>
        ${App.barChart(trend.map((x) => ({ label: App.DOW[parseD(x.d).getDay()], value: x.s || 0, cls: x.d === dkey() ? 'grad-lime' : 'grad-sky', title: x.s === null ? 'No data' : String(x.s) })), { height: 140, max: 100, fmt: (v) => v })}
        <button class="btn btn-primary btn-block mt12" data-act="go" data-r="review">${icon('moon')}Open daily review</button>
      </section>
      </div>
      <section class="card reveal" style="--i:3">
        <div class="month-nav"><button class="icon-btn" data-act="revWeek" data-n="-7" aria-label="Previous week">${icon('left')}</button><b>Week of ${prettyDate(ws, { absolute: true })}</b><button class="icon-btn" data-act="revWeek" data-n="7" ${ws >= weekStart() ? 'disabled' : ''} aria-label="Next week">${icon('right')}</button></div>
        <div class="stat-row four">${App.stat('Workouts', `${wr.a.workouts}/${wr.a.planned}`)}${App.stat('Avg kcal', wr.a.avgKcal === null ? '—' : App.num(wr.a.avgKcal))}${App.stat('Study', fmtMin(wr.a.study))}${App.stat('Spent', inr(wr.a.spend))}</div>
        <h4 class="group-title">Observations</h4>
        ${wr.obs.map((o) => `<div class="obs">${icon('spark')}<span>${esc(o)}</span></div>`).join('')}
      </section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('target')}Long-term goals</h3><button class="link" data-act="go" data-r="goals" data-tab="goals">All ${icon('right')}</button></div>
        ${goals.length ? goals.map(App.goalMini).join('') : `<p class="muted small">No long-term goals yet.</p><button class="btn btn-soft btn-block mt12" data-act="addGoal" data-term="long">${icon('plus')}Add a goal</button>`}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('medal')}Achievements</h3><span class="muted small">${ach.length}</span></div>
        ${ach.length ? `<div class="ach-grid">${ach.slice(0, 12).map(([, a]) => `<div class="ach"><span class="tile-ic f-lime">${icon(a.ic || 'trophy')}</span>${esc(a.title)}<small class="muted block">${prettyDate(a.date)}</small></div>`).join('')}</div>` : '<p class="muted small">Log meals, finish workouts, hit study targets and collect fees to unlock achievements.</p>'}</section>
      <div class="tabbar-space"></div>`;
  }
  App.actions.revWeek = (el) => { const ws = App.ui.reviewWeek || weekStart(); const n = dkey(addDays(parseD(ws), +el.dataset.n)); if (n > weekStart()) return; App.ui.reviewWeek = n; App.render({ quiet: true }); };

  /* ---------- Daily Review ---------- */
  function renderReview() {
    const date = App.ui.reviewDate || dkey();
    const st = App.state;
    const t = App.T();
    const n = App.nutritionDay(date);
    const g = App.gymDay(date);
    const w = st.body.weights.find((x) => x.date === date);
    const study = sum(App.cmaSessions(date, date), (s) => s.minutes);
    const wd = App.workDay(date);
    const spent = sum(st.money.txns.filter((x) => x.date === date), (x) => (x.type === 'expense' ? x.amount : x.type === 'refund' ? -x.amount : 0));
    const soc = App.socialDay(date);
    const socT = sum(soc, (a) => a.mins);
    const td = App.todosDay(date);
    const goalTasks = st.todos.filter((x) => x.done && x.doneAt === date && x.goalId).length;
    const dubaiMs = App.dubai().checklist.filter((c) => c.doneAt === date).length;
    const skillMs = ((st.career && st.career.skills) || []).reduce((a, s) => a + s.milestones.filter((m) => m.doneAt === date).length, 0);
    const rev = st.reviews[date] || {};
    const prios = App.tomorrowPriorities(date);
    const cell = (ic, label, val, sub = '', cls = '') => `<div class="stat"><small>${icon(ic)} ${label}</small><b class="${cls}">${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const yest = dkey(addDays(new Date(), -1));
    return `${App.back('progress', 'Progress')}
      ${App.header('Daily Review', prettyDate(date, { absolute: true, year: true }), '')}
      <div class="reveal" style="--i:0">${App.seg('revDate', [{ value: dkey(), label: 'Today' }, { value: yest, label: 'Yesterday' }], date)}</div>
      <section class="card mt12 reveal" style="--i:1">
        <div class="review-grid">
          ${cell('check', 'Tasks done', `${td.done.length + wd.done.length}`, `${td.open.length} personal still open`)}
          ${cell('flame', 'Calories', App.num(n.kcal), `of ${App.num(t.kcal)} kcal`)}
          ${cell('zap', 'Protein', `${Math.round(n.p)} g`, `of ${t.protein} g`, n.p >= t.protein ? 'pos' : '')}
          ${cell('dumbbell', 'Workout', g.rest && !g.trainedOther ? 'Rest day' : g.finished ? 'Finished' : `${g.done}/${g.total} sets`, g.def.name)}
          ${cell('scale', 'Weight', w ? `${w.kg} kg` : 'Not logged')}
          ${cell('book', 'Study', fmtMin(study), 'US CMA & backlog')}
          ${cell('briefcase', 'Work', `${r1(wd.hours)} h`, `${wd.journal.length} note(s) · ${wd.done.length} task(s)`)}
          ${cell('wallet', 'Money spent', inr(spent))}
          ${cell('phone', 'Social media', fmtMin(socT), soc.some((a) => a.status === 'over') ? 'over a maximum' : soc.some((a) => a.status === 'warn') ? 'past a warning' : 'within limits', soc.some((a) => a.status === 'over') ? 'neg' : '')}
          ${cell('target', 'Goals progressed', goalTasks + dubaiMs + skillMs, 'goal tasks + milestones')}
        </div>
      </section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('flag')}Top 3 for tomorrow</h3><span class="muted small">rule-based</span></div>
        ${prios.length ? prios.map((p, i) => `<button class="prio ta-l" style="width:100%" data-act="go" data-r="${p.route}"><span class="prio-n">${i + 1}</span><span class="grow"><b>${esc(p.title)}</b><small class="muted block">${esc(p.why)}</small></span></button>`).join('')
          : '<p class="muted small">Nothing urgent found. Add tasks with due dates, goals with deadlines or a CMA weekly target to get suggestions.</p>'}
        ${prios.length ? `<button class="btn btn-soft btn-block mt12" data-act="addPrios" data-date="${date}">${icon('plus')}Add these as tasks for tomorrow</button>` : ''}
        <p class="field-hint">Chosen from overdue and due tasks, fees, goal deadlines, your CMA weekly target, tomorrow's workout and Dubai savings, in that order of urgency.</p>
      </section>
      <form class="card reveal" style="--i:3" id="reviewForm">
        <div class="card-head"><h3>${icon('note')}Reflection</h3></div>
        ${App.field('How was the day?', App.chips('mood', [{ value: '1', label: '😞' }, { value: '2', label: '😕' }, { value: '3', label: '😐' }, { value: '4', label: '🙂' }, { value: '5', label: '😄' }], rev.mood || ''))}
        ${App.field('Notes', App.textarea('note', rev.note || '', { rows: 3, placeholder: 'What went well? What will you change tomorrow?' }))}
        <button class="btn btn-primary btn-block" type="submit">${icon('check')}${rev.done ? 'Update review' : 'Complete review'}</button>
      </form>
      <div class="tabbar-space"></div>`;
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'reviewForm') return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    const date = App.ui.reviewDate || dkey();
    const was = (App.state.reviews[date] || {}).done;
    App.state.reviews[date] = { mood: d.mood || '', note: (d.note || '').slice(0, 2000), done: true, at: new Date().toISOString() };
    App.save();
    let streak = 0;
    for (let i = 0; i < 400; i++) { const k = dkey(addDays(parseD(date), -i)); if ((App.state.reviews[k] || {}).done) streak++; else break; }
    if (!was && [1, 7, 30].includes(streak)) App.unlock('review-' + streak, streak === 1 ? 'First daily review' : `${streak}-day review streak`, 'Consistency compounds', 'moon');
    else App.toast(was ? 'Review updated' : 'Review complete. See you tomorrow.');
    App.render({ quiet: true });
  });
  App.actions.revDate = (el) => { App.ui.reviewDate = el.dataset.v; App.render({ quiet: true }); };
  App.actions.addPrios = (el) => {
    const tom = dkey(addDays(parseD(el.dataset.date), 1));
    const prios = App.tomorrowPriorities(el.dataset.date);
    let n = 0;
    for (const p of prios) {
      if (p.ref.startsWith('todo:')) { const t = App.state.todos.find((x) => 'todo:' + x.id === p.ref); if (t && t.due !== tom) { t.due = tom; n++; } continue; }
      if (App.state.todos.some((x) => !x.done && x.title === p.title && x.due === tom)) continue;
      App.state.todos.push({ id: App.uid(), title: p.title.slice(0, 140), due: tom, priority: 'high', goalId: '', done: false, created: dkey() });
      n++;
    }
    App.toast(n ? `${App.plural(n, 'task')} planned for tomorrow` : 'Already planned');
    App.commit();
  };

  App.views.progress = { render };
  App.views.review = { render: renderReview };
})();
