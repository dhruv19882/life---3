'use strict';
/* More: every module beyond the four main tabs, with a live one-line status for each. */
(function () {
  const { icon, esc, inr, r1, fmtMin, sum, dkey } = App;

  function status(r) {
    try {
      switch (r) {
        case 'nutrition': { const n = App.nutritionDay(); return `${App.num(n.kcal)} / ${App.num(App.T().kcal)} kcal`; }
        case 'food': return `${Object.keys(App.BUILTIN_FOODS).length + App.state.nutrition.customFoods.length} foods offline`;
        case 'money': return `Balance ${inr(App.balance())}`;
        case 'dubai': { const c = App.dubaiCalc(); return c.daysLeft !== null && c.daysLeft >= 0 ? `${c.daysLeft} days · ${inr(c.saved)} saved` : `${inr(c.saved)} saved`; }
        case 'fees': { const t = App.feeTotals('collect'); return t.outstanding ? `${inr(t.outstanding)} to collect` : 'Nothing pending'; }
        case 'cma': { const w = App.cmaWeek(); return `${r1(w.minutes / 60)} / ${r1(w.target / 60)} h this week`; }
        case 'career': { const c = App.state.career || App.careerDefaults(); const ms = c.skills.flatMap((s) => s.milestones); return `${ms.filter((m) => m.done).length}/${ms.length} milestones`; }
        case 'goals': return `${App.state.todos.filter((t) => !t.done).length} open tasks`;
        case 'social': return `${fmtMin(sum(App.socialDay(), (a) => a.mins))} today`;
        case 'review': return (App.state.reviews[dkey()] || {}).done ? 'Done today' : 'Not done today';
        case 'settings': return 'Profile, theme, backup';
      }
    } catch (_) {}
    return '';
  }
  const FILL = { nutrition: 'f-lime', food: 'f-lime', money: 'f-sky', dubai: 'f-sky', fees: 'f-mint', cma: 'f-lime', career: 'f-mint', goals: 'f-sky', social: 'f-dark', review: 'f-dark', settings: 'f-dark' };

  function render() {
    const items = App.NAV.filter((n) => n.group === 'more');
    return `${App.header('More', 'All of LifeOS', '')}
      <div class="more-grid">${items.map((n, i) => `<button class="more-item reveal" style="--i:${i}" data-act="go" data-r="${n.r}">
        <span class="tile-ic ${FILL[n.r] || 'f-dark'}">${icon(n.ic)}</span><b>${esc(n.label)}</b><small>${esc(status(n.r) || n.note)}</small></button>`).join('')}</div>
      <p class="section-note mt16">${icon('lock')}<span>All data stays on this device. Works offline after the first load.</span></p>
      <div class="tabbar-space"></div>`;
  }
  App.views.more = { render };
})();
