'use strict';
/* Food Library (searchable visual gallery) and the meal logger:
   pick multiple foods → set quantities in g / pieces / cups / ml / servings → see totals instantly → save.
   Photo support is a LOCAL matching workflow: LifeOS does not identify food from pixels offline.
   You pick what is on the plate; the photo is kept with the meal as a reference. */
(function () {
  const { icon, esc, dkey, uid, r1 } = App;
  App.ui.foodTab = 'foods';
  App.ui.libCat = 'all';
  App.ui.libQ = '';

  const N = () => App.state.nutrition;
  const artCls = (f) => 'art-' + ((f.cats || ['meals']).find((c) => c !== 'gain') || f.cats[0] || 'meals');
  const isFav = (id) => N().favourites.includes(id);
  const servingText = (f) => `${f.defQty} ${App.unitLabel(f.defUnit, f.defQty)}`;
  const servingCalc = (f) => App.calcFood(f, f.defQty, f.defUnit);
  const unitsOf = (f) => Object.keys(f.units || { g: 1 });

  function matches(f, q) {
    if (!q) return true;
    const s = q.toLowerCase().trim();
    return f.name.toLowerCase().includes(s) || f.id.toLowerCase().includes(s) || (f.cats || []).some((c) => c.includes(s));
  }

  function filtered(cat, q) {
    const n = N();
    let list = App.allFoods().filter(Boolean);
    if (cat === 'fav') list = list.filter((f) => isFav(f.id));
    else if (cat === 'recent') list = n.recent.map((id) => App.foodById(id)).filter(Boolean);
    else if (cat !== 'all') list = list.filter((f) => (f.cats || []).includes(cat));
    return list.filter((f) => matches(f, q));
  }

  function foodCard(f, i, { selCount = 0, act = 'foodDetail' } = {}) {
    const v = servingCalc(f);
    return `<div class="food-card ${selCount ? 'sel' : ''}" style="--i:${Math.min(i, 24)}" data-id="${f.id}">
      <button class="fav-btn ${isFav(f.id) ? 'on' : ''}" data-act="toggleFav" data-id="${f.id}" aria-label="Favourite">${icon('star')}</button>
      ${selCount ? `<span class="sel-count">${selCount}</span>` : ''}
      <button class="ta-l" data-act="${act}" data-id="${f.id}" style="display:block;width:100%">
        <div class="food-art ${artCls(f)}"><span>${esc(f.emoji || '🍽️')}</span></div>
        <div class="food-name">${esc(f.name)}</div>
      </button>
      <div class="food-meta"><div><b>${Math.round(v.kcal)} kcal</b><small>${r1(v.p)} g protein · ${esc(servingText(f))}</small></div>
        <button class="qadd" data-act="quickAdd" data-id="${f.id}" aria-label="Add ${esc(f.name)}">${icon('plus')}</button></div>
    </div>`;
  }

  const catChips = (cur, act) => `<div class="cat-scroll">${[{ id: 'all', label: 'All', e: '✨' }, { id: 'fav', label: 'Favourites', e: '⭐' }, { id: 'recent', label: 'Recent', e: '🕘' }, ...App.FOOD_CATS]
    .map((c) => `<button type="button" class="cat-chip ${cur === c.id ? 'on' : ''}" data-act="${act}" data-c="${c.id}"><span>${c.e}</span>${esc(c.label)}</button>`).join('')}</div>`;

  /* ================= Food Library page ================= */
  function render() {
    const tab = App.ui.foodTab;
    const n = N();
    const head = `${App.back()}
      ${App.header('Food Library', `${Object.keys(App.BUILTIN_FOODS).length} Indian foods · works offline`, `<button class="icon-btn lg" data-act="newCustomFood" aria-label="Add custom food">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('foodTab', [{ value: 'foods', label: 'Foods' }, { value: 'meals', label: `My meals · ${n.savedMeals.length}` }, { value: 'recipes', label: `Recipes · ${n.recipes.length}` }, { value: 'history', label: 'History' }], tab)}</div>`;
    let body = '';
    if (tab === 'foods') {
      const list = filtered(App.ui.libCat, App.ui.libQ);
      body = `<div class="search mt12 reveal" style="--i:1">${icon('search')}<input class="inp" type="search" placeholder="Search poha, dal, paneer…" value="${esc(App.ui.libQ)}" data-input="libSearch" aria-label="Search foods"></div>
        <div class="reveal" style="--i:2">${catChips(App.ui.libCat, 'libCat')}</div>
        <div class="food-grid" id="libGrid">${gridHtml(list)}</div>
        <p class="section-note mt16">${icon('info')}<span>Values are approximate references per 100 g of food as eaten (IFCT/USDA style). Tap a food to see details or edit its values.</span></p>`;
    } else if (tab === 'meals') {
      body = `<div class="mt12">${n.savedMeals.length ? n.savedMeals.map((m, i) => savedMealCard(m, i)).join('') : App.empty('food', 'No custom meals yet', 'When you log a meal, tick “Save as custom meal” to reuse it in one tap.', `<button class="btn btn-primary" data-act="openPicker">${icon('plus')}Log a meal</button>`)}</div>`;
    } else if (tab === 'recipes') {
      body = `<button class="btn btn-soft btn-block mt12" data-act="newRecipe">${icon('plus')}New recipe</button>
        <div class="mt12">${n.recipes.length ? n.recipes.map((r, i) => recipeCard(r, i)).join('') : App.empty('book', 'No recipes yet', 'Combine ingredients (e.g. your mass-gainer shake) and LifeOS calculates nutrition per serving.')}</div>`;
    } else {
      body = historyHtml(14);
    }
    return head + body + '<div class="tabbar-space"></div>';
  }
  function gridHtml(list) {
    return list.length ? list.map((f, i) => foodCard(f, i)).join('') : `<div style="grid-column:1/-1">${App.empty('search', 'No match', 'Not in the library? Add it as a custom food.', `<button class="btn btn-primary" data-act="newCustomFood">${icon('plus')}Add custom food</button>`)}</div>`;
  }
  function savedMealCard(m, i) {
    const t = totalsOf(m.items);
    return `<article class="card reveal" style="--i:${i + 1}"><div class="row between"><div><b>${esc(m.name)}</b><small class="muted block">${esc(App.SLOTS.find((s) => s.id === m.slot)?.label || '')} · ${m.items.length} items · ${Math.round(t.kcal)} kcal · ${r1(t.p)} g protein</small></div>
      <div class="row gap-s"><button class="icon-btn sm" data-act="delSavedMeal" data-id="${m.id}" aria-label="Delete">${icon('trash')}</button><button class="btn btn-primary sm" data-act="logSavedMeal" data-id="${m.id}">${icon('plus')}Log</button></div></div>
      <p class="muted small mt8">${m.items.map((it) => { const f = App.foodById(it.foodId); return f ? `${it.qty} ${App.unitLabel(it.unit, it.qty)} ${f.name}` : ''; }).filter(Boolean).map(esc).join(' · ')}</p></article>`;
  }
  function recipeCard(r, i) {
    const f = App.recipeToFood(r);
    const v = App.calcFood(f, 1, 'serving');
    return `<article class="card reveal" style="--i:${i + 1}"><div class="row between"><div class="row gap"><span class="sel-art art-recipes">${esc(r.emoji || '📒')}</span><div><b>${esc(r.name)}</b><small class="muted block">${r.servings} serving${r.servings > 1 ? 's' : ''} · per serving ${Math.round(v.kcal)} kcal · ${r1(v.p)} g protein</small></div></div>
      <div class="row gap-s"><button class="icon-btn sm" data-act="editRecipe" data-id="${r.id}" aria-label="Edit">${icon('edit')}</button><button class="btn btn-primary sm" data-act="quickAdd" data-id="${r.id}">${icon('plus')}</button></div></div></article>`;
  }
  function historyHtml(days) {
    const out = [];
    for (const d of App.lastNDays(days).reverse()) {
      const meals = App.mealsOn(d);
      if (!meals.length) continue;
      const t = App.nutritionDay(d);
      out.push(`<h4 class="group-title">${App.prettyDate(d)}<span>${App.num(t.kcal)} kcal · ${Math.round(t.p)} g P</span></h4>
        <div class="card tight">${meals.map((m) => mealRow(m, d)).join('')}</div>`);
    }
    return out.length ? out.join('') : `<div class="mt12">${App.empty('cal', 'No meals yet', 'Meals you log appear here for the last 14 days.')}</div>`;
  }
  function mealRow(m, date) {
    const kc = m.items.reduce((a, x) => a + (+x.kcal || 0), 0), p = m.items.reduce((a, x) => a + (+x.p || 0), 0);
    const slot = App.SLOTS.find((s) => s.id === m.slot) || App.SLOTS[2];
    return `<div class="meal-entry">${m.photo ? `<img class="meal-photo" src="${m.photo}" alt="Meal photo">` : `<span class="sel-art art-meals">${slot.e}</span>`}
      <div class="grow"><b class="small">${esc(slot.label)}${m.name ? ' · ' + esc(m.name) : ''}</b><small class="muted block ellipsis">${m.items.map((x) => esc(x.name)).join(', ')}</small>
      <small class="block"><b>${Math.round(kc)} kcal</b> · ${r1(p)} g protein</small></div>
      <div class="row gap-s"><button class="icon-btn sm" data-act="relogMeal" data-date="${date}" data-id="${m.id}" aria-label="Log again">${icon('refresh')}</button>
      <button class="icon-btn sm" data-act="editMeal" data-date="${date}" data-id="${m.id}" aria-label="Edit">${icon('edit')}</button></div></div>`;
  }
  App.mealRow = mealRow;

  /* ---------- library actions ---------- */
  App.actions.foodTab = (el) => { App.ui.foodTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.libCat = (el) => { App.ui.libCat = el.dataset.c; App.render({ quiet: true }); };
  App.inputs.libSearch = (el) => {
    App.ui.libQ = el.value;
    const g = document.getElementById('libGrid');
    if (g) g.innerHTML = gridHtml(filtered(App.ui.libCat, App.ui.libQ));
  };
  App.actions.toggleFav = (el) => {
    const id = el.dataset.id;
    const f = N().favourites;
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    App.buzz();
    el.classList.toggle('on', i < 0);
    App.save();
  };
  App.actions.quickAdd = (el) => {
    if (App.ui.pick && document.getElementById('pick')) return addToPick(el.dataset.id, el);
    App.openFoodPicker({ add: el.dataset.id });
  };

  App.actions.foodDetail = (el) => {
    if (App.ui.pick && document.getElementById('pick')) return addToPick(el.dataset.id, el);
    const f = App.foodById(el.dataset.id);
    if (!f) return;
    const v100 = f.base === 'serving' ? null : App.calcFood(f, 100, 'g');
    const vs = servingCalc(f);
    const unitRows = unitsOf(f).filter((u) => u !== 'g').map((u) => `<div><dt>1 ${App.unitLabel(u)}</dt><dd>${f.base === 'serving' ? '—' : `${r1(f.units[u])} g`}</dd></div>`).join('');
    App.sheet({
      title: f.name,
      body: `<div class="food-art ${artCls(f)}" style="height:140px;font-size:72px"><span>${esc(f.emoji || '🍽️')}</span></div>
        <div class="macro-strip">${macroCells(vs)}</div>
        <p class="muted small mt8 ta-c">Per ${esc(servingText(f))}${vs.grams ? ` (${Math.round(vs.grams)} g)` : ''}</p>
        ${v100 ? `<h4 class="group-title">Per 100 g</h4><dl class="kv">${[['Calories', `${Math.round(v100.kcal)} kcal`], ['Protein', `${r1(v100.p)} g`], ['Carbohydrates', `${r1(v100.c)} g`], ['Fat', `${r1(v100.f)} g`], ['Fibre', f.fib ? `${r1(v100.fib)} g` : 'not available']].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
        ${unitRows ? `<h4 class="group-title">Portion sizes</h4><dl class="kv receipt-lines">${unitRows}</dl>` : ''}
        ${f.edited ? `<p class="inline-alert info">${icon('edit')}You have edited these values.</p>` : ''}
        <p class="field-hint">${f.builtin ? 'Reference values are approximate. Brands and home recipes vary.' : f.recipe ? 'Calculated from the recipe ingredients.' : 'Your custom food.'}</p>
        <div class="row gap mt16">
          ${f.recipe ? '' : `<button type="button" class="btn btn-ghost grow" data-act="${f.custom ? 'editCustomFood' : 'editFoodValues'}" data-id="${f.id}">${icon('edit')}Edit values</button>`}
          <button type="button" class="btn btn-primary grow" data-act="quickAdd" data-id="${f.id}">${icon('plus')}Log this</button>
        </div>`,
    });
  };
  const macroCells = (v) => [['kcal', Math.round(v.kcal)], ['protein', r1(v.p) + 'g'], ['carbs', r1(v.c) + 'g'], ['fat', r1(v.f) + 'g'], ['fibre', r1(v.fib) + 'g']].map(([k, x]) => `<div><b>${x}</b><small>${k}</small></div>`).join('');
  App.macroCells = macroCells;

  App.actions.editFoodValues = (el) => {
    const base = App.BUILTIN_FOODS[el.dataset.id];
    const f = App.foodById(el.dataset.id);
    const nums = (k, label) => App.field(label, App.input(k, { type: 'number', value: r1(f[k]), min: 0, max: 1000, step: 0.1, required: k === 'kcal', inputmode: 'decimal' }));
    const units = unitsOf(f).filter((u) => u !== 'g' && u !== 'ml');
    App.sheet({
      title: `Edit ${f.name}`,
      body: `<p class="muted small mb12">Values per 100 g. Changes apply to new entries; meals already logged keep the values they were saved with.</p>
        <div class="grid2">${nums('kcal', 'Calories (kcal)')}${nums('p', 'Protein (g)')}${nums('c', 'Carbs (g)')}${nums('f', 'Fat (g)')}${nums('fib', 'Fibre (g)')}</div>
        ${units.length ? `<h4 class="group-title">Portion sizes (grams)</h4><div class="grid2">${units.map((u) => App.field(`1 ${App.unitLabel(u)}`, App.input('u_' + u, { type: 'number', value: f.units[u], min: 0.1, max: 2000, step: 0.1, inputmode: 'decimal' }))).join('')}</div>` : ''}
        ${f.edited ? `<button type="button" class="btn btn-ghost btn-block" data-act="resetFoodValues" data-id="${f.id}">${icon('refresh')}Reset to default values</button>` : ''}`,
      onSubmit: (d) => {
        const ov = {};
        for (const k of ['kcal', 'p', 'c', 'f', 'fib']) { const v = Math.max(0, +d[k] || 0); if (v !== base[k]) ov[k] = v; }
        const u = {};
        for (const k of units) { const v = +d['u_' + k]; if (v > 0 && v !== base.units[k]) u[k] = v; }
        if (Object.keys(u).length) ov.units = u;
        if (Object.keys(ov).length) N().overrides[f.id] = ov; else delete N().overrides[f.id];
        App.toast('Food values saved');
        App.commit();
      },
    });
  };
  App.actions.resetFoodValues = (el) => {
    if (!App.confirm('Reset this food to the built-in reference values?')) return;
    delete N().overrides[el.dataset.id];
    App.closeSheet();
    App.toast('Reset to defaults');
    App.commit();
  };

  function customFoodSheet(c) {
    const isNew = !c;
    c = c || { name: '', emoji: '', cat: 'custom', base: '100g', servingG: '', servingName: 'serving', kcal: '', p: '', c: '', f: '', fib: '' };
    const basis = c.base === 'serving' ? 'serving' : '100g';
    const shown = (k) => (basis === 'serving' && c.servingG ? r1((c[k] * c.servingG) / 100) : c[k]);
    App.sheet({
      title: isNew ? 'Add custom food' : 'Edit custom food',
      body: `${App.field('Food name', App.input('name', { value: c.name, placeholder: 'e.g. Mom’s besan ladoo', required: true }))}
        <div class="grid2">${App.field('Emoji (optional)', App.input('emoji', { value: c.emoji, placeholder: '🍽️' }))}
        ${App.field('Category', App.select('cat', App.FOOD_CATS.filter((x) => !['recipes'].includes(x.id)).map((x) => ({ value: x.id, label: x.label })), c.cat || 'custom'))}</div>
        ${App.field('Nutrition values are', App.chips('basis', [{ value: '100g', label: 'Per 100 g' }, { value: 'serving', label: 'Per serving' }], basis))}
        <div class="grid2">${App.field('Serving name', App.input('servingName', { value: c.servingName || 'serving', placeholder: 'piece, bowl…' }))}
        ${App.field('Serving weight (g)', App.input('servingG', { type: 'number', value: c.servingG || '', min: 1, max: 3000, step: 1, inputmode: 'decimal' }), 'Optional for per-serving foods. Needed to log in grams.')}</div>
        <div class="grid2">${App.field('Calories (kcal)', App.input('kcal', { type: 'number', value: shown('kcal'), min: 0, max: 5000, step: 0.1, required: true, inputmode: 'decimal' }))}
        ${App.field('Protein (g)', App.input('p', { type: 'number', value: shown('p'), min: 0, max: 500, step: 0.1, inputmode: 'decimal' }))}
        ${App.field('Carbs (g)', App.input('c', { type: 'number', value: shown('c'), min: 0, max: 500, step: 0.1, inputmode: 'decimal' }))}
        ${App.field('Fat (g)', App.input('f', { type: 'number', value: shown('f'), min: 0, max: 500, step: 0.1, inputmode: 'decimal' }))}
        ${App.field('Fibre (g)', App.input('fib', { type: 'number', value: shown('fib'), min: 0, max: 200, step: 0.1, inputmode: 'decimal' }))}</div>`,
      danger: isNew ? null : { act: 'delCustomFood', label: 'Delete', attrs: `data-id="${c.id}"` },
      submit: isNew ? 'Add food' : 'Save',
      onSubmit: (d) => {
        const name = (d.name || '').trim().slice(0, 60);
        if (!name) return false;
        const sg = +d.servingG > 0 ? +d.servingG : 0;
        const vals = { kcal: Math.max(0, +d.kcal || 0), p: Math.max(0, +d.p || 0), c: Math.max(0, +d.c || 0), f: Math.max(0, +d.f || 0), fib: Math.max(0, +d.fib || 0) };
        const sn = (d.servingName || 'serving').trim().toLowerCase().slice(0, 16) || 'serving';
        let food;
        if (d.basis === 'serving' && !sg) {
          food = { name, emoji: d.emoji || '🍽️', cat: d.cat, base: 'serving', servingName: sn, ...vals, units: { serving: 1 }, defUnit: 'serving', defQty: 1 };
        } else {
          const k = d.basis === 'serving' ? 100 / sg : 1;
          const units = { g: 1 };
          if (sg) units[sn] = sg;
          food = { name, emoji: d.emoji || '🍽️', cat: d.cat, base: '100g', servingName: sn, servingG: sg || '', kcal: vals.kcal * k, p: vals.p * k, c: vals.c * k, f: vals.f * k, fib: vals.fib * k, units, defUnit: sg ? sn : 'g', defQty: sg ? 1 : 100 };
        }
        if (isNew) N().customFoods.push({ id: 'c-' + uid(), ...food });
        else Object.assign(c, food);
        App.toast(isNew ? `${name} added to My foods` : 'Saved');
        if (App.ui.pick && isNew) { App.ui.pick.items.push({ foodId: N().customFoods[N().customFoods.length - 1].id, qty: food.defQty, unit: food.defUnit }); App.save(); setTimeout(() => App.openFoodPicker({ keep: true }), 50); return; }
        App.commit();
      },
    });
  }
  App.actions.newCustomFood = () => customFoodSheet(null);
  App.actions.editCustomFood = (el) => customFoodSheet(N().customFoods.find((x) => x.id === el.dataset.id));
  App.actions.delCustomFood = (el) => {
    if (!App.confirm('Delete this custom food? Meals already logged keep their values.')) return;
    N().customFoods = N().customFoods.filter((x) => x.id !== el.dataset.id);
    N().favourites = N().favourites.filter((x) => x !== el.dataset.id);
    App.closeSheet();
    App.commit();
  };

  /* ---------- recipes ---------- */
  function recipeSheet(r) {
    const isNew = !r;
    App.ui.recipe = r ? JSON.parse(JSON.stringify(r)) : { id: 'r-' + uid(), name: '', emoji: '📒', servings: 1, cookedWeight: '', items: [] };
    drawRecipe(isNew);
  }
  function drawRecipe(isNew) {
    const r = App.ui.recipe;
    const foods = App.allFoods().filter((f) => f && !f.recipe).sort((a, b) => a.name.localeCompare(b.name));
    const tot = totalsOf(r.items);
    App.sheet({
      title: isNew ? 'New recipe' : 'Edit recipe',
      body: `${App.field('Recipe name', App.input('name', { value: r.name, placeholder: 'e.g. Gainer shake', required: true, attrs: 'data-input="recipeField" data-f="name"' }))}
        <div class="grid2">${App.field('Servings', App.input('servings', { type: 'number', value: r.servings, min: 1, max: 50, step: 1, required: true, attrs: 'data-input="recipeField" data-f="servings"' }))}
        ${App.field('Cooked weight (g, optional)', App.input('cookedWeight', { type: 'number', value: r.cookedWeight, min: 1, max: 20000, attrs: 'data-input="recipeField" data-f="cookedWeight"' }))}</div>
        <h4 class="group-title">Ingredients<span>${r.items.length}</span></h4>
        ${r.items.map((it, i) => { const f = App.foodById(it.foodId); return f ? `<div class="sel-item"><span class="sel-art ${artCls(f)}">${esc(f.emoji)}</span><div><b class="small">${esc(f.name)}</b>
          <div class="qty-row"><input class="inp" type="number" min="0" step="any" value="${it.qty}" data-input="recipeQty" data-i="${i}" aria-label="Quantity">${App.select('', unitsOf(f).map((u) => ({ value: u, label: App.unitLabel(u, 2) })), it.unit, `data-change="recipeUnit" data-i="${i}" class="inp"`)}</div></div>
          <button type="button" class="icon-btn sm" data-act="recipeDel" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>` : ''; }).join('')}
        <div class="qty-row mt8"><select class="inp" id="recipeAddSel" style="flex:1;width:auto">${foods.map((f) => `<option value="${f.id}">${esc(f.emoji)} ${esc(f.name)}</option>`).join('')}</select><button type="button" class="btn btn-soft sm" data-act="recipeAdd">${icon('plus')}Add</button></div>
        <div class="macro-strip mt16">${macroCells({ ...tot, kcal: tot.kcal / Math.max(1, r.servings), p: tot.p / Math.max(1, r.servings), c: tot.c / Math.max(1, r.servings), f: tot.f / Math.max(1, r.servings), fib: tot.fib / Math.max(1, r.servings) })}</div>
        <p class="muted small ta-c mt8">Per serving · total ${Math.round(tot.kcal)} kcal for ${r.servings} serving${r.servings > 1 ? 's' : ''}</p>`,
      danger: isNew ? null : { act: 'delRecipe', label: 'Delete', attrs: `data-id="${r.id}"` },
      submit: 'Save recipe',
      onSubmit: (d) => {
        r.name = (d.name || '').trim().slice(0, 60);
        r.servings = Math.max(1, Math.round(+d.servings || 1));
        r.cookedWeight = +d.cookedWeight > 0 ? +d.cookedWeight : '';
        if (!r.name || !r.items.length) { App.toast('Add a name and at least one ingredient', 'bad'); return false; }
        const list = N().recipes;
        const i = list.findIndex((x) => x.id === r.id);
        if (i >= 0) list[i] = r; else list.push(r);
        App.ui.recipe = null;
        App.toast('Recipe saved');
        App.commit();
      },
    });
  }
  App.inputs.recipeField = (el) => { App.ui.recipe[el.dataset.f] = el.value; };
  App.inputs.recipeQty = (el) => { App.ui.recipe.items[+el.dataset.i].qty = +el.value || 0; };
  App.changes.recipeUnit = (el) => { App.ui.recipe.items[+el.dataset.i].unit = el.value; drawRecipe(!N().recipes.some((x) => x.id === App.ui.recipe.id)); };
  App.actions.recipeAdd = () => {
    const id = document.getElementById('recipeAddSel').value;
    const f = App.foodById(id);
    if (!f) return;
    App.ui.recipe.items.push({ foodId: id, qty: f.defQty, unit: f.defUnit });
    drawRecipe(!N().recipes.some((x) => x.id === App.ui.recipe.id));
  };
  App.actions.recipeDel = (el) => { App.ui.recipe.items.splice(+el.dataset.i, 1); drawRecipe(!N().recipes.some((x) => x.id === App.ui.recipe.id)); };
  App.actions.newRecipe = () => recipeSheet(null);
  App.actions.editRecipe = (el) => recipeSheet(N().recipes.find((x) => x.id === el.dataset.id));
  App.actions.delRecipe = (el) => {
    if (!App.confirm('Delete this recipe? Meals already logged keep their values.')) return;
    N().recipes = N().recipes.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.commit();
  };

  /* ================= Meal logger (picker) ================= */
  function totalsOf(items) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, grams: 0 };
    for (const it of items) {
      const f = App.foodById(it.foodId);
      if (!f) continue;
      const v = App.calcFood(f, it.qty, it.unit);
      t.kcal += v.kcal; t.p += v.p; t.c += v.c; t.f += v.f; t.fib += v.fib; t.grams += v.grams;
    }
    return t;
  }
  App.mealTotals = totalsOf;

  /** Open the animated food selection screen. opts: {add, slot, items, editId, date, keep} */
  App.openFoodPicker = (opts = {}) => {
    if (!opts.keep || !App.ui.pick) {
      App.ui.pick = { step: 'browse', slot: opts.slot || App.slotForNow(), items: [], q: '', cat: 'all', photo: null, date: opts.date || dkey(), editId: opts.editId || null, name: '', saveAs: false };
      if (opts.items) App.ui.pick.items = opts.items.map((x) => ({ ...x }));
      if (opts.add) { const f = App.foodById(opts.add); if (f) App.ui.pick.items.push({ foodId: f.id, qty: f.defQty, unit: f.defUnit }); }
      if (opts.step) App.ui.pick.step = opts.step;
    }
    App.sheet({ title: App.ui.pick.editId ? 'Edit meal' : 'Log food', body: '<div id="pick"></div>', full: true, cls: 'picker' });
    drawPick();
  };
  App.actions.openPicker = () => App.openFoodPicker();

  function slotChips() {
    const P = App.ui.pick;
    return `<div class="seg pills">${App.SLOTS.map((s) => `<button type="button" class="seg-btn ${P.slot === s.id ? 'on' : ''}" data-act="pickSlot" data-v="${s.id}">${s.e} ${s.label}</button>`).join('')}</div>`;
  }

  function drawPick() {
    const P = App.ui.pick;
    const root = document.getElementById('pick');
    if (!root) return;
    if (P.step === 'review') return drawReview(root);
    if (P.step === 'photo') return drawPhoto(root);
    root.innerHTML = `
      <div class="row gap">${slotChips()}<button type="button" class="icon-btn" data-act="pickPhoto" aria-label="Use a photo">${icon('camera')}</button></div>
      <div class="search mt12">${icon('search')}<input class="inp" type="search" id="pickSearch" placeholder="Search foods…" value="${esc(P.q)}" data-input="pickSearch" aria-label="Search foods"></div>
      ${catChips(P.cat, 'pickCat')}
      <div class="food-grid" id="pickGrid">${pickGrid()}</div>
      <div id="pickTray" class="pick-tray">${trayHtml()}</div>`;
  }
  function pickGrid() {
    const P = App.ui.pick;
    const list = filtered(P.cat, P.q);
    const count = (id) => P.items.filter((x) => x.foodId === id).length;
    if (!list.length) return `<div style="grid-column:1/-1">${App.empty('search', 'No match', 'Add it as a custom food and it will be selected for this meal.', `<button type="button" class="btn btn-primary" data-act="newCustomFood">${icon('plus')}Custom food</button>`)}</div>`;
    return list.map((f, i) => foodCard(f, i, { selCount: count(f.id), act: 'foodDetail' })).join('');
  }
  function trayHtml() {
    const P = App.ui.pick;
    const t = totalsOf(P.items);
    return `<div class="tray"><div class="tray-info"><b>${P.items.length ? `${Math.round(t.kcal)} kcal · ${r1(t.p)} g protein` : 'Select foods'}</b><small>${P.items.length ? `${App.plural(P.items.length, 'item')} selected` : 'Tap + on any food. Pick as many as you like.'}</small></div>
      <button type="button" class="btn btn-primary" data-act="pickReview" ${P.items.length ? '' : 'disabled'}>Review ${icon('right')}</button></div>`;
  }
  function refreshBrowse() {
    const g = document.getElementById('pickGrid'), t = document.getElementById('pickTray');
    if (g) g.innerHTML = pickGrid();
    if (t) t.innerHTML = trayHtml();
  }
  function addToPick(id, el) {
    const f = App.foodById(id);
    if (!f) return;
    const P = App.ui.pick;
    const ex = P.items.find((x) => x.foodId === id);
    if (ex) ex.qty = r1((+ex.qty || 0) + (+f.defQty || 1));
    else P.items.push({ foodId: id, qty: f.defQty, unit: f.defUnit });
    App.buzz(12);
    if (P.step !== 'browse') { drawPick(); return; }
    refreshBrowse();
    const card = document.querySelector(`#pickGrid .food-card[data-id="${CSS.escape(id)}"]`);
    if (card) card.classList.add('food-added');
  }
  App.inputs.pickSearch = (el) => { App.ui.pick.q = el.value; const g = document.getElementById('pickGrid'); if (g) g.innerHTML = pickGrid(); };
  App.actions.pickCat = (el) => { App.ui.pick.cat = el.dataset.c; document.querySelectorAll('#pick .cat-chip').forEach((c) => c.classList.toggle('on', c.dataset.c === el.dataset.c)); refreshBrowse(); };
  App.actions.pickSlot = (el) => { App.ui.pick.slot = el.dataset.v; document.querySelectorAll('#pick [data-act="pickSlot"]').forEach((c) => c.classList.toggle('on', c.dataset.v === el.dataset.v)); };
  App.actions.pickReview = () => { App.ui.pick.step = 'review'; drawPick(); };
  App.actions.pickBack = () => { App.ui.pick.step = 'browse'; drawPick(); };

  function drawReview(root) {
    const P = App.ui.pick;
    const t = totalsOf(P.items);
    const target = App.T();
    const day = App.nutritionDay(P.date);
    const editing = P.editId ? App.mealsOn(P.date).find((m) => m.id === P.editId) : null;
    const baseK = day.kcal - (editing ? editing.items.reduce((a, x) => a + (+x.kcal || 0), 0) : 0);
    const baseP = day.p - (editing ? editing.items.reduce((a, x) => a + (+x.p || 0), 0) : 0);
    root.innerHTML = `
      <button type="button" class="back-link" data-act="pickBack">${icon('left')}Add more foods</button>
      <div class="mt12">${slotChips()}</div>
      ${P.photo ? `<img class="photo-preview mt12" src="${P.photo}" alt="Meal photo">` : ''}
      <div class="card flat mt12" style="padding:6px 14px">${P.items.map((it, i) => reviewRow(it, i)).join('') || '<p class="muted small" style="padding:12px 0">No foods selected.</p>'}</div>
      <h4 class="group-title">Meal summary</h4>
      <div class="macro-strip" id="pickTotals">${macroCells(t)}</div>
      <div class="card flat mt12" id="pickImpact">${impactHtml(t, baseK, baseP, target)}</div>
      <div class="field mt12"><span class="field-label">Date</span><input class="inp" type="date" value="${P.date}" max="${dkey()}" data-input="pickDate"></div>
      <label class="toggle-row"><span class="grow"><b>Save as custom meal</b><small class="muted block">Reuse this combination in one tap</small></span><input type="checkbox" class="switch" ${P.saveAs ? 'checked' : ''} data-change="pickSaveAs"></label>
      <div class="field ${P.saveAs ? '' : 'hide'}" id="pickNameWrap"><span class="field-label">Meal name</span><input class="inp" value="${esc(P.name)}" placeholder="e.g. Home thali" data-input="pickName"></div>
      <div class="pick-tray"><div class="tray">
        ${P.editId ? `<button type="button" class="btn btn-ghost danger" data-act="deleteMeal">${icon('trash')}</button>` : ''}
        <div class="tray-info"><b id="pickTrayK">${Math.round(t.kcal)} kcal</b><small>${App.plural(P.items.length, 'item')}</small></div>
        <button type="button" class="btn btn-primary" data-act="saveMeal" ${P.items.length ? '' : 'disabled'}>${icon('check')}${P.editId ? 'Save changes' : 'Save meal'}</button></div></div>`;
  }
  function impactHtml(t, baseK, baseP, target) {
    const k2 = baseK + t.kcal, p2 = baseP + t.p;
    return `<div class="row between small"><span>Day after this meal</span><b>${App.num(k2)} / ${App.num(target.kcal)} kcal</b></div>${App.bar(k2 / target.kcal, k2 > target.kcal * 1.15 ? 'amber' : 'lime')}
      <div class="row between small mt8"><span>Protein</span><b>${Math.round(p2)} / ${target.protein} g</b></div>${App.bar(p2 / target.protein, 'sky')}`;
  }
  function reviewRow(it, i) {
    const f = App.foodById(it.foodId);
    if (!f) return '';
    const v = App.calcFood(f, it.qty, it.unit);
    return `<div class="sel-item" data-row="${i}"><span class="sel-art ${artCls(f)}">${esc(f.emoji)}</span>
      <div><b class="small">${esc(f.name)}</b><small class="muted block" id="rowv-${i}">${Math.round(v.kcal)} kcal · ${r1(v.p)} g P${v.grams ? ` · ${Math.round(v.grams)} g` : ''}</small>
        <div class="qty-row"><button type="button" class="step-btn" data-act="pickStep" data-i="${i}" data-n="-1" aria-label="Less">−</button>
        <input class="inp" type="number" inputmode="decimal" min="0" step="any" value="${it.qty}" data-input="pickQty" data-i="${i}" aria-label="Quantity">
        <button type="button" class="step-btn" data-act="pickStep" data-i="${i}" data-n="1" aria-label="More">+</button>
        ${App.select('', unitsOf(f).map((u) => ({ value: u, label: App.unitLabel(u, 2) })), it.unit, `data-change="pickUnit" data-i="${i}" aria-label="Unit"`)}</div></div>
      <button type="button" class="icon-btn sm" data-act="pickRemove" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`;
  }
  function refreshTotals() {
    const P = App.ui.pick;
    const t = totalsOf(P.items);
    const day = App.nutritionDay(P.date);
    const editing = P.editId ? App.mealsOn(P.date).find((m) => m.id === P.editId) : null;
    const baseK = day.kcal - (editing ? editing.items.reduce((a, x) => a + (+x.kcal || 0), 0) : 0);
    const baseP = day.p - (editing ? editing.items.reduce((a, x) => a + (+x.p || 0), 0) : 0);
    const el = document.getElementById('pickTotals'); if (el) el.innerHTML = macroCells(t);
    const im = document.getElementById('pickImpact'); if (im) { im.innerHTML = impactHtml(t, baseK, baseP, App.T()); im.querySelectorAll('.bar-fill').forEach((b) => (b.style.width = b.style.getPropertyValue('--w'))); }
    const k = document.getElementById('pickTrayK'); if (k) k.textContent = `${Math.round(t.kcal)} kcal`;
    P.items.forEach((it, i) => {
      const f = App.foodById(it.foodId); const v = App.calcFood(f, it.qty, it.unit);
      const r = document.getElementById('rowv-' + i); if (r) r.textContent = `${Math.round(v.kcal)} kcal · ${r1(v.p)} g P${v.grams ? ` · ${Math.round(v.grams)} g` : ''}`;
    });
  }
  App.inputs.pickQty = (el) => { App.ui.pick.items[+el.dataset.i].qty = Math.max(0, +el.value || 0); refreshTotals(); };
  App.inputs.pickDate = (el) => { if (el.value && el.value <= dkey()) { App.ui.pick.date = el.value; refreshTotals(); } };
  App.inputs.pickName = (el) => { App.ui.pick.name = el.value; };
  App.changes.pickSaveAs = (el) => { App.ui.pick.saveAs = el.checked; document.getElementById('pickNameWrap').classList.toggle('hide', !el.checked); };
  App.changes.pickUnit = (el) => {
    const it = App.ui.pick.items[+el.dataset.i];
    const f = App.foodById(it.foodId);
    // Convert so the amount stays about the same when switching units
    const g = App.calcFood(f, it.qty, it.unit).grams;
    it.unit = el.value;
    const per = f.units[it.unit] || 1;
    it.qty = it.unit === 'g' || it.unit === 'ml' ? Math.round(g || 100) : g ? r1(g / per) : 1;
    const inp = document.querySelector(`[data-input="pickQty"][data-i="${el.dataset.i}"]`);
    if (inp) inp.value = it.qty;
    refreshTotals();
  };
  App.actions.pickStep = (el) => {
    const it = App.ui.pick.items[+el.dataset.i];
    const step = it.unit === 'g' || it.unit === 'ml' ? 25 : it.unit === 'piece' && it.qty < 1 ? 0.5 : 1;
    it.qty = Math.max(0, r1((+it.qty || 0) + step * +el.dataset.n));
    const inp = document.querySelector(`[data-input="pickQty"][data-i="${el.dataset.i}"]`);
    if (inp) inp.value = it.qty;
    App.buzz(6);
    refreshTotals();
  };
  App.actions.pickRemove = (el) => { App.ui.pick.items.splice(+el.dataset.i, 1); drawPick(); };

  App.actions.saveMeal = () => {
    const P = App.ui.pick;
    const items = P.items.filter((it) => +it.qty > 0).map((it) => {
      const f = App.foodById(it.foodId);
      const v = App.calcFood(f, it.qty, it.unit);
      return { foodId: f.id, name: f.name, emoji: f.emoji, qty: +it.qty, unit: it.unit, grams: Math.round(v.grams * 10) / 10, kcal: Math.round(v.kcal * 10) / 10, p: Math.round(v.p * 10) / 10, c: Math.round(v.c * 10) / 10, f: Math.round(v.f * 10) / 10, fib: Math.round(v.fib * 10) / 10 };
    });
    if (!items.length) { App.toast('Set a quantity above 0', 'bad'); return; }
    const n = N();
    const before = App.nutritionDay(P.date);
    const logs = (n.logs[P.date] = n.logs[P.date] || []);
    if (P.editId) {
      // edits may also move a meal to another date
      for (const [d, list] of Object.entries(n.logs)) { const i = list.findIndex((m) => m.id === P.editId); if (i >= 0) { const old = list[i]; list.splice(i, 1); if (!P.photo && old.photo) P.photo = old.photo; if (!list.length) delete n.logs[d]; } }
      (n.logs[P.date] = n.logs[P.date] || []).push({ id: P.editId, slot: P.slot, ts: Date.now(), items, photo: P.photo || undefined, name: P.name || undefined });
    } else {
      logs.push({ id: 'm-' + uid(), slot: P.slot, ts: Date.now(), items, photo: P.photo || undefined, name: P.saveAs ? P.name || undefined : undefined });
    }
    if (P.saveAs) n.savedMeals.push({ id: 'sm-' + uid(), name: (P.name || `${App.SLOTS.find((s) => s.id === P.slot).label} combo`).slice(0, 40), slot: P.slot, items: P.items.map((x) => ({ foodId: x.foodId, qty: x.qty, unit: x.unit })) });
    n.recent = [...new Set([...items.map((x) => x.foodId), ...n.recent])].slice(0, 24);
    const after = App.nutritionDay(P.date);
    const t = App.T();
    const added = after.kcal - before.kcal;
    App.ui.pick = null;
    App.closeSheet();
    App.buzz([15, 30, 15]);
    App.save();
    const today = P.date === dkey();
    if (!Object.keys(App.state.achievements).some((k) => k === 'first-meal')) App.unlock('first-meal', 'First meal logged', 'Your nutrition dashboard is live', 'food');
    else if (today && before.p < t.protein && after.p >= t.protein) App.unlock('protein-' + P.date, 'Protein goal hit', `${Math.round(after.p)} g today`, 'zap');
    else if (today && before.kcal < t.kcal && after.kcal >= t.kcal) App.unlock('kcal-' + P.date, 'Calorie goal reached', `${App.num(after.kcal)} kcal today`, 'flame');
    else App.toast(`Meal saved · ${added >= 0 ? '+' : ''}${Math.round(added)} kcal`);
    setTimeout(() => App.render(), 340);
  };
  App.actions.deleteMeal = () => {
    const P = App.ui.pick;
    if (!App.confirm('Delete this meal entry?')) return;
    for (const [d, list] of Object.entries(N().logs)) { const i = list.findIndex((m) => m.id === P.editId); if (i >= 0) { list.splice(i, 1); if (!list.length) delete N().logs[d]; } }
    App.ui.pick = null;
    App.closeSheet();
    App.toast('Meal deleted');
    App.commit();
  };
  App.actions.editMeal = (el) => {
    const m = App.mealsOn(el.dataset.date).find((x) => x.id === el.dataset.id);
    if (!m) return;
    const items = m.items.filter((x) => x.foodId && App.foodById(x.foodId)).map((x) => ({ foodId: x.foodId, qty: x.qty, unit: x.unit }));
    if (items.length !== m.items.length) {
      // Older entries (e.g. migrated from LifeOS v1) have no food reference; offer delete only.
      if (App.confirm('This older entry cannot be edited item by item. Delete it?')) {
        const list = N().logs[el.dataset.date];
        list.splice(list.findIndex((x) => x.id === m.id), 1);
        App.commit();
      }
      return;
    }
    App.openFoodPicker({ items, slot: m.slot, editId: m.id, date: el.dataset.date, step: 'review' });
    App.ui.pick.photo = m.photo || null;
    App.ui.pick.name = m.name || '';
    drawPick();
  };
  App.actions.relogMeal = (el) => {
    const m = App.mealsOn(el.dataset.date).find((x) => x.id === el.dataset.id);
    if (!m) return;
    const items = m.items.filter((x) => x.foodId && App.foodById(x.foodId)).map((x) => ({ foodId: x.foodId, qty: x.qty, unit: x.unit }));
    if (!items.length) return App.toast('This entry has no library foods to repeat', 'warn');
    App.openFoodPicker({ items, slot: App.slotForNow(), step: 'review' });
  };
  App.actions.logSavedMeal = (el) => {
    const m = N().savedMeals.find((x) => x.id === el.dataset.id);
    if (m) App.openFoodPicker({ items: m.items.filter((x) => App.foodById(x.foodId)), slot: m.slot, step: 'review' });
  };
  App.actions.delSavedMeal = (el) => {
    if (!App.confirm('Delete this custom meal? Logged meals are not affected.')) return;
    N().savedMeals = N().savedMeals.filter((x) => x.id !== el.dataset.id);
    App.commit();
  };

  /* ---------- photo: local matching workflow ---------- */
  App.actions.pickPhoto = () => { App.ui.pick.step = 'photo'; drawPick(); };
  function drawPhoto(root) {
    const P = App.ui.pick;
    const hist = {};
    for (const list of Object.values(N().logs)) for (const m of list) if (m.slot === P.slot) for (const it of m.items) if (it.foodId) hist[it.foodId] = (hist[it.foodId] || 0) + 1;
    const sugg = Object.entries(hist).sort((a, b) => b[1] - a[1]).map(([id]) => App.foodById(id)).filter(Boolean).slice(0, 8);
    const fallback = sugg.length ? sugg : ['roti', 'dal', 'rice', 'curd', 'paneerBhurji', 'mixVeg', 'poha', 'banana'].map((id) => App.foodById(id));
    root.innerHTML = `
      <button type="button" class="back-link" data-act="pickBack">${icon('left')}Back to foods</button>
      <div class="inline-alert info mt12">${icon('info')}<span><b>No cloud, no guessing.</b> LifeOS cannot recognise food from a photo offline, and a photo never gives exact calories. Choose what is on your plate and confirm the portions. The photo is saved with the meal on this device.</span></div>
      ${P.photo ? `<img class="photo-preview mt12" src="${P.photo}" alt="Selected meal photo">` : ''}
      <label class="btn ${P.photo ? 'btn-ghost' : 'btn-primary'} btn-block mt12">${icon('camera')}${P.photo ? 'Choose a different photo' : 'Take or choose a photo'}<input type="file" accept="image/*" capture="environment" data-change="pickPhotoFile" hidden></label>
      ${P.photo ? `<button type="button" class="btn btn-ghost btn-block mt8" data-act="pickPhotoClear">${icon('trash')}Remove photo</button>` : ''}
      <h4 class="group-title">${sugg.length ? `You often eat at ${App.SLOTS.find((s) => s.id === P.slot).label.toLowerCase()}` : 'Common plate items'}</h4>
      <div class="food-grid">${fallback.map((f, i) => foodCard(f, i, { selCount: P.items.filter((x) => x.foodId === f.id).length })).join('')}</div>
      <div class="pick-tray">${trayHtml()}</div>`;
  }
  App.changes.pickPhotoFile = async (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    try {
      App.ui.pick.photo = await App.downscaleImage(file, 480, 0.72);
      drawPick();
    } catch (e) { console.error(e); App.toast('Could not read that image', 'bad'); }
  };
  App.actions.pickPhotoClear = () => { App.ui.pick.photo = null; drawPick(); };
  App.downscaleImage = (file, max = 480, q = 0.72) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

  App.views.food = { render };
})();
