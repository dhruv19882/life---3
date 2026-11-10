'use strict';
/* Budget tracker (INR): income, expenses, monthly + category budgets. */
(function () {
  const { icon, esc, inr, dkey, mkey, uid, parseD, prettyDate, MON } = App;
  App.ui.moneyMonth = mkey();

  const EXP = [
    { id: 'food', label: 'Food', e: '🍔', c: '#fb923c' },
    { id: 'grocery', label: 'Groceries', e: '🛒', c: '#34d399' },
    { id: 'transport', label: 'Transport', e: '🛵', c: '#3b82f6' },
    { id: 'rent', label: 'Rent', e: '🏠', c: '#8b5cf6' },
    { id: 'bills', label: 'Bills', e: '💡', c: '#facc15' },
    { id: 'recharge', label: 'Recharge', e: '📱', c: '#22d3ee' },
    { id: 'gym', label: 'Gym & diet', e: '🏋️', c: '#a3e635' },
    { id: 'shopping', label: 'Shopping', e: '🛍️', c: '#f472b6' },
    { id: 'health', label: 'Health', e: '💊', c: '#f43f5e' },
    { id: 'study', label: 'Education', e: '📚', c: '#60a5fa' },
    { id: 'fun', label: 'Entertainment', e: '🎬', c: '#c084fc' },
    { id: 'other', label: 'Other', e: '📦', c: '#94a3b8' },
  ];
  const INC = [
    { id: 'salary', label: 'Salary', e: '💼', c: '#34d399' },
    { id: 'pocket', label: 'Pocket money', e: '👛', c: '#22d3ee' },
    { id: 'freelance', label: 'Freelance', e: '💻', c: '#8b5cf6' },
    { id: 'gift', label: 'Gift', e: '🎁', c: '#f472b6' },
    { id: 'other_in', label: 'Other', e: '➕', c: '#94a3b8' },
  ];
  const MODES = ['UPI', 'Cash', 'Card'];
  const cat = (id) => EXP.find((c) => c.id === id) || INC.find((c) => c.id === id) || EXP[EXP.length - 1];

  App.monthMoney = (month = mkey()) => {
    const m = App.state.money;
    const tx = m.txns.filter((t) => t.date.startsWith(month));
    const spent = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const income = tx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const budget = m.monthly || 0;
    const left = budget - spent;
    const now = new Date();
    const [y, mo] = month.split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const daysLeft = month === mkey() ? daysInMonth - now.getDate() + 1 : 0;
    return { tx, spent, income, budget, left, perDay: daysLeft ? left / daysLeft : 0, daysLeft };
  };

  function monthLabel(m) {
    const d = parseD(m + '-01');
    return `${MON[d.getMonth()]} ${d.getFullYear()}`;
  }

  function render() {
    const month = App.ui.moneyMonth;
    const tab = App.ui.moneyTab;
    const mm = App.monthMoney(month);
    const isNow = month === mkey();

    const byCat = EXP.map((c) => ({ ...c, v: mm.tx.filter((t) => t.type === 'expense' && t.cat === c.id).reduce((a, t) => a + t.amount, 0) }))
      .filter((c) => c.v || App.state.money.budgets[c.id])
      .sort((a, b) => b.v - a.v);

    const head = `
      ${App.header('Money', 'Budget tracker · ₹ INR', `<button class="fab-sm" data-act="addTxn" data-type="expense" aria-label="Add expense">${icon('plus')}</button>`)}
      <div class="month-nav reveal" style="--i:0">
        <button class="icon-btn" data-act="monthNav" data-n="-1" aria-label="Previous month">${icon('left')}</button>
        <b>${monthLabel(month)}</b>
        <button class="icon-btn" data-act="monthNav" data-n="1" ${isNow ? 'disabled' : ''} aria-label="Next month">${icon('right')}</button>
      </div>
      <div class="reveal" style="--i:1">${App.seg('moneyTab', [{ value: 'overview', label: 'Overview' }, { value: 'list', label: `Transactions · ${mm.tx.length}` }], tab)}</div>`;

    if (tab === 'list') return head + renderList(mm) + '<div class="tabbar-space"></div>';

    const pct = mm.spent / (mm.budget || 1);
    const barCls = pct > 1 ? 'red' : pct > 0.8 ? 'warm' : 'green';

    return `${head}
      <section class="card balance reveal mt12" style="--i:2">
        <small class="muted">Spent this month</small>
        <div class="balance-big">${App.count(mm.spent, { prefix: '₹' })}</div>
        ${App.bar(pct, barCls, 'thick')}
        <div class="row between small mt8"><span class="muted">of ${inr(mm.budget)} budget</span>
          <span class="${mm.left < 0 ? 'neg' : 'pos'}">${mm.left < 0 ? `${inr(-mm.left)} over` : `${inr(mm.left)} left`}</span></div>
        ${pct > 0.8 ? `<div class="inline-alert ${pct > 1 ? 'bad' : 'warn'}">${icon('alert')}${pct > 1 ? 'You have crossed your monthly budget.' : `You have used ${Math.round(pct * 100)}% of your budget.`}</div>` : ''}
        <div class="stat-row">
          <div><span class="tile-ic g-green sm">${icon('up')}</span><small>Income</small><b>${inr(mm.income)}</b></div>
          <div><span class="tile-ic g-red sm">${icon('downT')}</span><small>Expenses</small><b>${inr(mm.spent)}</b></div>
          <div><span class="tile-ic g-accent sm">${icon('rupee')}</span><small>Saved</small><b class="${mm.income - mm.spent < 0 ? 'neg' : ''}">${inr(mm.income - mm.spent)}</b></div>
        </div>
        ${isNow ? `<p class="muted small mt8">Safe to spend: <b class="pos">${inr(Math.max(0, mm.perDay))}/day</b> for the next ${mm.daysLeft} days.</p>` : ''}
        <div class="row gap mt12">
          <button class="btn btn-primary grow" data-act="addTxn" data-type="expense">${icon('minus')}Expense</button>
          <button class="btn btn-soft grow" data-act="addTxn" data-type="income">${icon('plus')}Income</button>
        </div>
      </section>

      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('target')}Where it went</h3><button class="link" data-act="editBudgets">Budgets ${icon('edit')}</button></div>
        ${byCat.length ? `<div class="donut-wrap">${App.donut(byCat.filter((c) => c.v).map((c) => ({ value: c.v, color: c.c })), { size: 150, stroke: 20,
            center: `<b>${byCat.filter((c) => c.v).length}</b><small>categories</small>` })}</div>
          <div class="cat-list">${byCat.map((c) => {
            const b = App.state.money.budgets[c.id];
            const p = b ? c.v / b : 0;
            return `<div class="cat-row"><span class="cat-e" style="--c:${c.c}">${c.e}</span>
              <div class="grow"><div class="row between"><b>${c.label}</b><span>${inr(c.v)}${b ? `<small class="muted"> / ${inr(b)}</small>` : ''}</span></div>
              ${b ? App.bar(p, p > 1 ? 'red' : p > 0.8 ? 'warm' : 'green', 'thin') : `<div class="bar thin"><span class="bar-fill" style="--w:${(c.v / (mm.spent || 1)) * 100}%;background:${c.c}"></span></div>`}</div></div>`;
          }).join('')}</div>`
          : App.empty('wallet', 'No expenses yet', 'Log every chai and recharge. Small spends add up.')}
      </section>
      <div class="tabbar-space"></div>`;
  }

  function renderList(mm) {
    if (!mm.tx.length) return `<div class="mt12">${App.empty('rupee', 'No transactions', 'Add income or an expense for this month.', `<button class="btn btn-primary" data-act="addTxn" data-type="expense">${icon('plus')}Add expense</button>`)}</div>`;
    const byDate = {};
    mm.tx.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).forEach((t) => (byDate[t.date] = byDate[t.date] || []).push(t));
    return Object.entries(byDate).map(([d, list], i) => {
      const net = list.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
      return `<section class="reveal mt12" style="--i:${i + 2}"><h4 class="group-title">${prettyDate(d)}<span class="${net < 0 ? 'neg' : 'pos'}">${net < 0 ? '-' : '+'}${inr(Math.abs(net))}</span></h4>
        <div class="card list-card">${list.map((t) => {
          const c = cat(t.cat);
          return `<button class="txn" data-act="editTxn" data-id="${t.id}"><span class="cat-e" style="--c:${c.c}">${c.e}</span>
            <span class="grow ta-l"><b>${esc(t.note || c.label)}</b><small class="muted block">${c.label} · ${esc(t.mode || 'UPI')}</small></span>
            <b class="${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '-'}${inr(t.amount)}</b></button>`;
        }).join('')}</div></section>`;
    }).join('');
  }

  /* ---------- actions ---------- */
  App.actions.moneyTab = (el) => { App.ui.moneyTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.monthNav = (el) => {
    const d = parseD(App.ui.moneyMonth + '-01');
    d.setMonth(d.getMonth() + +el.dataset.n);
    const next = mkey(d);
    if (next > mkey()) return;
    App.ui.moneyMonth = next;
    App.render({ quiet: true });
  };

  function txnSheet(t, type) {
    const isNew = !t;
    t = t || { type: type || 'expense', amount: '', cat: type === 'income' ? 'salary' : 'food', note: '', date: dkey(), mode: 'UPI' };
    const cats = (ty) => (ty === 'income' ? INC : EXP).map((c) => ({ value: c.id, label: `${c.e} ${c.label}` }));
    App.sheet({
      title: isNew ? (t.type === 'income' ? 'Add income' : 'Add expense') : 'Edit transaction',
      submit: isNew ? 'Add' : 'Save',
      body: `
        <div class="amount-inp"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="1" max="10000000" step="1" placeholder="0" value="${t.amount}" required></div>
        <input type="hidden" name="type" value="${t.type}">
        ${App.field('Category', App.chips('cat', cats(t.type), t.cat))}
        ${App.field('Note', App.input('note', { value: t.note, placeholder: t.type === 'income' ? 'e.g. November salary' : 'e.g. Chai + samosa' }))}
        <div class="grid2">
          ${App.field('Date', App.input('date', { type: 'date', value: t.date, max: dkey(), required: true }))}
          ${App.field('Paid via', `<select class="inp" name="mode">${MODES.map((m) => `<option ${m === t.mode ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}
        </div>`,
      danger: isNew ? null : { act: 'deleteTxn', label: 'Delete', attrs: `data-id="${t.id}"` },
      onSubmit: (d) => {
        const amount = Math.round(+d.amount * 100) / 100;
        if (!(amount > 0)) { App.toast('Enter an amount', 'bad'); return false; }
        const valid = (d.type === 'income' ? INC : EXP).some((c) => c.id === d.cat);
        const obj = { type: d.type === 'income' ? 'income' : 'expense', amount, cat: valid ? d.cat : (d.type === 'income' ? 'other_in' : 'other'),
          note: (d.note || '').trim().slice(0, 60), date: d.date || dkey(), mode: MODES.includes(d.mode) ? d.mode : 'UPI' };
        const before = App.monthMoney(obj.date.slice(0, 7));
        if (isNew) App.state.money.txns.push({ id: uid(), ts: Date.now(), ...obj });
        else Object.assign(t, obj);
        const after = App.monthMoney(obj.date.slice(0, 7));
        if (obj.type === 'expense' && before.spent <= before.budget && after.spent > after.budget) App.toast('Monthly budget crossed!', 'bad');
        else if (obj.type === 'expense' && before.spent <= before.budget * 0.8 && after.spent > after.budget * 0.8) App.toast('80% of budget used', 'warn');
        else App.toast(`${obj.type === 'income' ? 'Income' : 'Expense'} of ${inr(amount)} saved`);
        App.commit();
      },
    });
  }
  App.actions.addTxn = (el) => txnSheet(null, el.dataset.type);
  App.actions.editTxn = (el) => txnSheet(App.state.money.txns.find((x) => x.id === el.dataset.id));
  App.actions.deleteTxn = (el) => {
    App.state.money.txns = App.state.money.txns.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.toast('Deleted');
    App.commit();
  };

  App.actions.editBudgets = () => {
    const b = App.state.money.budgets;
    App.sheet({
      title: 'Monthly budgets',
      body: `
        ${App.field('Total monthly budget (₹)', App.input('monthly', { type: 'number', value: App.state.money.monthly, min: 0, inputmode: 'numeric', required: true }))}
        <p class="field-label mt12">Category limits (optional)</p>
        <div class="budget-grid">${EXP.map((c) => `<label class="budget-row"><span>${c.e} ${c.label}</span>
          <input class="inp sm" type="number" inputmode="numeric" min="0" name="b_${c.id}" value="${b[c.id] || ''}" placeholder="—"></label>`).join('')}</div>`,
      onSubmit: (d) => {
        App.state.money.monthly = Math.max(0, Math.round(+d.monthly || 0));
        EXP.forEach((c) => {
          const v = Math.round(+d['b_' + c.id] || 0);
          if (v > 0) b[c.id] = v; else delete b[c.id];
        });
        App.toast('Budgets saved');
        App.commit();
      },
    });
  };

  App.views.money = { render };
})();
