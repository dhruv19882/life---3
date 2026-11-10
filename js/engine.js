'use strict';
/* Engine: cross-module calculations (nutrition, gym, finance, fees, Dubai, CMA, work, social),
   the Life Score, notifications, tomorrow's priorities, weekly review and achievements.
   Everything here is deterministic, local and rule-based. Nothing is estimated from missing data. */
(function () {
  const { dkey, mkey, parseD, addDays, daysBetween, weekStart, weekDays, sum, clamp, r1, timeToMin } = App;
  const S = () => App.state;

  /* ---------- nutrition ---------- */
  App.mealsOn = (date = dkey()) => (S().nutrition.logs[date] || []);
  App.nutritionDay = (date = dkey()) => {
    const meals = App.mealsOn(date);
    const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, items: 0 };
    const slots = {};
    for (const m of meals) {
      for (const it of m.items) { t.kcal += +it.kcal || 0; t.p += +it.p || 0; t.c += +it.c || 0; t.f += +it.f || 0; t.fib += +it.fib || 0; t.items++; }
      slots[m.slot] = true;
    }
    return { ...t, meals, slots, slotsDone: Object.keys(slots).length };
  };
  App.waterMl = (date = dkey()) => +(S().body.waterMl || {})[date] || 0;
  App.T = () => App.targets(S().profile);

  /* ---------- body ---------- */
  App.currentWeight = () => {
    const w = S().body.weights;
    return w.length ? w[w.length - 1].kg : (S().profile ? S().profile.weight : 0);
  };
  /** Weekly (Mon–Sun) averages of body weight. */
  App.weeklyWeights = () => {
    const by = {};
    for (const w of S().body.weights) (by[weekStart(w.date)] = by[weekStart(w.date)] || []).push(w.kg);
    return Object.keys(by).sort().map((k) => ({ week: k, avg: r1(sum(by[k]) / by[k].length), n: by[k].length }));
  };
  App.weightRate = () => {
    const ww = App.weeklyWeights();
    if (ww.length < 2) return null;
    const a = ww[Math.max(0, ww.length - 4)], b = ww[ww.length - 1];
    const weeks = daysBetween(a.week, b.week) / 7;
    if (weeks <= 0) return null;
    return { perWeek: Math.round(((b.avg - a.avg) / weeks) * 100) / 100, weeks, from: a, to: b };
  };

  /* ---------- gym ---------- */
  App.dayKeyFor = (date = dkey()) => App.split()[parseD(date).getDay()];
  App.gymLog = (date = dkey(), day = App.dayKeyFor(date)) => S().gym.logs[`${date}|${day}`];
  App.gymDay = (date = dkey()) => {
    const key = App.dayKeyFor(date);
    const def = App.dayDef(key);
    const logs = Object.entries(S().gym.logs).filter(([k]) => k.startsWith(date + '|'));
    const own = S().gym.logs[`${date}|${key}`] || { sets: {} };
    const total = sum(def.list, (e) => e.sets);
    const done = sum(def.list, (e) => (own.sets[e.id] || []).filter((s) => s.done).length);
    const anyFinished = logs.some(([, l]) => l.finished);
    const otherDone = logs.filter(([k]) => k !== `${date}|${key}`).reduce((a, [, l]) => a + Object.values(l.sets || {}).flat().filter((s) => s.done).length, 0);
    return { key, def, rest: key === 'rest', total, done, finished: !!own.finished || anyFinished, trainedOther: otherDone > 0, log: own };
  };
  App.setVolume = (s) => (+s.w || 0) * (+s.r || 0);
  App.allDoneSets = () => {
    const out = [];
    for (const [k, l] of Object.entries(S().gym.logs)) {
      const [date, day] = k.split('|');
      for (const [ex, sets] of Object.entries(l.sets || {})) for (const s of sets) if (s && s.done) out.push({ date, day, ex, w: +s.w || 0, r: +s.r || 0 });
    }
    return out;
  };
  const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 12) / 30) : 0);
  App.e1rm = e1rm;
  /** Personal records per exercise: heaviest weight and best estimated 1RM (Epley). */
  App.personalRecords = (excludeKey) => {
    const pr = {};
    for (const [k, l] of Object.entries(S().gym.logs)) {
      if (k === excludeKey) continue;
      const date = k.split('|')[0];
      for (const [ex, sets] of Object.entries(l.sets || {})) for (const s of sets || []) {
        if (!s || !s.done) continue;
        const w = +s.w || 0, r = +s.r || 0, e = e1rm(w, r);
        const cur = (pr[ex] = pr[ex] || { maxW: 0, maxWReps: 0, best1rm: 0, date: '', maxReps: 0 });
        if (w > cur.maxW || (w === cur.maxW && r > cur.maxWReps)) { cur.maxW = w; cur.maxWReps = r; cur.date = date; }
        if (e > cur.best1rm) cur.best1rm = r1(e);
        if (r > cur.maxReps) cur.maxReps = r;
      }
    }
    return pr;
  };

  /* ---------- finance ---------- */
  App.monthMoney = (month = mkey()) => {
    const m = S().money;
    const tx = m.txns.filter((t) => t.date.startsWith(month));
    const income = sum(tx.filter((t) => t.type === 'income'), (t) => t.amount);
    const expense = sum(tx.filter((t) => t.type === 'expense'), (t) => t.amount);
    const refunds = sum(tx.filter((t) => t.type === 'refund'), (t) => t.amount);
    const tOut = sum(tx.filter((t) => t.type === 'transfer' && t.dir !== 'in'), (t) => t.amount);
    const tIn = sum(tx.filter((t) => t.type === 'transfer' && t.dir === 'in'), (t) => t.amount);
    const spent = App.money(expense - refunds);
    const budget = m.monthly || 0;
    const left = budget - spent;
    const [y, mo] = month.split('-').map(Number);
    const dim = new Date(y, mo, 0).getDate();
    const isNow = month === mkey();
    const daysLeft = isNow ? dim - new Date().getDate() + 1 : 0;
    const byCat = {};
    for (const t of tx) {
      if (t.type === 'expense') byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
      if (t.type === 'refund') byCat[t.cat] = (byCat[t.cat] || 0) - t.amount;
    }
    return { tx, income: App.money(income), expense, refunds, spent, net: App.money(income - spent), transfersOut: tOut, transfersIn: tIn, budget, left, daysInMonth: dim, daysLeft, perDay: daysLeft ? Math.max(0, left) / daysLeft : 0, byCat };
  };
  /** Spendable balance across all time: opening + income + refunds − expenses − transfers out + transfers in. */
  App.balance = () => {
    const m = S().money;
    let b = +m.opening || 0;
    for (const t of m.txns) {
      if (t.type === 'income' || t.type === 'refund') b += t.amount;
      else if (t.type === 'expense') b -= t.amount;
      else if (t.type === 'transfer') b += t.dir === 'in' ? t.amount : -t.amount;
    }
    return App.money(b);
  };

  /* ---------- fees & payments ---------- */
  App.feeCalc = (r, today = dkey()) => {
    const received = App.money(sum(r.payments || [], (p) => p.amount));
    const outstanding = App.money(Math.max(0, r.amount - received));
    let status = 'pending';
    if (received >= r.amount && r.amount > 0) status = 'paid';
    else if (r.due && r.due < today) status = 'overdue';
    else if (received > 0) status = 'partial';
    return { received, outstanding, status, daysOverdue: status === 'overdue' ? daysBetween(r.due, today) : 0 };
  };
  App.feeTotals = (kind = 'collect') => {
    const rs = S().fees.records.filter((r) => r.kind === kind);
    const out = { total: 0, received: 0, outstanding: 0, overdue: 0, overdueCount: 0, count: rs.length, open: 0 };
    for (const r of rs) {
      const c = App.feeCalc(r);
      out.total += r.amount; out.received += c.received; out.outstanding += c.outstanding;
      if (c.status === 'overdue') { out.overdue += c.outstanding; out.overdueCount++; }
      if (c.status !== 'paid') out.open++;
    }
    return out;
  };

  /* ---------- Dubai ---------- */
  App.dubai = () => {
    if (!S().dubai) S().dubai = App.dubaiDefaults();
    return S().dubai;
  };
  App.dubaiCalc = () => {
    const d = App.dubai();
    const today = dkey();
    const groups = d.includeEmployment ? ['personal', 'employment'] : ['personal'];
    const inc = d.costs.filter((c) => groups.includes(c.group));
    const required = App.money(sum(inc.filter((c) => c.amount !== null && c.amount !== ''), (c) => c.amount));
    const unknown = inc.filter((c) => c.amount === null || c.amount === '').length;
    const unverified = inc.filter((c) => !c.verified).length;
    const saved = App.money((+d.startSavings || 0) + sum(d.deposits, (x) => x.amount));
    const remaining = App.money(Math.max(0, required - saved));
    const target = d.confirmedDate || d.targetDate;
    const daysLeft = target ? daysBetween(today, target) : null;
    const monthsLeft = daysLeft !== null ? Math.max(0, daysLeft / 30.44) : null;
    const monthlyTarget = monthsLeft !== null && monthsLeft > 0 ? Math.ceil(remaining / Math.max(1, monthsLeft)) : remaining > 0 && daysLeft !== null ? remaining : 0;
    const thisMonth = App.money(sum(d.deposits.filter((x) => x.date.startsWith(mkey())), (x) => x.amount));
    const checklistDone = d.checklist.filter((c) => c.done).length;
    return { required, unknown, unverified, saved, remaining, target, daysLeft, monthsLeft, monthlyTarget, thisMonth, progress: required > 0 ? clamp(saved / required, 0, 1) : 0,
      checklistDone, checklistTotal: d.checklist.length, confirmed: !!d.confirmedDate && d.travelConfirmed };
  };

  /* ---------- CMA ---------- */
  App.cmaSessions = (from, to) => S().cma.sessions.filter((s) => s.date >= from && s.date <= to);
  App.cmaWeek = (start = weekStart()) => {
    const end = dkey(addDays(parseD(start), 6));
    const ss = App.cmaSessions(start, end);
    const minutes = sum(ss, (s) => s.minutes);
    const target = +S().cma.weeklyTargetMin || 0;
    const elapsed = clamp(daysBetween(start, dkey()) + 1, 1, 7);
    return { minutes, target, sessions: ss, elapsed, onPace: target ? minutes / ((target * elapsed) / 7) : 0 };
  };
  App.cmaAccuracy = (filter = () => true) => {
    const ss = S().cma.sessions.filter((s) => (+s.attempted || 0) > 0 && filter(s));
    const att = sum(ss, (s) => s.attempted), cor = sum(ss, (s) => s.correct);
    return { attempted: att, correct: cor, acc: att ? cor / att : null };
  };
  App.cmaWeakSections = () => {
    const out = [];
    for (const part of Object.values(App.CMA)) for (const sec of part.sections) {
      const a = App.cmaAccuracy((s) => s.section === sec.id);
      const flagged = !!S().cma.weakFlags[sec.id];
      if (flagged || (a.attempted >= 20 && a.acc < 0.7)) out.push({ sec, ...a, flagged });
    }
    return out;
  };

  /* ---------- work ---------- */
  App.timesheetHours = (ts) => {
    if (!ts || !ts.start || !ts.end) return 0;
    let m = timeToMin(ts.end) - timeToMin(ts.start);
    if (m < 0) m += 1440;
    return Math.max(0, (m - (+ts.breakMin || 0)) / 60);
  };
  App.scheduledHours = () => {
    const p = S().profile || {};
    return App.timesheetHours({ start: p.workStart || '14:00', end: p.workEnd || '23:00', breakMin: 0 });
  };
  App.isWorkday = (date = dkey()) => ((S().profile && S().profile.workDays) || [1, 2, 3, 4, 5]).map(Number).includes(parseD(date).getDay());
  App.workDay = (date = dkey()) => {
    const w = S().work;
    const ts = w.timesheets[date];
    const done = w.tasks.filter((t) => t.status === 'done' && t.doneAt === date);
    const dueOpen = w.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= date);
    const journal = w.journal.filter((j) => j.date === date);
    return { ts, hours: App.timesheetHours(ts), done, dueOpen, journal, workday: App.isWorkday(date) };
  };

  /* ---------- social ---------- */
  App.socialStatus = (mins, a) => (mins >= a.high ? 'over' : mins >= a.low ? 'warn' : 'ok');
  App.socialDay = (date = dkey()) => {
    const log = S().social.logs[date] || {};
    return S().social.apps.map((a) => ({ ...a, mins: +log[a.id] || 0, logged: log[a.id] !== undefined, status: App.socialStatus(+log[a.id] || 0, a) }));
  };

  /* ---------- tasks ---------- */
  App.todosDay = (date = dkey()) => {
    const t = S().todos;
    const done = t.filter((x) => x.done && x.doneAt === date);
    const open = t.filter((x) => !x.done && x.due && x.due <= date);
    return { done, open };
  };

  /* ---------- Life Score ---------- */
  const rule = (label, weight, value, detail, applicable = true) => ({ label, weight, value: applicable ? clamp(value, 0, 1) : null, detail, applicable });
  const score = (rules) => {
    const a = rules.filter((r) => r.applicable);
    const w = sum(a, (r) => r.weight);
    return w ? Math.round((sum(a, (r) => r.weight * r.value) / w) * 100) : null;
  };

  App.lifeScore = (date = dkey()) => {
    const st = S();
    const t = App.T();
    const n = App.nutritionDay(date);
    const water = App.waterMl(date);
    const kr = t.kcal ? n.kcal / t.kcal : 0;
    const kv = kr <= 1 ? kr : kr <= 1.15 ? 1 : Math.max(0, 1 - (kr - 1.15) / 0.35);

    const health = [
      rule('Calories vs goal', 3, kv, `${App.num(n.kcal)} / ${App.num(t.kcal)} kcal`),
      rule('Protein vs goal', 3, t.protein ? n.p / t.protein : 0, `${Math.round(n.p)} / ${t.protein} g`),
      rule('Water vs goal', 2, t.waterMl ? water / t.waterMl : 0, `${r1(water / 1000)} / ${r1(t.waterMl / 1000)} L`),
    ];

    const g = App.gymDay(date);
    const steps = (st.body.steps || {})[date];
    const lastW = st.body.weights.length ? st.body.weights[st.body.weights.length - 1].date : '';
    const fitness = [
      g.rest && !g.trainedOther
        ? rule('Workout', 5, 0, 'Rest day (not scored)', false)
        : rule('Workout sets completed', 5, g.finished ? 1 : g.total ? g.done / g.total : g.trainedOther ? 1 : 0, g.rest ? 'Extra session on a rest day' : `${g.done} / ${g.total} sets${g.finished ? ' · finished' : ''}`),
      rule('Steps vs goal', 2, steps ? steps / (st.body.stepGoal || 8000) : 0, steps ? `${App.num(steps)} / ${App.num(st.body.stepGoal)}` : 'Not logged (not scored)', !!steps),
      rule('Weight logged in last 7 days', 1, lastW && daysBetween(lastW, date) <= 7 ? 1 : 0, lastW ? `Last: ${App.prettyDate(lastW)}` : 'Never logged'),
    ];

    const wd = App.workDay(date);
    const workActive = wd.workday || wd.ts || wd.journal.length || wd.done.length;
    const sched = App.scheduledHours() || 9;
    const career = workActive ? [
      rule('Hours on timesheet', 3, wd.hours / sched, wd.ts ? `${r1(wd.hours)} / ${r1(sched)} h` : 'No timesheet yet'),
      rule('Work journal entry', 2, wd.journal.length ? 1 : 0, wd.journal.length ? 'Written' : 'Not written'),
      rule('Work tasks due today done', 3, wd.done.length / Math.max(1, wd.done.length + wd.dueOpen.length), `${wd.done.length} done · ${wd.dueOpen.length} due/overdue`, wd.done.length + wd.dueOpen.length > 0),
    ] : [rule('Not a workday', 1, 0, 'Not scored', false)];

    const cw = App.cmaWeek(weekStart(date));
    const todayMin = sum(App.cmaSessions(date, date), (s) => s.minutes);
    const daily = (cw.target || 0) / 7;
    const education = cw.target ? [
      rule("Today's study vs daily target", 4, daily ? todayMin / daily : 0, `${App.fmtMin(todayMin)} / ${App.fmtMin(daily)}`),
      rule('Week on pace', 3, cw.onPace, `${App.fmtMin(cw.minutes)} of ${App.fmtMin(cw.target)} this week`),
    ] : [rule('No weekly study target set', 1, 0, 'Set one in US CMA', false)];

    const mm = App.monthMoney(date.slice(0, 7));
    const dom = parseD(date).getDate();
    const prorated = mm.budget * (dom / mm.daysInMonth);
    const fc = App.feeTotals('collect');
    const fp = App.feeTotals('pay');
    const dc = App.dubaiCalc();
    const lastTx = st.money.txns.reduce((a, x) => (x.date > a ? x.date : a), '');
    const finance = [
      rule('Spending within budget pace', 3, mm.budget ? (mm.spent <= prorated ? 1 : 1 - (mm.spent - prorated) / Math.max(1, prorated)) : 0, mm.budget ? `${App.inr(mm.spent)} spent vs ${App.inr(prorated)} pace` : 'No budget set', mm.budget > 0),
      rule('No overdue fees & payments', 2, 1 - 0.34 * (fc.overdueCount + fp.overdueCount), `${fc.overdueCount + fp.overdueCount} overdue`, fc.count + fp.count > 0),
      rule('Dubai savings this month', 3, dc.monthlyTarget ? dc.thisMonth / dc.monthlyTarget : 0, dc.monthlyTarget ? `${App.inr(dc.thisMonth)} / ${App.inr(dc.monthlyTarget)}` : 'No target set', dc.monthlyTarget > 0),
      rule('Transactions logged in last 3 days', 1, lastTx && daysBetween(lastTx, date) <= 3 ? 1 : 0, lastTx ? `Last: ${App.prettyDate(lastTx)}` : 'None yet'),
    ];

    const td = App.todosDay(date);
    const soc = App.socialDay(date).filter((a) => a.logged);
    const socV = soc.length ? sum(soc, (a) => (a.status === 'ok' ? 1 : a.status === 'warn' ? 0.5 : 0)) / soc.length : 0;
    const yest = dkey(addDays(parseD(date), -1));
    const discipline = [
      rule("Today's tasks completed", 4, td.done.length / Math.max(1, td.done.length + td.open.length), `${td.done.length} done · ${td.open.length} open`, td.done.length + td.open.length > 0),
      rule('Social media within limits', 3, socV, soc.length ? `${soc.filter((a) => a.status === 'ok').length}/${soc.length} apps under warning limit` : 'Not logged (not scored)', soc.length > 0),
      rule("Yesterday's review done", 1, (st.reviews[yest] || {}).done ? 1 : 0, (st.reviews[yest] || {}).done ? 'Done' : 'Not done'),
    ];

    const P = [
      { id: 'health', label: 'Health', ic: 'heart', color: 'lime', route: 'nutrition', rules: health },
      { id: 'fitness', label: 'Fitness', ic: 'dumbbell', color: 'sky', route: 'fitness', rules: fitness },
      { id: 'career', label: 'Career', ic: 'briefcase', color: 'mint', route: 'work', rules: career },
      { id: 'education', label: 'Education', ic: 'book', color: 'lime', route: 'cma', rules: education },
      { id: 'finance', label: 'Finance', ic: 'wallet', color: 'sky', route: 'money', rules: finance },
      { id: 'discipline', label: 'Discipline', ic: 'shield', color: 'mint', route: 'goals', rules: discipline },
    ].map((p) => ({ ...p, score: score(p.rules) }));
    const scored = P.filter((p) => p.score !== null);
    return { pillars: P, overall: scored.length ? Math.round(sum(scored, (p) => p.score) / scored.length) : null, counted: scored.length };
  };

  /* ---------- notifications (in-app, computed live) ---------- */
  App.notifications = () => {
    const st = S();
    const today = dkey();
    const out = [];
    const fc = App.feeTotals('collect');
    if (fc.overdueCount) out.push({ id: 'fees-c', kind: 'bad', ic: 'receipt', title: `${App.inr(fc.overdue)} overdue to collect`, text: `${App.plural(fc.overdueCount, 'record')} past due date`, route: 'fees' });
    const payDue = st.fees.records.filter((r) => r.kind === 'pay' && App.feeCalc(r).status !== 'paid' && r.due && daysBetween(today, r.due) <= 3);
    if (payDue.length) out.push({ id: 'fees-p', kind: 'warn', ic: 'cal', title: `${App.plural(payDue.length, 'payment')} due soon`, text: payDue.slice(0, 2).map((r) => `${r.description || r.party} · ${App.prettyDate(r.due)}`).join(', '), route: 'fees' });
    const mm = App.monthMoney();
    if (mm.budget && mm.spent > mm.budget) out.push({ id: 'budget', kind: 'bad', ic: 'wallet', title: 'Monthly budget crossed', text: `${App.inr(mm.spent - mm.budget)} over ${App.inr(mm.budget)}`, route: 'money' });
    else if (mm.budget && mm.spent > mm.budget * 0.8) out.push({ id: 'budget', kind: 'warn', ic: 'wallet', title: `${Math.round((mm.spent / mm.budget) * 100)}% of budget used`, text: `${App.inr(mm.left)} left for ${mm.daysLeft} days`, route: 'money' });
    for (const a of App.socialDay(today)) {
      if (a.status === 'over') out.push({ id: 'soc-' + a.id, kind: 'bad', ic: 'phone', title: `${a.name}: maximum limit crossed`, text: `${App.fmtMin(a.mins)} today (max ${App.fmtMin(a.high)})`, route: 'social' });
      else if (a.status === 'warn') out.push({ id: 'soc-' + a.id, kind: 'warn', ic: 'phone', title: `${a.name}: warning limit passed`, text: `${App.fmtMin(a.high - a.mins)} left before the maximum`, route: 'social' });
    }
    const overdue = st.todos.filter((t) => !t.done && t.due && t.due < today);
    if (overdue.length) out.push({ id: 'todo', kind: 'warn', ic: 'list', title: `${App.plural(overdue.length, 'task')} overdue`, text: overdue.slice(0, 2).map((t) => t.title).join(', '), route: 'goals' });
    const wOver = st.work.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= today);
    if (wOver.length) out.push({ id: 'work', kind: 'warn', ic: 'briefcase', title: `${App.plural(wOver.length, 'work task')} due`, text: wOver.slice(0, 2).map((t) => t.title).join(', '), route: 'work' });
    for (const [k, p] of Object.entries(st.cma.parts)) {
      if (p.examDate && p.status !== 'passed') {
        const d = daysBetween(today, p.examDate);
        if (d >= 0 && d <= 30) out.push({ id: 'cma-' + k, kind: 'info', ic: 'book', title: `CMA ${App.CMA[k].name} in ${App.plural(d, 'day')}`, text: 'Check weak topics and mock tests', route: 'cma' });
      }
    }
    const t = App.T();
    if (new Date().getHours() >= 18 && App.waterMl() < t.waterMl * 0.5) out.push({ id: 'water', kind: 'info', ic: 'drop', title: 'Water is below half of your goal', text: `${r1(App.waterMl() / 1000)} of ${r1(t.waterMl / 1000)} L`, route: 'nutrition' });
    const due = App.recurringDue ? App.recurringDue() : [];
    if (due.length) out.push({ id: 'recur', kind: 'info', ic: 'refresh', title: `${App.plural(due.length, 'recurring item')} due this month`, text: 'Review and add them in Finance', route: 'money' });
    const dc = App.dubaiCalc();
    if (App.dubai().targetDate && dc.daysLeft !== null && dc.daysLeft < 0 && !dc.confirmed) out.push({ id: 'dubai', kind: 'info', ic: 'plane', title: 'Dubai target date has passed', text: 'Set a new target date or mark travel confirmed', route: 'dubai' });
    return out;
  };

  /* ---------- tomorrow's three priorities ---------- */
  App.tomorrowPriorities = (base = dkey()) => {
    const st = S();
    const tom = dkey(addDays(parseD(base), 1));
    const PRI = { high: 30, med: 15, low: 0 };
    const c = [];
    for (const t of st.todos.filter((x) => !x.done)) {
      if (t.due && t.due <= tom) c.push({ s: 100 + Math.max(0, daysBetween(t.due, tom)) * 5 + PRI[t.priority || 'med'], title: t.title, why: t.due < tom ? `Overdue since ${App.prettyDate(t.due)}` : 'Due tomorrow', route: 'goals', ref: 'todo:' + t.id });
      else if (!t.due && t.priority === 'high') c.push({ s: 40, title: t.title, why: 'High priority, no date', route: 'goals', ref: 'todo:' + t.id });
    }
    const tomWork = App.isWorkday(tom);
    for (const t of st.work.tasks.filter((x) => x.status !== 'done')) {
      if (t.due && t.due <= tom) c.push({ s: 95 + (tomWork ? 10 : 0) + Math.max(0, daysBetween(t.due, tom)) * 5 + PRI[t.priority || 'med'], title: t.title, why: `Work · ${t.due < tom ? 'overdue' : 'due tomorrow'}`, route: 'work', ref: 'work:' + t.id });
      else if (t.status === 'awaiting') c.push({ s: 35, title: `Follow up: ${t.title}`, why: 'Awaiting approval', route: 'work', ref: 'work:' + t.id });
    }
    for (const r of st.fees.records) {
      const k = App.feeCalc(r, tom);
      if (k.status === 'paid') continue;
      if (r.kind === 'pay' && r.due && daysBetween(tom, r.due) <= 2) c.push({ s: 90, title: `Pay ${App.inr(k.outstanding)}: ${r.description || r.party}`, why: `Due ${App.prettyDate(r.due)}`, route: 'fees', ref: 'fee:' + r.id });
      if (r.kind === 'collect' && k.status === 'overdue') c.push({ s: 70 + Math.min(20, k.daysOverdue), title: `Follow up with ${r.party} for ${App.inr(k.outstanding)}`, why: `${App.plural(k.daysOverdue, 'day')} overdue`, route: 'fees', ref: 'fee:' + r.id });
    }
    for (const gl of st.goals.filter((x) => !x.done && x.deadline)) {
      const d = daysBetween(tom, gl.deadline);
      if (d >= 0 && d <= 14) c.push({ s: 55, title: `Move "${gl.title}" forward`, why: `Goal deadline in ${App.plural(d, 'day')}`, route: 'goals', ref: 'goal:' + gl.id });
    }
    const cw = App.cmaWeek(weekStart(tom));
    if (cw.target && cw.minutes < cw.target) {
      const weak = App.cmaWeakSections()[0];
      const need = Math.max(30, Math.round((cw.target - cw.minutes) / Math.max(1, 7 - cw.elapsed + 1) / 15) * 15);
      c.push({ s: 60, title: `Study CMA ${weak ? weak.sec.name : ''} for ${App.fmtMin(need)}`.replace('  ', ' '), why: `${App.fmtMin(cw.minutes)} of ${App.fmtMin(cw.target)} this week`, route: 'cma', ref: 'cma' });
    }
    const gk = App.dayKeyFor(tom);
    if (gk !== 'rest') c.push({ s: 50, title: `${App.dayDef(gk).name} workout`, why: `Scheduled for ${App.DOW_LONG[parseD(tom).getDay()]}`, route: 'fitness', ref: 'gym' });
    const dc = App.dubaiCalc();
    if (dc.monthlyTarget > 0 && dc.thisMonth < dc.monthlyTarget) c.push({ s: 45, title: `Move ${App.inr(dc.monthlyTarget - dc.thisMonth)} to Dubai savings`, why: 'Monthly savings target not met yet', route: 'dubai', ref: 'dubai' });
    const seen = new Set();
    return c.sort((a, b) => b.s - a.s).filter((x) => (seen.has(x.ref) ? false : seen.add(x.ref))).slice(0, 3);
  };

  /* ---------- weekly review ---------- */
  App.weekStats = (start) => {
    const days = weekDays(start);
    const st = S();
    const t = App.T();
    const nd = days.map((d) => App.nutritionDay(d));
    const logged = nd.filter((n) => n.items > 0);
    const workouts = Object.entries(st.gym.logs).filter(([k, l]) => l.finished && days.includes(k.split('|')[0])).length;
    const planned = days.filter((d) => App.dayKeyFor(d) !== 'rest').length;
    const study = sum(App.cmaSessions(days[0], days[6]), (s) => s.minutes);
    const spend = sum(st.money.txns.filter((x) => days.includes(x.date)), (x) => (x.type === 'expense' ? x.amount : x.type === 'refund' ? -x.amount : 0));
    const socDays = days.filter((d) => st.social.logs[d]);
    const soc = sum(socDays, (d) => sum(Object.values(st.social.logs[d])));
    const ws = st.body.weights.filter((w) => days.includes(w.date));
    const tasks = st.todos.filter((x) => x.done && days.includes(x.doneAt)).length + st.work.tasks.filter((x) => x.status === 'done' && days.includes(x.doneAt)).length;
    const hours = sum(days, (d) => App.timesheetHours(st.work.timesheets[d]));
    return {
      start, days, loggedDays: logged.length,
      avgKcal: logged.length ? sum(logged, (n) => n.kcal) / logged.length : null,
      avgProtein: logged.length ? sum(logged, (n) => n.p) / logged.length : null,
      proteinDays: nd.filter((n) => n.p >= t.protein).length, kcalDays: nd.filter((n) => n.kcal >= t.kcal * 0.9).length,
      workouts, planned, study, spend, socAvg: socDays.length ? soc / socDays.length : null, socDays: socDays.length,
      weightAvg: ws.length ? sum(ws, (w) => w.kg) / ws.length : null, weightN: ws.length, tasks, hours,
    };
  };
  App.weekReview = (start = weekStart()) => {
    const prev = dkey(addDays(parseD(start), -7));
    const a = App.weekStats(start), b = App.weekStats(prev);
    const t = App.T();
    const obs = [];
    if (a.loggedDays) obs.push(`You logged food on ${a.loggedDays} of 7 days, averaging ${App.num(a.avgKcal)} kcal and ${Math.round(a.avgProtein)} g protein on those days.`);
    else obs.push('No food was logged this week, so nutrition trends are unavailable.');
    if (a.loggedDays) obs.push(`Protein target (${t.protein} g) was met on ${a.proteinDays} day${a.proteinDays === 1 ? '' : 's'}; calories reached 90% of goal on ${a.kcalDays}.`);
    obs.push(`Workouts finished: ${a.workouts} of ${a.planned} planned${b.workouts || b.planned ? ` (last week ${b.workouts}/${b.planned})` : ''}.`);
    if (a.weightAvg !== null && b.weightAvg !== null) {
      const d = a.weightAvg - b.weightAvg;
      obs.push(`Average weight ${r1(a.weightAvg)} kg, ${d >= 0 ? 'up' : 'down'} ${Math.abs(r1(d))} kg from last week's ${r1(b.weightAvg)} kg.`);
    } else if (a.weightAvg !== null) obs.push(`Average weight this week: ${r1(a.weightAvg)} kg (${App.plural(a.weightN, 'entry', 'entries')}). Log next week to see the change.`);
    const target = +S().cma.weeklyTargetMin || 0;
    obs.push(`CMA study: ${App.fmtMin(a.study)}${target ? ` of ${App.fmtMin(target)} target` : ''}${b.study ? `, vs ${App.fmtMin(b.study)} last week` : ''}.`);
    obs.push(`Spending: ${App.inr(a.spend)}${b.spend ? ` (${a.spend > b.spend ? 'more' : 'less'} than last week's ${App.inr(b.spend)})` : ''}.`);
    if (a.socAvg !== null) obs.push(`Social media averaged ${App.fmtMin(a.socAvg)} per logged day (${a.socDays} days logged).`);
    if (a.hours) obs.push(`Work hours on timesheets: ${r1(a.hours)} h. Tasks completed (personal + work): ${a.tasks}.`);
    return { a, b, obs };
  };

  /* ---------- achievements ---------- */
  App.unlock = (id, title, sub, ic = 'trophy') => {
    const st = S();
    if (st.achievements[id]) return false;
    st.achievements[id] = { date: dkey(), title, sub, ic };
    App.save();
    setTimeout(() => App.celebrate({ title, sub, ic }), 350);
    return true;
  };
})();
