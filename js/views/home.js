'use strict';
/* Dashboard: today's summary across every module. */
(function () {
  const { icon, esc, inr, fmtMin, dkey } = App;

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function render() {
    const s = App.state;
    const p = s.profile;
    const t = App.targets(p);
    const today = dkey();
    const d = new Date();

    const food = App.foodToday();
    const water = s.body.water[today] || 0;
    const steps = s.body.steps[today] || 0;
    const todos = s.todos.filter((x) => !x.done && x.due && x.due <= today);
    const doneToday = s.todos.filter((x) => x.done && x.doneAt === today).length;
    const dueTotal = todos.length + doneToday;

    const soc = App.socialToday();
    const alerts = soc.filter((a) => a.status !== 'ok');
    const totalSoc = soc.reduce((a, x) => a + x.mins, 0);

    const m = App.monthMoney();
    const dayKey = App.WEEK[d.getDay()];
    const day = App.DAYS[dayKey];
    const gymDone = App.gymDoneToday();

    const activeGoals = s.goals.filter((g) => !g.done).slice(0, 3);

    return `
      ${App.header(`${greeting()}, <span class="grad-text">${esc(p.name)}</span>`, `${App.DOW[d.getDay()]}, ${d.getDate()} ${App.MON[d.getMonth()]}`,
        `<button class="icon-btn lg" data-act="settings" aria-label="Settings">${icon('user')}</button>`)}

      ${alerts.length ? `<section class="alert-stack reveal" style="--i:1">${alerts
        .map((a) => `<button class="alert alert-${a.status}" data-act="go" data-r="social">
          <span class="alert-ic">${icon(a.status === 'over' ? 'alert' : 'bell')}</span>
          <span class="alert-txt"><b>${esc(a.name)}: ${fmtMin(a.mins)}</b>
          <small>${a.status === 'over' ? `Over your high limit of ${fmtMin(a.high)}. Time to stop.` : `Passed your low limit of ${fmtMin(a.low)}. ${fmtMin(a.high - a.mins)} left before the high limit.`}</small></span>
          ${icon('right')}</button>`)
        .join('')}</section>` : ''}

      <section class="card hero reveal" style="--i:2">
        <div class="hero-main">
          ${App.ring(food.kcal / t.kcal, { size: 150, stroke: 13, grad: food.kcal > t.kcal * 1.1 ? 'g-warm' : 'g-accent',
            label: App.count(food.kcal), sub: `of ${App.num(t.kcal)} kcal` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:#22d3ee"></span><div><b>${App.count(food.p)}g</b><small>Protein / ${t.protein}g</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#3b82f6"></span><div><b>${App.count(water * 0.25, { dec: 2 })} L</b><small>Water / ${(s.body.waterGoal * 0.25).toFixed(1)} L</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#34d399"></span><div><b>${App.count(steps)}</b><small>Steps / ${App.num(s.body.stepGoal)}</small></div></div>
          </div>
        </div>
        <div class="quick-row">
          <button class="qbtn" data-act="addWater">${icon('drop')}<span>+ Water</span></button>
          <button class="qbtn" data-act="go" data-r="gym" data-tab="diet">${icon('food')}<span>Meals</span></button>
          <button class="qbtn" data-act="logSteps">${icon('steps')}<span>Steps</span></button>
          <button class="qbtn" data-act="quickWeight">${icon('scale')}<span>Weight</span></button>
        </div>
      </section>

      <section class="grid2">
        <button class="card tile reveal" style="--i:3" data-act="gymToday">
          <div class="tile-top"><span class="tile-ic ${day.color}">${icon(dayKey === 'rest' ? 'moon' : 'dumbbell')}</span>
            ${gymDone ? `<span class="badge ok">${icon('check')}Done</span>` : `<span class="badge">Today</span>`}</div>
          <b class="tile-title">${esc(day.name)}</b>
          <small class="muted">${dayKey === 'rest' ? 'Recovery day' : `${day.list.length} exercises · ~${Math.round(day.list.reduce((a, e) => a + e.sets * (e.rest + 40), 0) / 60)} min`}</small>
        </button>
        <button class="card tile reveal" style="--i:4" data-act="go" data-r="social">
          <div class="tile-top"><span class="tile-ic g-red">${icon('phone')}</span>
            <span class="badge ${alerts.some((a) => a.status === 'over') ? 'bad' : alerts.length ? 'warn' : 'ok'}">${alerts.length ? alerts.length + ' alert' + (alerts.length > 1 ? 's' : '') : 'On track'}</span></div>
          <b class="tile-title">${fmtMin(totalSoc)}</b>
          <small class="muted">Social media today</small>
        </button>
      </section>

      <section class="card reveal" style="--i:5">
        <div class="card-head"><h3>${icon('wallet')}This month</h3><button class="link" data-act="go" data-r="money">Details ${icon('right')}</button></div>
        <div class="money-row">
          <div><small class="muted">Spent</small><b class="big">${App.count(m.spent, { prefix: '₹' })}</b></div>
          <div class="ta-r"><small class="muted">${m.left >= 0 ? 'Left' : 'Over budget'}</small><b class="big ${m.left < 0 ? 'neg' : 'pos'}">${inr(Math.abs(m.left))}</b></div>
        </div>
        ${App.bar(m.spent / (m.budget || 1), m.spent > m.budget ? 'red' : m.spent > m.budget * 0.8 ? 'warm' : 'green')}
        <div class="row between muted small mt8"><span>Budget ${inr(m.budget)}</span><span>Safe to spend ${inr(Math.max(0, m.perDay))}/day</span></div>
        <button class="btn btn-soft btn-block mt12" data-act="addTxn" data-type="expense">${icon('plus')}Add expense</button>
      </section>

      <section class="card reveal" style="--i:6">
        <div class="card-head"><h3>${icon('list')}Today's tasks</h3><span class="muted small">${doneToday}/${dueTotal || 0} done</span></div>
        ${todos.length ? `<ul class="todo-list">${todos.slice(0, 4).map(App.todoItem).join('')}</ul>` : `<p class="muted small">${dueTotal ? 'All done for today. Nice work!' : 'No tasks due today.'}</p>`}
        <div class="row gap mt12">
          <button class="btn btn-soft grow" data-act="addTodo">${icon('plus')}Task</button>
          <button class="btn btn-ghost grow" data-act="go" data-r="goals">All tasks</button>
        </div>
      </section>

      <section class="card reveal" style="--i:7">
        <div class="card-head"><h3>${icon('target')}Goals</h3><button class="link" data-act="openGoals">All ${icon('right')}</button></div>
        ${activeGoals.length ? activeGoals.map(App.goalMini).join('') : `<p class="muted small">Set a long-term goal and break it into short-term steps.</p><button class="btn btn-soft btn-block mt12" data-act="addGoal" data-term="long">${icon('plus')}Add a goal</button>`}
      </section>

      <section class="card coach-tip reveal" style="--i:8">
        <span class="tile-ic g-accent">${icon('spark')}</span>
        <div><b>Coach tip</b><p>${esc(App.COACH_TIPS[(new Date().getDate()) % App.COACH_TIPS.length])}</p></div>
      </section>
      <div class="tabbar-space"></div>`;
  }

  App.actions.addWater = () => {
    const t = dkey();
    const w = App.state.body;
    w.water[t] = (w.water[t] || 0) + 1;
    App.buzz();
    if (w.water[t] === w.waterGoal) { App.confetti(); App.toast('Water goal reached!'); }
    else App.toast(`+250 ml · ${(w.water[t] * 0.25).toFixed(2)} L today`);
    App.commit();
  };
  App.actions.logSteps = () => {
    const t = dkey();
    App.sheet({
      title: 'Steps today',
      body: App.field('Steps', App.input('steps', { type: 'number', value: App.state.body.steps[t] || '', min: 0, max: 100000, required: true, inputmode: 'numeric' }), 'Copy the number from your phone\'s health app.')
        + App.field('Daily step goal', App.input('goal', { type: 'number', value: App.state.body.stepGoal, min: 1000, max: 50000, inputmode: 'numeric' })),
      onSubmit: (d) => {
        App.state.body.steps[t] = Math.max(0, Math.round(+d.steps || 0));
        if (+d.goal) App.state.body.stepGoal = Math.round(+d.goal);
        if (App.state.body.steps[t] >= App.state.body.stepGoal) App.confetti();
        App.commit();
      },
    });
  };
  App.actions.quickWeight = () => {
    const w = App.state.body.weights;
    const last = w.length ? w[w.length - 1].kg : App.state.profile.weight;
    App.sheet({
      title: 'Log body weight',
      body: App.field('Weight (kg)', App.input('kg', { type: 'number', value: last, min: 30, max: 200, step: 0.1, required: true, inputmode: 'decimal' }), 'Weigh yourself in the morning, after the toilet, before eating.'),
      onSubmit: (d) => {
        const kg = Math.round(+d.kg * 10) / 10;
        if (!(kg >= 30 && kg <= 200)) return App.toast('Enter a weight between 30 and 200 kg', 'bad'), false;
        App.logWeight(kg);
        App.state.profile.weight = kg;
        App.toast(`Logged ${kg} kg`);
        App.commit();
      },
    });
  };
  App.actions.gymToday = () => { App.ui.gymDay = null; App.go('gym', 'today'); };
  App.actions.openGoals = () => App.go('goals', 'goals');

  App.views.home = { render };
})();
