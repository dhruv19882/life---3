'use strict';
/* Personal finance (INR): income, expenses, refunds, transfers; budgets; safe-to-spend; recurring items; reports; receipts.
   Money you are owed (Fees & Payments) is never counted here until it is actually received. */
(function () {
  const { icon, esc, inr, dkey, mkey, uid, parseD, prettyDate, sum, money } = App;
  App.ui.moneyMonth = mkey();
  App.ui.moneyTab = 'overview';
  App.ui.txQ = '';
  App.ui.txType = 'all';

  const EXP = [
    { id: 'food', label: 'Food & dining', e: '🍔', c: '#F5B83D' },
    { id: 'grocery', label: 'Groceries', e: '🛒', c: '#B9EF45' },
    { id: 'transport', label: 'Transport', e: '🛵', c: '#8EDCF0' },
    { id: 'rent', label: 'Rent', e: '🏠', c: '#A6B4FF' },
    { id: 'bills', label: 'Bills & utilities', e: '💡', c: '#FFD98A' },
    { id: 'recharge', label: 'Mobile & internet', e: '📱', c: '#6FD3E8' },
    { id: 'gym', label: 'Gym & supplements', e: '🏋️', c: '#DDF5B6' },
    { id: 'study', label: 'Education & CMA', e: '📚', c: '#9FC7FF' },
    { id: 'subs', label: 'Subscriptions', e: '🔁', c: '#C9A6FF' },
    { id: 'shopping', label: 'Shopping', e: '🛍️', c: '#FF9AC1' },
    { id: 'health', label: 'Health', e: '💊', c: '#F2645A' },
    { id: 'family', label: 'Family & gifts', e: '🎁', c: '#FFB38A' },
    { id: 'fun', label: 'Entertainment', e: '🎬', c: '#B5A8FF' },
    { id: 'other', label: 'Other', e: '📦', c: '#9A9FA0' },
  ];
  const INC = [
    { id: 'salary', label: 'Salary', e: '💼', c: '#B9EF45' },
    { id: 'fees', label: 'Fees received', e: '🧾', c: '#DDF5B6' },
    { id: 'freelance', label: 'Freelance', e: '💻', c: '#8EDCF0' },
    { id: 'pocket', label: 'Pocket money', e: '👛', c: '#FFD98A' },
    { id: 'gift', label: 'Gift', e: '🎁', c: '#FF9AC1' },
    { id: 'interest', label: 'Interest', e: '🏦', c: '#A6B4FF' },
    { id: 'other_in', label: 'Other', e: '➕', c: '#9A9FA0' },
  ];
  const MODES = ['UPI', 'Cash', 'Card', 'Bank transfer'];
  const cat = (id) => EXP.find((c) => c.id === id) || INC.find((c) => c.id === id) || { id: 'transfer', label: 'Transfer', e: '🔄', c: '#8EDCF0' };
  App.EXP_CATS = EXP; App.INC_CATS = INC; App.txnCat = cat;
  const M = () => App.state.money;
  const sign = (t) => (t.type === 'income' || t.type === 'refund' || (t.type === 'transfer' && t.dir === 'in') ? 1 : -1);

  function render() {
    const month = App.ui.moneyMonth;
    const tab = App.ui.moneyTab;
    const mm = App.monthMoney(month);
    const isNow = month === mkey();
    const bal = App.balance();
    const fc = App.feeTotals('collect');
    const pct = mm.budget ? mm.spent / mm.budget : 0;
    const head = `${App.back()}
      ${App.header('Finance', 'Personal money · ₹ INR', `<button class="icon-btn lg" data-act="addTxn" data-type="expense" aria-label="Add expense">${icon('plus')}</button>`)}
      <section class="card balance-card reveal" style="--i:1">
        <div class="row between"><span class="eyebrow muted">Available balance</span><span class="card-chip"></span></div>
        <div class="huge mt8 ${bal < 0 ? 'neg' : ''}">${App.count(Math.abs(bal), { prefix: bal < 0 ? '-₹' : '₹' })}</div>
        <p class="muted small">Opening ${inr(M().opening)} + income − spending ± transfers · ${fc.outstanding ? `${inr(fc.outstanding)} still to collect (not included)` : 'nothing pending to collect'}</p>
        <div class="stat-row">${App.stat('Income', inr(mm.income))}${App.stat('Spent', inr(mm.spent))}${App.stat('Net', `<span class="${mm.net < 0 ? 'neg' : 'pos'}">${inr(mm.net)}</span>`)}</div>
        ${mm.budget ? `<div class="mt12"><div class="row between small"><span class="muted">Budget ${inr(mm.budget)}</span><span>${mm.left >= 0 ? `${inr(mm.left)} left` : `<span class="neg">${inr(-mm.left)} over</span>`}</span></div>${App.bar(pct, pct > 1 ? 'red' : pct > 0.8 ? 'amber' : 'lime')}</div>` : ''}
        ${isNow && mm.budget ? `<p class="small mt12">Safe to spend: <b class="accent-t" style="color:var(--lime)">${inr(mm.perDay)}/day</b> <span class="muted">for ${mm.daysLeft} days</span></p>` : ''}
      </section>
      ${pct > 0.8 ? `<div class="inline-alert ${pct > 1 ? 'bad' : 'warn'} reveal">${icon('alert')}<span>${pct > 1 ? `Monthly budget crossed by ${inr(mm.spent - mm.budget)}.` : `${Math.round(pct * 100)}% of this month's budget used.`}</span></div>` : ''}
      <div class="grid2 mt12 reveal" style="--i:2">
        <button class="btn btn-primary" data-act="addTxn" data-type="expense">${icon('minus')}Expense</button>
        <button class="btn btn-soft" data-act="addTxn" data-type="income">${icon('plus')}Income</button>
        <button class="btn btn-ghost" data-act="addTxn" data-type="refund">${icon('refresh')}Refund</button>
        <button class="btn btn-ghost" data-act="addTxn" data-type="transfer">${icon('swap')}Transfer</button>
      </div>
      <div class="month-nav mt16 reveal" style="--i:3">
        <button class="icon-btn" data-act="monthNav" data-n="-1" aria-label="Previous month">${icon('left')}</button><b>${App.monthLabel(month)}</b>
        <button class="icon-btn" data-act="monthNav" data-n="1" ${isNow ? 'disabled' : ''} aria-label="Next month">${icon('right')}</button></div>
      <div class="reveal" style="--i:4">${App.seg('moneyTab', [{ value: 'overview', label: 'Overview' }, { value: 'list', label: `History · ${mm.tx.length}` }, { value: 'recurring', label: 'Recurring' }, { value: 'reports', label: 'Reports' }], tab)}</div>`;
    const body = { overview: () => renderOverview(mm), list: () => renderList(mm), recurring: renderRecurring, reports: () => renderReports(month) }[tab]();
    return head + `<div class="mt12">${body}</div><div class="tabbar-space"></div>`;
  }

  function renderOverview(mm) {
    const b = M().budgets;
    const rows = EXP.map((c) => ({ ...c, v: mm.byCat[c.id] || 0 })).filter((c) => c.v > 0 || b[c.id]).sort((a, x) => x.v - a.v);
    return `<section class="card reveal" style="--i:5">
      <div class="card-head"><h3>${icon('target')}Where it went</h3><button class="link" data-act="editBudgets">Budgets ${icon('edit')}</button></div>
      ${rows.some((r) => r.v > 0) ? `<div class="donut-wrap">${App.donut(rows.filter((c) => c.v > 0).map((c) => ({ value: c.v, color: c.c })), { size: 160, stroke: 20, center: `<b>${inr(mm.spent)}</b><small>spent</small>` })}</div>` : ''}
      ${rows.length ? `<div class="cat-list">${rows.map((c) => {
        const lim = b[c.id];
        const p = lim ? c.v / lim : 0;
        return `<div class="cat-row"><span class="cat-e" style="--c:${c.c}">${c.e}</span><div class="grow"><div class="row between"><b>${c.label}</b><span class="tnum">${inr(c.v)}${lim ? `<small class="muted"> / ${inr(lim)}</small>` : ''}</span></div>
          ${lim ? App.bar(p, p > 1 ? 'red' : p > 0.8 ? 'amber' : 'lime', 'thin') : `<div class="bar thin"><span class="bar-fill" style="--w:${(c.v / (mm.spent || 1)) * 100}%;background:${c.c}"></span></div>`}</div></div>`;
      }).join('')}</div>` : App.empty('wallet', 'No spending yet', 'Log every chai and recharge. Small spends add up.')}
    </section>`;
  }

  function renderList(mm) {
    const q = App.ui.txQ.toLowerCase();
    const tx = mm.tx.filter((t) => (App.ui.txType === 'all' || t.type === App.ui.txType) && (!q || (t.note || '').toLowerCase().includes(q) || cat(t.cat).label.toLowerCase().includes(q)));
    const byDate = {};
    tx.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).forEach((t) => (byDate[t.date] = byDate[t.date] || []).push(t));
    return `<div class="search">${icon('search')}<input class="inp" type="search" placeholder="Search notes or categories" value="${esc(App.ui.txQ)}" data-change="txSearch" aria-label="Search transactions"></div>
      <div class="mt12">${App.seg('txType', [{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'refund', label: 'Refunds' }, { value: 'transfer', label: 'Transfers' }], App.ui.txType)}</div>
      ${tx.length ? Object.entries(byDate).map(([d, list], i) => {
        const net = sum(list, (t) => sign(t) * t.amount);
        return `<section class="reveal" style="--i:${i + 5}"><h4 class="group-title">${prettyDate(d)}<span class="${net < 0 ? 'neg' : 'pos'}">${net < 0 ? '−' : '+'}${inr(Math.abs(net))}</span></h4>
        <div class="card tight">${list.map((t) => { const c = cat(t.cat); return `<button class="txn" data-act="editTxn" data-id="${t.id}"><span class="cat-e" style="--c:${c.c}">${c.e}</span>
          <span class="grow"><b>${esc(t.note || c.label)}</b><small class="muted block">${esc(t.type === 'transfer' ? (t.dir === 'in' ? 'From ' : 'To ') + (t.account || 'Savings') : c.label)} · ${esc(t.mode || 'UPI')}${t.link ? ' · linked' : ''}${t.type === 'refund' ? ' · refund' : ''}</small></span>
          <b class="li-amt ${sign(t) > 0 ? 'pos' : ''}">${sign(t) > 0 ? '+' : '−'}${inr(t.amount, t.amount % 1 !== 0)}</b></button>`; }).join('')}</div></section>`;
      }).join('') : `<div class="mt12">${App.empty('rupee', 'No transactions', 'Nothing matches for this month.', `<button class="btn btn-primary" data-act="addTxn" data-type="expense">${icon('plus')}Add expense</button>`)}</div>`}`;
  }

  /* ---------- recurring ---------- */
  App.recurringDue = (month = mkey()) => {
    const today = new Date().getDate();
    return (M().recurring || []).filter((r) => r.active !== false && +r.day <= (month === mkey() ? today : 31) && !M().txns.some((t) => t.recurringId === r.id && t.date.startsWith(month)));
  };
  function renderRecurring() {
    const rec = M().recurring || [];
    const due = App.recurringDue();
    return `${due.length ? `<section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('bell')}Due this month</h3></div>
        <div class="list">${due.map((r) => `<div class="li"><span class="cat-e" style="--c:${cat(r.cat).c}">${cat(r.cat).e}</span><span class="grow"><b>${esc(r.note || cat(r.cat).label)}</b><span class="sub">Day ${r.day} · ${r.type}</span></span><b class="li-amt">${inr(r.amount)}</b><button class="btn btn-primary xs" data-act="postRecurring" data-id="${r.id}">Add</button></div>`).join('')}</div>
        <p class="field-hint">Recurring items are never added automatically. Tap Add when the money actually moves.</p></section>` : ''}
      <section class="card reveal" style="--i:6"><div class="card-head"><h3>${icon('refresh')}Recurring income & expenses</h3><button class="link" data-act="addRecurring">${icon('plus')}Add</button></div>
        ${rec.length ? `<div class="list">${rec.map((r) => `<button class="li" data-act="editRecurring" data-id="${r.id}"><span class="cat-e" style="--c:${cat(r.cat).c}">${cat(r.cat).e}</span><span class="grow"><b>${esc(r.note || cat(r.cat).label)}</b><span class="sub">Every month on day ${r.day}${r.active === false ? ' · paused' : ''}</span></span><b class="li-amt ${r.type === 'income' ? 'pos' : ''}">${r.type === 'income' ? '+' : '−'}${inr(r.amount)}</b></button>`).join('')}</div>`
          : '<p class="muted small">Add rent, recharge, gym fee, course subscriptions or salary.</p>'}</section>`;
  }
  function recurringSheet(r) {
    const isNew = !r;
    r = r || { type: 'expense', amount: '', cat: 'bills', note: '', day: 1, mode: 'UPI', active: true };
    App.sheet({
      title: isNew ? 'Recurring item' : 'Edit recurring item',
      body: `${App.field('Type', App.chips('type', [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }], r.type))}
        <div class="grid2">${App.field('Amount (₹)', App.input('amount', { type: 'number', value: r.amount, min: 1, step: 0.01, required: true, inputmode: 'decimal' }))}${App.field('Day of month', App.input('day', { type: 'number', value: r.day, min: 1, max: 28, required: true }))}</div>
        ${App.field('Category', App.select('cat', [...EXP, ...INC].map((c) => ({ value: c.id, label: `${c.e} ${c.label}` })), r.cat))}
        ${App.field('Note', App.input('note', { value: r.note, placeholder: 'e.g. Gym membership' }))}
        ${App.toggle('active', 'Active', r.active !== false)}`,
      danger: isNew ? null : { act: 'delRecurring', label: 'Delete', attrs: `data-id="${r.id}"` },
      onSubmit: (d) => {
        const amount = money(+d.amount);
        if (!(amount > 0)) return false;
        const type = d.type === 'income' ? 'income' : 'expense';
        const valid = (type === 'income' ? INC : EXP).some((c) => c.id === d.cat);
        const obj = { type, amount, cat: valid ? d.cat : type === 'income' ? 'other_in' : 'other', note: (d.note || '').trim().slice(0, 60), day: Math.min(28, Math.max(1, +d.day || 1)), mode: r.mode || 'UPI', active: !!d.active };
        if (isNew) M().recurring.push({ id: uid(), ...obj }); else Object.assign(r, obj);
        App.toast('Recurring item saved');
        App.commit();
      },
    });
  }
  App.actions.addRecurring = () => recurringSheet(null);
  App.actions.editRecurring = (el) => recurringSheet(M().recurring.find((x) => x.id === el.dataset.id));
  App.actions.delRecurring = (el) => { if (!App.confirm('Delete this recurring item? Past transactions stay.')) return; M().recurring = M().recurring.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.postRecurring = (el) => {
    const r = M().recurring.find((x) => x.id === el.dataset.id);
    if (!r || M().txns.some((t) => t.recurringId === r.id && t.date.startsWith(mkey()))) return App.toast('Already added this month', 'warn');
    const day = Math.min(+r.day, new Date().getDate());
    const date = `${mkey()}-${String(day).padStart(2, '0')}`;
    addTxn({ type: r.type, amount: r.amount, cat: r.cat, note: r.note, date, mode: r.mode, recurringId: r.id });
  };

  /* ---------- reports ---------- */
  function renderReports(month) {
    const months = Array.from({ length: 6 }, (_, i) => { const d = parseD(month + '-01'); d.setMonth(d.getMonth() - 5 + i); return mkey(d); });
    const data = months.map((m) => ({ m, ...App.monthMoney(m) }));
    const mm = App.monthMoney(month);
    const cats = EXP.map((c) => ({ ...c, v: mm.byCat[c.id] || 0 })).filter((c) => c.v).sort((a, b) => b.v - a.v);
    return `<section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('chart')}Spending · last 6 months</h3></div>
        ${App.barChart(data.map((x) => ({ label: App.MON[parseD(x.m + '-01').getMonth()], value: Math.round(x.spent), cls: x.budget && x.spent > x.budget ? 'grad-red' : 'grad-sky', title: inr(x.spent) })), { height: 130, lines: M().monthly ? [{ v: M().monthly, cls: 'warn', label: 'Budget' }] : [], fmt: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v) })}</section>
      <section class="card reveal" style="--i:6"><div class="card-head"><h3>${icon('up')}Income · last 6 months</h3></div>
        ${App.barChart(data.map((x) => ({ label: App.MON[parseD(x.m + '-01').getMonth()], value: Math.round(x.income), cls: 'grad-lime' })), { height: 110, fmt: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v) })}</section>
      <section class="card reveal" style="--i:7"><div class="card-head"><h3>${icon('list')}Category report · ${App.monthLabel(month)}</h3></div>
        ${cats.length ? `<div class="list">${cats.map((c) => `<div class="li"><span class="cat-e" style="--c:${c.c}">${c.e}</span><span class="grow"><b>${c.label}</b><span class="sub">${Math.round((c.v / (mm.spent || 1)) * 100)}% of spending</span></span><b class="li-amt">${inr(c.v)}</b></div>`).join('')}</div>` : '<p class="muted small">No spending this month.</p>'}
        <dl class="kv mt12"><dt>Income</dt><dd>${inr(mm.income)}</dd><dt>Expenses</dt><dd>${inr(mm.expense)}</dd><dt>Refunds</dt><dd>${inr(mm.refunds)}</dd><dt>Net spending</dt><dd>${inr(mm.spent)}</dd><dt>Transfers out / in</dt><dd>${inr(mm.transfersOut)} / ${inr(mm.transfersIn)}</dd><dt>Savings rate</dt><dd>${mm.income ? Math.round((mm.net / mm.income) * 100) + '%' : '—'}</dd></dl></section>`;
  }

  /* ---------- transactions ---------- */
  function addTxn(obj, { quiet = false } = {}) {
    const before = App.monthMoney(obj.date.slice(0, 7));
    const t = { id: uid(), ts: Date.now(), ...obj, amount: money(obj.amount) };
    M().txns.push(t);
    App.save();
    const after = App.monthMoney(obj.date.slice(0, 7));
    if (!quiet) {
      const c = cat(t.cat);
      App.receipt({
        kind: sign(t) > 0 ? 'in' : t.type === 'transfer' ? 'transfer' : 'out', amount: t.amount,
        title: t.note || c.label,
        lines: [['Type', t.type[0].toUpperCase() + t.type.slice(1)], ['Category', t.type === 'transfer' ? `${t.dir === 'in' ? 'From' : 'To'} ${t.account || 'Savings'}` : c.label], ['Date', prettyDate(t.date, { absolute: true, year: true })], ['Paid via', t.mode || 'UPI'], ['Balance after', inr(App.balance())], ...(after.budget && t.type === 'expense' ? [['Budget left this month', inr(after.left)]] : [])],
        no: 'TXN-' + t.date.replace(/-/g, '') + '-' + t.id.slice(-4).toUpperCase(),
        note: t.type === 'expense' && before.spent <= before.budget && after.spent > after.budget ? 'This expense crossed your monthly budget.' : '',
      });
      setTimeout(() => App.render({ quiet: false }), 50);
    }
    return t;
  }
  App.addTxn = addTxn;

  function txnSheet(t, type) {
    const isNew = !t;
    if (t && t.link) {
      App.toast(t.link.kind === 'fee' ? 'Linked to Fees & Payments. Edit or delete it there.' : 'Linked to Dubai Mission. Edit or delete it there.', 'warn');
      return;
    }
    t = t || { type: type || 'expense', amount: '', cat: type === 'income' ? 'salary' : 'food', note: '', date: dkey(), mode: 'UPI', dir: 'out', account: 'Savings' };
    const ty = t.type;
    const cats = ty === 'income' ? INC : EXP;
    App.sheet({
      title: isNew ? { expense: 'Add expense', income: 'Add income', refund: 'Add refund', transfer: 'Transfer' }[ty] : 'Edit transaction',
      body: `<div class="amount-inp"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="0.01" max="100000000" step="0.01" placeholder="0" value="${t.amount}" required aria-label="Amount"></div>
        ${App.field('Type', App.chips('type', [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'refund', label: 'Refund' }, { value: 'transfer', label: 'Transfer' }], ty), 'Changing type reloads the categories.')}
        ${ty === 'transfer'
          ? `${App.field('Direction', App.chips('dir', [{ value: 'out', label: 'Move out of balance' }, { value: 'in', label: 'Move into balance' }], t.dir || 'out'))}
             ${App.field('Other account', App.input('account', { value: t.account || 'Savings', placeholder: 'e.g. Savings, FD, Dubai fund' }))}
             ${isNew ? App.toggle('toDubai', 'Count as Dubai savings deposit', false, 'Adds the same amount to Dubai Mission (out) or withdraws it (in).') : ''}`
          : App.field(ty === 'refund' ? 'Refund for category' : 'Category', App.chips('cat', cats.map((c) => ({ value: c.id, label: `${c.e} ${c.label}` })), t.cat))}
        ${App.field('Note', App.input('note', { value: t.note, placeholder: ty === 'income' ? 'e.g. November salary' : 'e.g. Chai + samosa' }))}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: t.date, max: dkey(), required: true }))}
        ${App.field('Via', App.select('mode', MODES.map((m) => ({ value: m, label: m })), t.mode || 'UPI'))}</div>`,
      danger: isNew ? null : { act: 'deleteTxn', label: 'Delete', attrs: `data-id="${t.id}"` },
      submit: isNew ? 'Save' : 'Save changes',
      onOpen: (sh) => sh.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener('change', () => {
        const d = App.sheetData();
        txnSheet(isNew ? null : { ...t, type: r.value }, r.value);
        setTimeout(() => { const a = document.querySelector('#sheetForm [name="amount"]'); if (a) a.value = d.amount || ''; const n = document.querySelector('#sheetForm [name="note"]'); if (n) n.value = d.note || ''; }, 0);
      })),
      onSubmit: (d) => {
        const amount = money(+d.amount);
        if (!(amount > 0)) { App.toast('Enter an amount', 'bad'); return false; }
        if (d.date > dkey()) { App.toast('Date cannot be in the future', 'bad'); return false; }
        const type = ['expense', 'income', 'refund', 'transfer'].includes(d.type) ? d.type : 'expense';
        const list = type === 'income' ? INC : EXP;
        const obj = { type, amount, note: (d.note || '').trim().slice(0, 80), date: d.date || dkey(), mode: MODES.includes(d.mode) ? d.mode : 'UPI' };
        if (type === 'transfer') { obj.cat = 'transfer'; obj.dir = d.dir === 'in' ? 'in' : 'out'; obj.account = (d.account || 'Savings').trim().slice(0, 30); }
        else obj.cat = list.some((c) => c.id === d.cat) ? d.cat : type === 'income' ? 'other_in' : 'other';
        if (isNew) {
          const tx = addTxn(obj);
          if (type === 'transfer' && d.toDubai) {
            const dub = App.dubai();
            const dep = { id: uid(), date: obj.date, amount: obj.dir === 'out' ? amount : -amount, note: obj.note || 'Transfer from Finance', txnId: tx.id };
            dub.deposits.push(dep);
            tx.link = { kind: 'dubai', depId: dep.id };
            App.save();
          }
          return;
        }
        const real = M().txns.find((x) => x.id === t.id);
        if (real) { Object.assign(real, obj); if (type !== 'transfer') { delete real.dir; delete real.account; } }
        App.toast('Transaction updated');
        App.commit();
      },
    });
  }
  App.txnSheet = txnSheet;
  App.actions.addTxn = (el) => txnSheet(null, el.dataset.type);
  App.actions.editTxn = (el) => txnSheet(M().txns.find((x) => x.id === el.dataset.id));
  App.actions.deleteTxn = (el) => {
    if (!App.confirm('Delete this transaction? Your balance and budget will be recalculated.')) return;
    M().txns = M().txns.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.toast('Transaction deleted');
    App.commit();
  };
  App.actions.moneyTab = (el) => { App.ui.moneyTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.txType = (el) => { App.ui.txType = el.dataset.v; App.render({ quiet: true }); };
  App.changes.txSearch = (el) => { App.ui.txQ = el.value; App.render({ quiet: true }); };
  App.actions.monthNav = (el) => {
    const d = parseD(App.ui.moneyMonth + '-01');
    d.setMonth(d.getMonth() + +el.dataset.n);
    const next = mkey(d);
    if (next > mkey()) return;
    App.ui.moneyMonth = next;
    App.render({ quiet: true });
  };
  App.actions.editBudgets = () => {
    const b = M().budgets;
    App.sheet({
      title: 'Budgets & balance',
      body: `${App.field('Monthly spending budget (₹)', App.input('monthly', { type: 'number', value: M().monthly, min: 0, inputmode: 'numeric', required: true }))}
        ${App.field('Opening balance (₹)', App.input('opening', { type: 'number', value: M().opening || 0, step: 0.01, inputmode: 'decimal' }), 'Money you had before you started logging in LifeOS.')}
        <h4 class="group-title">Category limits (optional)</h4>
        <div class="budget-grid">${EXP.map((c) => `<label class="budget-row"><span>${c.e} ${c.label}</span><input class="inp sm" type="number" inputmode="numeric" min="0" name="b_${c.id}" value="${b[c.id] || ''}" placeholder="—"></label>`).join('')}</div>`,
      onSubmit: (d) => {
        M().monthly = Math.max(0, Math.round(+d.monthly || 0));
        M().opening = money(+d.opening || 0);
        EXP.forEach((c) => { const v = Math.round(+d['b_' + c.id] || 0); if (v > 0) b[c.id] = v; else delete b[c.id]; });
        App.toast('Budgets saved');
        App.commit();
      },
    });
  };

  App.views.money = { render };
})();
