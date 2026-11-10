'use strict';
/* Nutrition coach: daily targets & animated rings, today's meals, editable low-budget meal plan, grocery lists. */
(function () {
  const { icon, esc, dkey, uid, r1, inr, sum } = App;
  App.ui.nutritionTab = 'today';
  const N = () => App.state.nutrition;

  function render() {
    const tab = App.ui.nutritionTab;
    return `${App.back()}
      ${App.header('Nutrition', 'Daily coach', `<button class="icon-btn lg" data-act="openPicker" aria-label="Log food">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('nutritionTab', [{ value: 'today', label: 'Today' }, { value: 'plan', label: 'Meal plan' }, { value: 'grocery', label: 'Grocery' }, { value: 'targets', label: 'Targets' }], tab)}</div>
      <div class="mt12">${({ today: renderToday, plan: renderPlan, grocery: renderGrocery, targets: renderTargets })[tab]()}</div>
      <div class="tabbar-space"></div>`;
  }

  function renderToday() {
    const t = App.T();
    const n = App.nutritionDay();
    const water = App.waterMl();
    const remK = t.kcal - n.kcal, remP = t.protein - n.p;
    const kcalFrom = { p: n.p * 4, c: n.c * 4, f: n.f * 9 };
    const tot = kcalFrom.p + kcalFrom.c + kcalFrom.f || 1;
    const macro = (label, val, goal, grad, unit = 'g') => `<div class="macro">${App.ring(goal ? val / goal : 0, { size: 66, stroke: 7, grad, label: `<b class="small">${Math.round(val)}</b>` })}<small>${label}</small><span class="muted">${goal}${unit}</span></div>`;
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="hero-main">
          ${App.rings([{ pct: n.kcal / t.kcal, grad: 'lime' }, { pct: n.p / t.protein, grad: 'sky' }, { pct: water / t.waterMl, grad: 'mint' }], { size: 150, stroke: 13, gap: 4, center: `${App.count(n.kcal)}<small>kcal eaten</small>` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:var(--lime)"></span><div><b>${remK >= 0 ? App.num(remK) : '+' + App.num(-remK)} kcal</b><small>${remK >= 0 ? 'Calories remaining' : 'Over calorie goal'}</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--sky)"></span><div><b>${remP >= 0 ? Math.round(remP) : 0} g</b><small>Protein remaining</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--mint)"></span><div><b>${n.slotsDone}/4</b><small>Meals completed</small></div></div>
          </div>
        </div>
        <div class="macros">${macro('Protein', n.p, t.protein, 'sky')}${macro('Carbs', n.c, t.carbs, 'lime')}${macro('Fat', n.f, t.fat, 'amber')}${macro('Water', water / 1000, r1(t.waterMl / 1000), 'mint', ' L')}</div>
        <div class="mt16"><div class="row between small"><span class="muted">Daily balance (share of calories)</span><span>P ${Math.round((kcalFrom.p / tot) * 100)}% · C ${Math.round((kcalFrom.c / tot) * 100)}% · F ${Math.round((kcalFrom.f / tot) * 100)}%</span></div>
          <div class="bar thick" style="display:flex"><span class="bar-fill grad-sky" style="--w:${(kcalFrom.p / tot) * 100}%;border-radius:0"></span><span class="bar-fill grad-lime" style="--w:${(kcalFrom.c / tot) * 100}%;border-radius:0"></span><span class="bar-fill grad-amber" style="--w:${(kcalFrom.f / tot) * 100}%;border-radius:0"></span></div>
          <p class="muted tiny mt4">Target split: P ${Math.round((t.protein * 4 / t.kcal) * 100)}% · C ${Math.round((t.carbs * 4 / t.kcal) * 100)}% · F ${Math.round((t.fat * 9 / t.kcal) * 100)}%${n.fib ? ` · Fibre ${r1(n.fib)} g` : ''}</p></div>
      </section>

      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('drop')}Water</h3><span class="muted small">${r1(water / 1000)} / ${r1(t.waterMl / 1000)} L</span></div>
        <div class="glasses">${Array.from({ length: Math.ceil(t.waterMl / 250) }, (_, i) => `<span class="glass ${water >= (i + 1) * 250 ? 'full' : water > i * 250 ? 'half' : ''}" style="--d:${i * 30}ms"></span>`).join('')}</div>
        <div class="row gap mt12"><button class="btn btn-ghost" data-act="addWater" data-ml="-250" aria-label="Remove 250 ml">${icon('minus')}</button>
          <button class="btn btn-soft grow" data-act="addWater" data-ml="250">+250 ml</button><button class="btn btn-primary grow" data-act="addWater" data-ml="500">+500 ml</button></div>
      </section>

      ${App.SLOTS.map((s, i) => {
        const meals = n.meals.filter((m) => m.slot === s.id);
        const k = sum(meals, (m) => sum(m.items, (x) => x.kcal));
        return `<section class="card meal-block reveal" style="--i:${i + 3}">
          <div class="row between"><b>${s.e} ${s.label}</b><div class="row gap-s"><span class="muted small">${Math.round(k)} kcal</span><button class="btn btn-soft xs" data-act="logSlot" data-slot="${s.id}">${icon('plus')}Add</button></div></div>
          ${meals.length ? `<div class="mt8">${meals.map((m) => App.mealRow(m, dkey())).join('')}</div>` : ''}
        </section>`;
      }).join('')}
      <p class="section-note">${icon('info')}<span>Calculations use the logged quantity × reference values per 100 g. Estimates, not lab measurements.</span></p>`;
  }

  /* ---------- meal plan ---------- */
  const plan = () => (N().plan = N().plan || App.defaultPlan());
  function planMealTotals(m) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, cost: 0, costKnown: true };
    for (const it of m.items) {
      const f = App.foodById(it.foodId);
      if (!f) continue;
      const v = App.calcFood(f, it.qty, it.unit);
      t.kcal += v.kcal; t.p += v.p; t.c += v.c; t.f += v.f;
      const c = App.costOf(f, v.grams);
      if (c === null) t.costKnown = false; else t.cost += c;
    }
    return t;
  }
  App.planTotals = () => {
    const out = { kcal: 0, p: 0, c: 0, f: 0, cost: 0, costKnown: true };
    for (const m of plan()) { const t = planMealTotals(m); for (const k of ['kcal', 'p', 'c', 'f', 'cost']) out[k] += t[k]; if (!t.costKnown) out.costKnown = false; }
    return out;
  };

  function renderPlan() {
    const t = App.T();
    const pt = App.planTotals();
    return `
      <section class="card hero reveal" style="--i:1">
        <span class="eyebrow">Low-budget Indian weight-gain plan</span>
        <div class="row between mt8"><div><span class="huge">${App.num(pt.kcal)}</span> <span class="muted">kcal / day</span></div><span class="badge ok">${inr(pt.cost)}/day${pt.costKnown ? '' : '*'}</span></div>
        <div class="stat-row four">${App.stat('Protein', `${Math.round(pt.p)} g`, `goal ${t.protein}`)}${App.stat('Carbs', `${Math.round(pt.c)} g`)}${App.stat('Fat', `${Math.round(pt.f)} g`)}${App.stat('vs goal', `${pt.kcal >= t.kcal ? '+' : ''}${App.num(pt.kcal - t.kcal)}`, 'kcal')}</div>
        <p class="muted small mt12">Food cost is estimated from editable grocery prices (main ingredients and oil). ${pt.costKnown ? '' : '*Some items have no price mapping.'}</p>
      </section>
      ${plan().slice().sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((m, i) => {
        const mt = planMealTotals(m);
        return `<article class="card reveal" style="--i:${i + 2}">
          <div class="row between top"><div><small class="muted">${esc(App.fmtClock(m.time || '12:00'))} · ${esc(App.SLOTS.find((s) => s.id === m.slot)?.label || '')}</small><b class="block">${esc(m.name)}</b>
            <small><b>${Math.round(mt.kcal)} kcal</b> · <span class="accent-t">${r1(mt.p)} g protein</span> · ${inr(mt.cost)}</small></div>
            <div class="row gap-s"><button class="icon-btn sm" data-act="editPlanMeal" data-id="${m.id}" aria-label="Edit">${icon('edit')}</button><button class="btn btn-primary xs" data-act="logPlanMeal" data-id="${m.id}">${icon('check')}Log</button></div></div>
          <ul class="list mt8" style="list-style:none">${m.items.map((it) => { const f = App.foodById(it.foodId); if (!f) return ''; const v = App.calcFood(f, it.qty, it.unit); return `<li class="li" style="padding:7px 0"><span class="grow small">${esc(f.emoji)} ${esc(f.name)} <span class="muted">${it.qty} ${App.unitLabel(it.unit, it.qty)}</span></span><small class="muted">${Math.round(v.kcal)} kcal · ${r1(v.p)} g</small></li>`; }).join('')}</ul>
          ${m.how ? `<p class="muted small mt8">${icon('info')} ${esc(m.how)}</p>` : ''}${m.swap ? `<p class="muted small mt4">🔁 ${esc(m.swap)}</p>` : ''}
        </article>`;
      }).join('')}
      <div class="row gap"><button class="btn btn-soft grow" data-act="addPlanMeal">${icon('plus')}Add meal</button><button class="btn btn-ghost" data-act="resetPlan">${icon('refresh')}Reset</button></div>
      <section class="card mt12 reveal">
        <div class="card-head"><h3>${icon('spark')}Weight-gain rules</h3></div>
        <ul class="rules small" style="padding-left:18px;display:grid;gap:6px">
          <li>Aim for +0.25 to 0.5 kg per week (weekly average, not daily scale readings).</li>
          <li>No gain for 2 weeks? Add ~200 kcal: a glass of milk + banana, or 2 more rotis.</li>
          <li>Gaining faster than 0.75 kg/week? Remove ~150 kcal.</li>
          <li>Values and prices are approximate. If you have a medical condition, check with a doctor or dietitian.</li>
        </ul>
      </section>`;
  }

  function planMealSheet(m) {
    const isNew = !m;
    App.ui.planEdit = m ? JSON.parse(JSON.stringify(m)) : { id: 'pm-' + uid(), slot: App.slotForNow(), time: '12:00', name: '', items: [], how: '', swap: '' };
    drawPlanSheet(isNew);
  }
  function drawPlanSheet(isNew) {
    const m = App.ui.planEdit;
    const foods = App.allFoods().filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    const mt = planMealTotals(m);
    App.sheet({
      title: isNew ? 'Add plan meal' : 'Edit plan meal',
      body: `${App.field('Name', App.input('name', { value: m.name, required: true, placeholder: 'e.g. Pre-workout', attrs: 'data-input="planField" data-f="name"' }))}
        <div class="grid2">${App.field('Time', App.input('time', { type: 'time', value: m.time, attrs: 'data-input="planField" data-f="time"' }))}
        ${App.field('Meal', App.select('slot', App.SLOTS.map((s) => ({ value: s.id, label: s.label })), m.slot, 'data-change="planSlot"'))}</div>
        <h4 class="group-title">Foods<span>${Math.round(mt.kcal)} kcal · ${r1(mt.p)} g P · ${inr(mt.cost)}</span></h4>
        ${m.items.map((it, i) => { const f = App.foodById(it.foodId); return f ? `<div class="sel-item"><span class="sel-art art-meals">${esc(f.emoji)}</span><div><b class="small">${esc(f.name)}</b>
          <div class="qty-row"><input class="inp" type="number" min="0" step="any" value="${it.qty}" data-input="planQty" data-i="${i}" aria-label="Quantity">${App.select('', Object.keys(f.units).map((u) => ({ value: u, label: App.unitLabel(u, 2) })), it.unit, `data-change="planUnit" data-i="${i}"`)}</div></div>
          <button type="button" class="icon-btn sm" data-act="planDel" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>` : ''; }).join('')}
        <div class="qty-row mt8"><select class="inp" id="planAddSel" style="flex:1;width:auto">${foods.map((f) => `<option value="${f.id}">${esc(f.emoji)} ${esc(f.name)}</option>`).join('')}</select><button type="button" class="btn btn-soft sm" data-act="planAdd">${icon('plus')}Add</button></div>
        ${App.field('How to prepare', App.textarea('how', m.how, { rows: 2, attrs: 'data-input="planField" data-f="how"' }))}
        ${App.field('Vegetarian / budget swap', App.textarea('swap', m.swap, { rows: 2, attrs: 'data-input="planField" data-f="swap"' }))}`,
      danger: isNew ? null : { act: 'delPlanMeal', label: 'Delete', attrs: `data-id="${m.id}"` },
      onSubmit: () => {
        if (!m.name.trim()) { App.toast('Give the meal a name', 'bad'); return false; }
        const list = plan();
        const i = list.findIndex((x) => x.id === m.id);
        if (i >= 0) list[i] = m; else list.push(m);
        App.toast('Meal plan updated');
        App.commit();
      },
    });
  }
  const redrawPlan = () => drawPlanSheet(!plan().some((x) => x.id === App.ui.planEdit.id));
  App.inputs.planField = (el) => { App.ui.planEdit[el.dataset.f] = el.value; };
  App.changes.planSlot = (el) => { App.ui.planEdit.slot = el.value; };
  App.inputs.planQty = (el) => { App.ui.planEdit.items[+el.dataset.i].qty = +el.value || 0; };
  App.changes.planUnit = (el) => { App.ui.planEdit.items[+el.dataset.i].unit = el.value; redrawPlan(); };
  App.actions.planAdd = () => { const f = App.foodById(document.getElementById('planAddSel').value); if (f) { App.ui.planEdit.items.push({ foodId: f.id, qty: f.defQty, unit: f.defUnit }); redrawPlan(); } };
  App.actions.planDel = (el) => { App.ui.planEdit.items.splice(+el.dataset.i, 1); redrawPlan(); };
  App.actions.addPlanMeal = () => planMealSheet(null);
  App.actions.editPlanMeal = (el) => planMealSheet(plan().find((x) => x.id === el.dataset.id));
  App.actions.delPlanMeal = (el) => { if (!App.confirm('Remove this meal from the plan?')) return; N().plan = plan().filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.resetPlan = () => { if (!App.confirm('Replace your meal plan with the default plan?')) return; N().plan = App.defaultPlan(); App.commit(); };
  App.actions.logPlanMeal = (el) => { const m = plan().find((x) => x.id === el.dataset.id); if (m) App.openFoodPicker({ items: m.items.filter((x) => App.foodById(x.foodId)), slot: m.slot, step: 'review' }); };
  App.actions.logSlot = (el) => App.openFoodPicker({ slot: el.dataset.slot });

  /* ---------- grocery ---------- */
  App.groceryList = (days) => {
    const agg = {};
    for (const m of plan()) for (const it of m.items) {
      const f = App.foodById(it.foodId);
      if (!f || !f.grocery) continue;
      const g = App.calcFood(f, it.qty, it.unit).grams * days;
      for (const [k, fac] of f.grocery) agg[k] = (agg[k] || 0) + g * fac;
    }
    return Object.entries(agg).map(([k, raw]) => {
      const gi = App.GROCERY[k];
      const qty = gi.unit === 'pc' ? Math.ceil(raw / gi.pcg) : raw / 1000;
      const cost = gi.unit === 'pc' ? qty * App.grocPrice(k) : qty * App.grocPrice(k);
      return { k, name: gi.name, unit: gi.unit, qty, cost };
    }).sort((a, b) => b.cost - a.cost);
  };
  const fmtQty = (g) => (g.unit === 'pc' ? `${g.qty} pcs` : g.qty < 1 ? `${Math.round(g.qty * 1000)} ${g.unit === 'L' ? 'ml' : 'g'}` : `${r1(g.qty)} ${g.unit}`);

  function renderGrocery() {
    const wk = App.groceryList(7), mo = App.groceryList(30);
    const list = (l) => `<div class="list">${l.map((g) => `<div class="li"><span class="grow"><b>${esc(g.name)}</b><span class="sub">${fmtQty(g)}</span></span><span class="li-amt">${inr(g.cost)}</span></div>`).join('')}</div>`;
    const pr = (id) => App.foodById(id);
    const prot = App.allFoods().filter((f) => f && f.builtin && f.grocery.length && f.p >= 5).map((f) => {
      const c = App.costOf(f, 100);
      return { f, per10: c ? (f.p / c) * 10 : 0 };
    }).filter((x) => x.per10 > 0).sort((a, b) => b.per10 - a.per10).slice(0, 8);
    const swap = (a, aq, au, b, bq, bu) => {
      const fa = pr(a), fb = pr(b);
      const va = App.calcFood(fa, aq, au), vb = App.calcFood(fb, bq, bu);
      return `<div class="li"><span class="grow small">${esc(fa.emoji)} ${aq} ${App.unitLabel(au, aq)} ${esc(fa.name)} <span class="muted">${r1(va.p)} g P · ${inr(App.costOf(fa, va.grams))}</span><br>→ ${esc(fb.emoji)} ${bq} ${App.unitLabel(bu, bq)} ${esc(fb.name)} <span class="muted">${r1(vb.p)} g P · ${inr(App.costOf(fb, vb.grams))}</span></span></div>`;
    };
    return `
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('cal')}Weekly grocery list</h3><b>${inr(sum(wk, (g) => g.cost))}</b></div>${list(wk)}</section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('cal')}Monthly grocery list (30 days)</h3><b>${inr(sum(mo, (g) => g.cost))}</b></div>${list(mo)}
        <button class="btn btn-ghost btn-block mt12" data-act="editPrices">${icon('edit')}Edit grocery prices</button></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('zap')}Most protein per ₹10</h3></div>
        <div class="list">${prot.map(({ f, per10 }) => `<div class="li"><span class="sel-art art-gain">${esc(f.emoji)}</span><span class="grow"><b>${esc(f.name)}</b><span class="sub">${r1(f.p)} g protein / 100 g</span></span><span class="li-amt">${r1(per10)} g</span></div>`).join('')}</div>
        <p class="field-hint">Calculated from the library values and your grocery prices.</p></section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('swap')}Vegetarian alternatives</h3></div>
        <div class="list">${swap('egg', 3, 'piece', 'paneer', 100, 'g')}${swap('egg', 3, 'piece', 'soyaDry', 40, 'g')}${swap('chickenCurry', 1, 'bowl', 'soyaCurry', 1, 'bowl')}${swap('chickenBreast', 100, 'g', 'rajma', 1, 'bowl')}</div></section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('spark')}Protein-rich suggestions</h3></div>
        <div class="list">${App.PROTEIN_TIPS.map((x) => `<div class="li"><span class="grow"><b>${esc(x.t)}</b><span class="sub">${esc(x.d)}</span></span><button class="qadd" data-act="quickAdd" data-id="${x.ids[0]}" aria-label="Log ${esc(x.t)}">${icon('plus')}</button></div>`).join('')}</div></section>`;
  }
  App.actions.editPrices = () => {
    const keys = Object.keys(App.GROCERY);
    App.sheet({
      title: 'Grocery prices (₹)',
      body: `<p class="muted small mb12">Set the prices you pay locally. Per kg, per litre, or per piece.</p><div class="budget-grid">${keys.map((k) => { const g = App.GROCERY[k]; return `<label class="budget-row"><span>${esc(g.name)} <small class="muted">/ ${g.unit === 'pc' ? 'piece' : g.unit}</small></span><input class="inp sm" type="number" min="0" step="0.5" inputmode="decimal" name="p_${k}" value="${App.grocPrice(k)}"></label>`; }).join('')}</div>`,
      onSubmit: (d) => {
        const pr = (N().prices = {});
        for (const k of keys) { const v = +d['p_' + k]; if (d['p_' + k] !== '' && v >= 0 && v !== App.GROCERY[k].price) pr[k] = v; }
        App.toast('Prices saved');
        App.commit();
      },
    });
  };

  /* ---------- targets ---------- */
  function renderTargets() {
    const p = App.state.profile;
    const t = App.T();
    const act = App.ACTIVITY.find((a) => +a.id === +p.activity) || { label: 'Custom' };
    const o = N().targets || {};
    const row = (k, label, auto, unit) => `<div class="li"><span class="grow"><b>${label}</b><span class="sub">${o[k] ? `Your override · calculated ${auto}${unit}` : 'Calculated'}</span></span><span class="li-amt">${t[k === 'waterMl' ? 'waterMl' : k]}${unit}</span></div>`;
    return `
      <section class="card reveal" style="--i:1">
        <div class="card-head"><h3>${icon('target')}Daily targets</h3><button class="link" data-act="editTargets">Edit ${icon('edit')}</button></div>
        <div class="list">${row('kcal', 'Calories', t.autoKcal, ' kcal')}${row('protein', 'Protein', Math.round(p.weight * t.mode.protein), ' g')}${row('carbs', 'Carbohydrates', '', ' g')}${row('fat', 'Fat', '', ' g')}${row('waterMl', 'Water', '', ' ml')}</div>
      </section>
      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('info')}How it is calculated</h3></div>
        <div class="formula">BMR (Mifflin-St Jeor) = 10 × ${p.weight} kg + 6.25 × ${p.height} cm − 5 × ${p.age} ${p.gender === 'female' ? '− 161' : '+ 5'} = <b>${App.num(t.bmr)}</b><br>
          Maintenance = BMR × ${p.activity} (${esc(act.label)}) = <b>${App.num(t.tdee)}</b> kcal<br>
          Goal (${esc(t.mode.label)}) ${t.mode.surplus >= 0 ? '+' : ''}${t.mode.surplus} kcal → <b>${App.num(t.autoKcal)}</b> kcal<br>
          Protein = ${t.mode.protein} g × ${p.weight} kg · Fat = 25% of calories · Carbs = remainder<br>
          Water = 35 ml × kg + 500 ml for training</div>
        <p class="field-hint">Change weight, activity or goal in Settings → Profile. Targets update automatically unless you override them.</p>
      </section>`;
  }
  App.actions.editTargets = () => {
    const o = N().targets || {};
    const auto = App.targets(App.state.profile, {});
    const f = (k, label, unit) => App.field(`${label} (${unit})`, App.input(k, { type: 'number', value: o[k] || '', placeholder: `Auto: ${auto[k]}`, min: 0, inputmode: 'numeric' }));
    App.sheet({
      title: 'Override targets',
      body: `<p class="muted small mb12">Leave a field empty to use the calculated value.</p><div class="grid2">${f('kcal', 'Calories', 'kcal')}${f('protein', 'Protein', 'g')}${f('carbs', 'Carbs', 'g')}${f('fat', 'Fat', 'g')}${f('waterMl', 'Water', 'ml')}</div>`,
      onSubmit: (d) => {
        const out = {};
        for (const k of ['kcal', 'protein', 'carbs', 'fat', 'waterMl']) if (+d[k] > 0) out[k] = Math.round(+d[k]);
        N().targets = out;
        App.toast('Targets saved');
        App.commit();
      },
    });
  };

  App.actions.nutritionTab = (el) => { App.ui.nutritionTab = el.dataset.v; App.render({ quiet: true }); };
  App.views.nutrition = { render };
})();
