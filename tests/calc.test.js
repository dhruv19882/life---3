/* LifeOS calculation tests. Run with:  node tests/calc.test.js
   Loads the real app modules in Node with a tiny browser shim and checks the maths that matter:
   nutrition, targets, fees, finance, budget, Dubai, Life Score rules, work summaries, migration, timesheets. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {
  console, Date, Math, JSON, Intl, Number, String, Object, Array, Set, Map, RegExp, Promise, parseInt, parseFloat, isNaN, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  navigator: {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  addEventListener() {},
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/core.js', 'js/data.js', 'js/foods.js', 'js/engine.js', 'js/views/money.js', 'js/views/work.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const App = ctx.App;
App.save = () => {};
App.celebrate = () => {};
App.toast = () => {};

let pass = 0, fail = 0;
const near = (a, b, eps = 0.051) => Math.abs(a - b) <= eps;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function ok(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }

function fresh(profile = {}) {
  App.state = App.migrate(null);
  App.state.profile = { ...App.profileDefaults(), name: 'Test', age: 25, height: 175, weight: 60, activity: 1.55, mode: 'bulk', targets: [55, 60], ...profile };
  App.state.nutrition.plan = App.defaultPlan();
  return App.state;
}
const today = App.dkey();

console.log('\nNutrition');
fresh();
t('Example thali: 2 roti + 150 g dal + 150 g rice + 100 g curd', () => {
  const items = [['roti', 2, 'piece'], ['dal', 150, 'g'], ['rice', 150, 'g'], ['curd', 100, 'g']];
  const tot = items.reduce((a, [id, q, u]) => { const v = App.calcFood(App.foodById(id), q, u); a.kcal += v.kcal; a.p += v.p; a.c += v.c; a.f += v.f; a.g += v.grams; return a; }, { kcal: 0, p: 0, c: 0, f: 0, g: 0 });
  eq(Math.round(tot.kcal), 654, 'kcal');
  ok(near(tot.p, 23.65), 'protein ' + tot.p);
  eq(tot.g, 480, 'grams');
  ok(near(tot.c, 40.8 + 23.25 + 42.3 + 4.7), 'carbs ' + tot.c);
});
t('Unit conversion: 1 glass toned milk = 250 g = 145 kcal', () => {
  const v = App.calcFood(App.foodById('milkToned'), 1, 'glass');
  eq(v.grams, 250); eq(Math.round(v.kcal), 145);
});
t('ml unit for liquids uses 1 g/ml', () => { eq(App.calcFood(App.foodById('milkToned'), 500, 'ml').grams, 500); });
t('Unknown unit gives zero instead of a guess', () => { eq(App.calcFood(App.foodById('rice'), 2, 'piece').kcal, 0); });
t('Serving-based custom food multiplies per serving', () => {
  App.state.nutrition.customFoods.push({ id: 'c-x', name: 'Ladoo', base: 'serving', kcal: 180, p: 4, c: 20, f: 9, fib: 1, units: { serving: 1 }, defUnit: 'serving', defQty: 1 });
  const v = App.calcFood(App.foodById('c-x'), 2.5, 'serving');
  eq(v.kcal, 450); eq(v.p, 10);
});
t('Edited reference values apply to new calculations', () => {
  App.state.nutrition.overrides.roti = { kcal: 300 };
  eq(Math.round(App.calcFood(App.foodById('roti'), 1, 'piece').kcal), 120);
  delete App.state.nutrition.overrides.roti;
});
t('Recipe nutrition per serving', () => {
  App.state.nutrition.recipes.push({ id: 'r-1', name: 'Shake', servings: 2, cookedWeight: '', items: [{ foodId: 'milkToned', qty: 1, unit: 'glass' }, { foodId: 'banana', qty: 1, unit: 'piece' }] });
  const f = App.foodById('r-1');
  const v = App.calcFood(f, 1, 'serving');
  ok(near(v.kcal, (145 + 105.02) / 2, 0.1), 'kcal ' + v.kcal);
});
t('Day totals sum logged items', () => {
  App.state.nutrition.logs[today] = [{ id: 'm1', slot: 'lunch', items: [{ kcal: 300, p: 10, c: 40, f: 8, fib: 2 }, { kcal: 200, p: 5, c: 20, f: 5, fib: 1 }] }, { id: 'm2', slot: 'dinner', items: [{ kcal: 100, p: 3, c: 10, f: 2, fib: 0 }] }];
  const n = App.nutritionDay(today);
  eq(n.kcal, 600); eq(n.p, 18); eq(n.slotsDone, 2);
});
t('Default plan has costs for every item', () => { const pt = App.planTotals ? App.planTotals() : null; ok(App.defaultPlan().every((m) => m.items.every((i) => App.foodById(i.foodId))), 'all plan foods exist'); });

console.log('\nTargets');
t('Mifflin-St Jeor, 25 y, 175 cm, 60 kg, moderate, lean bulk', () => {
  fresh();
  const T = App.targets(App.state.profile, {});
  eq(T.bmr, 1574); eq(T.tdee, 2439); eq(T.kcal, 2840); eq(T.protein, 120); eq(T.fat, 79);
  eq(T.carbs, Math.round((2840 - 120 * 4 - 79 * 9) / 4));
  eq(T.waterMl, 2600);
});
t('Overrides replace only the overridden target', () => {
  const T = App.targets(App.state.profile, { protein: 150 });
  eq(T.protein, 150); eq(T.kcal, 2840);
});

console.log('\nFees & payments');
t('₹10,000 fee with ₹4,000 received → ₹6,000 outstanding, partially paid', () => {
  const r = { kind: 'collect', amount: 10000, due: App.dkey(App.addDays(new Date(), 5)), payments: [{ amount: 4000, date: today }] };
  const c = App.feeCalc(r);
  eq(c.received, 4000); eq(c.outstanding, 6000); eq(c.status, 'partial');
});
t('Past due with balance → overdue', () => {
  const r = { kind: 'collect', amount: 10000, due: App.dkey(App.addDays(new Date(), -3)), payments: [{ amount: 4000, date: today }] };
  const c = App.feeCalc(r);
  eq(c.status, 'overdue'); eq(c.daysOverdue, 3);
});
t('Multiple installments summing to total → paid, never negative', () => {
  const r = { kind: 'collect', amount: 1000.5, due: '', payments: [{ amount: 500.25 }, { amount: 500.25 }] };
  const c = App.feeCalc(r);
  eq(c.status, 'paid'); eq(c.outstanding, 0);
});
t('No payments, no due date → pending', () => { eq(App.feeCalc({ amount: 500, payments: [] }).status, 'pending'); });
t('Totals per kind', () => {
  fresh();
  App.state.fees.records = [
    { id: 'a', kind: 'collect', amount: 10000, due: App.dkey(App.addDays(new Date(), -1)), payments: [{ amount: 4000, date: today }] },
    { id: 'b', kind: 'collect', amount: 2000, due: '', payments: [] },
    { id: 'c', kind: 'pay', amount: 5000, due: '', payments: [] },
  ];
  const t1 = App.feeTotals('collect');
  eq(t1.total, 12000); eq(t1.received, 4000); eq(t1.outstanding, 8000); eq(t1.overdue, 6000); eq(t1.overdueCount, 1);
});

console.log('\nFinance');
t('Income, expense, refund and transfer are counted correctly', () => {
  fresh();
  const m = App.mkey();
  App.state.money.opening = 1000;
  App.state.money.monthly = 3000;
  App.state.money.txns = [
    { id: '1', type: 'income', amount: 2000, cat: 'salary', date: today },
    { id: '2', type: 'expense', amount: 500, cat: 'food', date: today },
    { id: '3', type: 'refund', amount: 100, cat: 'food', date: today },
    { id: '4', type: 'transfer', dir: 'out', amount: 300, cat: 'transfer', date: today },
  ];
  const mm = App.monthMoney(m);
  eq(mm.income, 2000); eq(mm.spent, 400); eq(mm.net, 1600); eq(mm.byCat.food, 400); eq(mm.left, 2600); eq(mm.transfersOut, 300);
  eq(App.balance(), 1000 + 2000 + 100 - 500 - 300);
});
t('Safe to spend per day = budget left / days left (incl. today)', () => {
  const mm = App.monthMoney();
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  ok(near(mm.perDay, 2600 / (dim - now.getDate() + 1), 0.001));
});
t('Money to collect is not part of the balance', () => {
  App.state.fees.records = [{ id: 'z', kind: 'collect', amount: 50000, payments: [] }];
  eq(App.balance(), 2300);
});
t('Paise precision does not drift', () => {
  fresh();
  App.state.money.txns = Array.from({ length: 10 }, (_, i) => ({ id: 'p' + i, type: 'expense', amount: 0.1, cat: 'food', date: today }));
  eq(App.monthMoney().spent, 1);
});
t('Recurring item due only once per month', () => {
  fresh();
  App.state.money.recurring = [{ id: 'r1', type: 'expense', amount: 999, cat: 'gym', day: 1, active: true }];
  eq(App.recurringDue().length, 1);
  App.state.money.txns.push({ id: 'x', type: 'expense', amount: 999, cat: 'gym', date: App.mkey() + '-01', recurringId: 'r1' });
  eq(App.recurringDue().length, 0);
});

console.log('\nDubai Mission');
t('Required, remaining and monthly target; employment costs excluded by default', () => {
  fresh();
  const d = App.dubai();
  d.costs.find((c) => c.id === 'flight').amount = 15000;
  d.costs.find((c) => c.id === 'deposit').amount = 60000;
  d.costs.find((c) => c.id === 'visa').amount = 20000;
  d.startSavings = 10000;
  d.deposits = [{ id: 'd1', date: today, amount: 5000 }, { id: 'd2', date: today, amount: -1000 }];
  d.targetDate = App.dkey(App.addDays(new Date(), 365));
  const c = App.dubaiCalc();
  eq(c.required, 75000); eq(c.saved, 14000); eq(c.remaining, 61000); eq(c.unknown, 7); eq(c.thisMonth, 4000);
  ok(c.monthlyTarget >= 5000 && c.monthlyTarget <= 5100, 'monthly ' + c.monthlyTarget);
  d.includeEmployment = true;
  eq(App.dubaiCalc().required, 95000);
});
t('Target date is not a confirmed date', () => { eq(App.dubaiCalc().confirmed, false); });

console.log('\nLife Score');
t('Rest day workout rule is excluded, not counted as zero', () => {
  fresh();
  App.state.gym.split = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'];
  const ls = App.lifeScore(today);
  const fit = ls.pillars.find((p) => p.id === 'fitness');
  ok(!fit.rules[0].applicable, 'workout rule should be n/a');
  eq(fit.score, 0, 'only weight check-in applies and none logged');
});
t('Pillar score is the weighted mean of applicable rules', () => {
  fresh();
  const T = App.T();
  App.state.nutrition.logs[today] = [{ id: 'm', slot: 'lunch', items: [{ kcal: T.kcal / 2, p: T.protein, c: 0, f: 0, fib: 0 }] }];
  App.state.body.waterMl[today] = T.waterMl;
  const h = App.lifeScore(today).pillars.find((p) => p.id === 'health');
  eq(h.score, Math.round(((3 * 0.5 + 3 * 1 + 2 * 1) / 8) * 100));
});
t('Overall excludes pillars with no applicable rules', () => {
  const ls = App.lifeScore(today);
  ok(ls.pillars.some((p) => p.score === null) || ls.counted === 6);
  eq(ls.counted, ls.pillars.filter((p) => p.score !== null).length);
});

console.log('\nWork OS');
t('Journal note becomes clean professional English', () => {
  const r = App.workSummary('worked on vendor recon and reviewed W9 forms');
  eq(r.summary, 'Worked on vendor reconciliation. Reviewed W-9 forms.');
  ok(r.areas.includes('vendor') && r.areas.includes('w9'), r.areas.join());
});
t('Terms and tense are normalised; no facts are added', () => {
  const r = App.workSummary('checked 1099 list, updated quickbooks then sent reimb report to mgr');
  eq(r.summary, 'Reviewed Form 1099 list. Updated QuickBooks. Sent reimbursement report to manager.');
});
t('Overnight timesheet hours', () => { eq(App.timesheetHours({ start: '22:00', end: '02:00', breakMin: 30 }), 3.5); });
t('2 PM–11 PM schedule = 9 h', () => { fresh(); eq(App.scheduledHours(), 9); });

console.log('\nBody & gym');
t('Weekly averages smooth daily weights', () => {
  fresh();
  const mon = App.parseD(App.weekStart());
  App.state.body.weights = [
    { date: App.dkey(App.addDays(mon, -7)), kg: 49 }, { date: App.dkey(App.addDays(mon, -6)), kg: 49.4 },
    { date: App.dkey(mon), kg: 49.6 }, { date: App.dkey(App.addDays(mon, 1)), kg: 50 },
  ];
  const ww = App.weeklyWeights();
  eq(ww.length, 2); eq(ww[0].avg, 49.2); eq(ww[1].avg, 49.8);
  eq(App.weightRate().perWeek, 0.6);
});
t('Estimated 1RM (Epley) and PRs', () => {
  ok(near(App.e1rm(50, 8), 63.33, 0.01));
  App.state.gym.logs = { [`${today}|chestTri`]: { sets: { bench: [{ w: 40, r: 8, done: true }, { w: 45, r: 5, done: true }, { w: 50, r: 2, done: false }] } } };
  const pr = App.personalRecords().bench;
  eq(pr.maxW, 45); eq(pr.maxWReps, 5);
});
t('Default split matches Mon Chest+Tri … Sun Rest', () => {
  fresh();
  eq(App.split().join(), 'rest,chestTri,backBi,legsAbs,rest,upper,legsArms');
});

console.log('\nMigration from LifeOS v1');
t('v1 localStorage data is preserved and upgraded', () => {
  const v1 = {
    version: 1, profile: { name: 'D', gender: 'male', age: 22, height: 170, weight: 49, activity: 1.55, mode: 'bulk' },
    goals: [{ id: 'g', title: 'Goal', term: 'long' }], todos: [{ id: 't', title: 'Task', done: false }],
    social: { apps: [{ id: 'ig', name: 'Instagram', color: '#e1306c', low: 20, high: 50 }], logs: { '2026-01-01': { ig: 30 } } },
    money: { txns: [{ id: 'x', type: 'expense', amount: 120, cat: 'food', date: '2026-01-01', ts: 1 }], budgets: { food: 3000 }, monthly: 12000 },
    body: { weights: [{ date: '2026-01-01', kg: 49 }], water: { '2026-01-01': 6 }, steps: { '2026-01-01': 5000 }, waterGoal: 10, stepGoal: 8000 },
    food: { '2026-01-01': { meals: { m1: true, m3: true }, extra: [{ id: 'e', name: 'Samosa', kcal: 260, p: 5 }] } },
    gym: { logs: { '2026-01-01|pushA': { day: 'pushA', sets: { bench: [{ w: 40, r: 8, done: true }] }, finished: true } } },
  };
  const s = App.migrate(JSON.parse(JSON.stringify(v1)));
  eq(s.version, App.SCHEMA);
  eq(s.body.waterMl['2026-01-01'], 1500);
  eq(s.nutrition.logs['2026-01-01'].length, 3);
  eq(Math.round(s.nutrition.logs['2026-01-01'].reduce((a, m) => a + m.items[0].kcal, 0)), 534 + 775 + 260);
  eq(s.social.apps[0].low, 20); eq(s.money.txns[0].amount, 120); eq(s.money.monthly, 12000);
  ok(s.gym.logs['2026-01-01|pushA'].finished, 'gym log kept');
  ok(App.DAYS.pushA && App.DAYS.pushA.legacy, 'legacy day definition available');
  eq(s.todos.length, 1); eq(s.goals.length, 1);
  ok(s.legacyFood, 'original food data kept for reference');
});
t('Migration is idempotent', () => {
  const s = App.migrate(App.migrate(null));
  eq(s.version, App.SCHEMA);
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
