'use strict';
/* Fees & Payments: simple receivables (money to collect) and payables (money to pay) with installments.
   LifeOS never sends payment requests or moves money. Payments are records you enter. */
(function () {
  const { icon, esc, inr, dkey, mkey, uid, prettyDate, sum, money } = App;
  App.ui.feesTab = 'collect';
  App.ui.feesFilter = 'open';
  const F = () => App.state.fees;
  const STATUS = { pending: 'Pending', partial: 'Partially Paid', paid: 'Paid', overdue: 'Overdue' };
  const CATS = {
    collect: ['Tuition / coaching fee', 'Service fee', 'Freelance work', 'Loan given', 'Other'],
    pay: ['CMA examination fee', 'Course subscription', 'Education expense', 'Gym membership', 'Loan repayment', 'Other payment'],
  };
  const METHODS = ['UPI', 'Cash', 'Bank transfer', 'Card', 'Cheque'];
  const recNo = (r) => (r.kind === 'collect' ? 'RCV-' : 'PAY-') + r.id.slice(-5).toUpperCase();

  function render() {
    const kind = App.ui.feesTab;
    const t = App.feeTotals(kind);
    const today = dkey();
    const month = mkey();
    const recs = F().records.filter((r) => r.kind === kind);
    const payThisMonth = sum(recs.flatMap((r) => r.payments || []).filter((p) => p.date.startsWith(month)), (p) => p.amount);
    const filt = App.ui.feesFilter;
    const shown = recs.map((r) => ({ r, c: App.feeCalc(r, today) }))
      .filter(({ c }) => (filt === 'open' ? c.status !== 'paid' : filt === 'paid' ? c.status === 'paid' : true))
      .sort((a, b) => ({ overdue: 0, partial: 1, pending: 2, paid: 3 }[a.c.status] - { overdue: 0, partial: 1, pending: 2, paid: 3 }[b.c.status]) || (a.r.due || '9999').localeCompare(b.r.due || '9999'));
    const rate = t.total ? t.received / t.total : 0;
    return `${App.back()}
      ${App.header('Fees & Payments', 'Receivables · payables', `<button class="icon-btn lg" data-act="newFee" aria-label="New record">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('feesTab', [{ value: 'collect', label: 'Money to collect' }, { value: 'pay', label: 'Money to pay' }], kind)}</div>
      <section class="card hero mt12 reveal" style="--i:1">
        <div class="hero-main">
          ${App.donut([{ value: t.received, color: 'var(--lime)' }, { value: Math.max(0, t.outstanding - t.overdue), color: 'var(--sky)' }, { value: t.overdue, color: 'var(--red)' }].filter((x) => x.value > 0), { size: 132, stroke: 16, center: `<b class="small">${Math.round(rate * 100)}%</b><small>${kind === 'collect' ? 'collected' : 'paid'}</small>` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:var(--lime)"></span><div><b>${inr(t.received)}</b><small>${kind === 'collect' ? 'Received' : 'Paid'}</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--sky)"></span><div><b>${inr(t.outstanding)}</b><small>Outstanding</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--red)"></span><div><b class="${t.overdue ? 'neg' : ''}">${inr(t.overdue)}</b><small>Overdue · ${t.overdueCount}</small></div></div>
          </div>
        </div>
        <div class="stat-row">${App.stat('Total billed', inr(t.total))}${App.stat(`${kind === 'collect' ? 'Collected' : 'Paid'} in ${App.MON[new Date().getMonth()]}`, inr(payThisMonth))}${App.stat('Open records', t.open)}</div>
      </section>
      ${t.overdueCount ? `<div class="inline-alert bad reveal">${icon('alert')}<span><b>${inr(t.overdue)} overdue</b> across ${App.plural(t.overdueCount, 'record')}. ${kind === 'collect' ? 'Follow up personally; LifeOS does not send reminders to anyone.' : 'Pay or update the due date.'}</span></div>` : ''}
      <div class="mt16 reveal" style="--i:2">${App.seg('feesFilter', [{ value: 'open', label: 'Open' }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' }], filt)}</div>
      <div class="mt12">${shown.length ? shown.map(({ r, c }, i) => feeCard(r, c, i)).join('') : App.empty('receipt', kind === 'collect' ? 'Nothing to collect' : 'Nothing to pay', kind === 'collect' ? 'Add a fee someone owes you. Record installments as they pay.' : 'Add CMA exam fees, course subscriptions or memberships with due dates.', `<button class="btn btn-primary" data-act="newFee">${icon('plus')}New record</button>`)}</div>
      <div class="tabbar-space"></div>`;
  }

  function feeCard(r, c, i) {
    return `<button class="card fee-card reveal" style="--i:${i + 3}" data-act="openFee" data-id="${r.id}">
      <div class="fee-head"><div class="grow"><b>${esc(r.party || r.description)}</b><small class="muted block">${esc(r.description || r.category || '')}</small>
        <div class="row gap-s mt8 wrap"><span class="status ${c.status}">${STATUS[c.status]}</span>${r.due ? `<span class="pill ${c.status === 'overdue' ? 'bad' : ''}">${icon('cal')}${c.status === 'overdue' ? `${c.daysOverdue}d overdue` : 'Due ' + prettyDate(r.due)}</span>` : ''}${(r.payments || []).length ? `<span class="pill">${App.plural(r.payments.length, 'installment')}</span>` : ''}</div></div>
        <div class="fee-amt"><b>${inr(c.outstanding, c.outstanding % 1 !== 0)}</b><small class="muted">of ${inr(r.amount)}</small></div></div>
      ${App.bar(r.amount ? c.received / r.amount : 0, c.status === 'overdue' ? 'red' : c.status === 'paid' ? 'lime' : 'sky', 'thin')}
    </button>`;
  }

  /* ---------- record detail ---------- */
  App.actions.openFee = (el) => openFee(el.dataset.id);
  function openFee(id) {
    const r = F().records.find((x) => x.id === id);
    if (!r) return;
    const c = App.feeCalc(r);
    App.sheet({
      title: r.party || r.description,
      body: `<div class="row between"><span class="status ${c.status}">${STATUS[c.status]}</span><span class="muted small">${recNo(r)}</span></div>
        <div class="stat-row">${App.stat(r.kind === 'collect' ? 'Fee amount' : 'Amount due', inr(r.amount, r.amount % 1 !== 0))}${App.stat(r.kind === 'collect' ? 'Received' : 'Paid', inr(c.received, c.received % 1 !== 0))}${App.stat('Outstanding', `<span class="${c.outstanding ? (c.status === 'overdue' ? 'neg' : '') : 'pos'}">${inr(c.outstanding, c.outstanding % 1 !== 0)}</span>`)}</div>
        ${App.bar(r.amount ? c.received / r.amount : 0, c.status === 'paid' ? 'lime' : 'sky')}
        <dl class="kv mt16">${[['Description', r.description], ['Category', r.category], ['Issued', r.issued && prettyDate(r.issued, { absolute: true, year: true })], ['Due', r.due && prettyDate(r.due, { absolute: true, year: true })], ['Method', r.method], ['Reference', r.ref], ['Notes', r.notes]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <h4 class="group-title">Payment history<span>${(r.payments || []).length}</span></h4>
        ${(r.payments || []).length ? `<div class="card flat tight">${r.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).map((p) => `<div class="pay-row"><span><b>${inr(p.amount, p.amount % 1 !== 0)}</b><small class="muted block">${prettyDate(p.date)} · ${esc(p.method || '')}${p.ref ? ' · ' + esc(p.ref) : ''}${p.txnId ? ' · in Finance' : ''}</small></span>
          <span class="row gap-s"><button type="button" class="icon-btn sm" data-act="feeReceipt" data-id="${r.id}" data-p="${p.id}" aria-label="Receipt">${icon('receipt')}</button><button type="button" class="icon-btn sm" data-act="delPayment" data-id="${r.id}" data-p="${p.id}" aria-label="Delete payment">${icon('trash')}</button></span></div>`).join('')}</div>` : '<p class="muted small">No payments recorded yet.</p>'}
        <div class="row gap mt16"><button type="button" class="btn btn-ghost" data-act="editFee" data-id="${r.id}">${icon('edit')}Edit</button>
        ${c.outstanding > 0 ? `<button type="button" class="btn btn-primary grow" data-act="recordPayment" data-id="${r.id}">${icon('check')}${r.kind === 'collect' ? 'Record payment received' : 'Record payment made'}</button>` : `<span class="badge ok grow" style="justify-content:center;height:48px">${icon('check')}Fully ${r.kind === 'collect' ? 'collected' : 'paid'}</span>`}</div>`,
      danger: { act: 'delFee', label: 'Delete', attrs: `data-id="${r.id}"` },
      foot: '',
    });
  }

  function feeSheet(r, kind) {
    const isNew = !r;
    kind = r ? r.kind : kind || App.ui.feesTab;
    r = r || { kind, party: '', description: '', category: CATS[kind][0], amount: '', issued: dkey(), due: '', method: 'UPI', ref: '', notes: '' };
    App.sheet({
      title: isNew ? (kind === 'collect' ? 'New fee to collect' : 'New payment to make') : 'Edit record',
      body: `${App.field(kind === 'collect' ? 'Person / customer' : 'Pay to', App.input('party', { value: r.party, required: true, placeholder: kind === 'collect' ? 'Name' : 'e.g. IMA, gym, institute' }))}
        ${App.field('Description', App.input('description', { value: r.description, placeholder: kind === 'collect' ? 'e.g. Accounts tuition – Nov' : 'e.g. CMA Part 1 exam fee' }))}
        ${App.field('Category', App.select('category', CATS[kind].map((x) => ({ value: x, label: x })), r.category))}
        <div class="amount-inp"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0" value="${r.amount}" required aria-label="Amount"></div>
        <div class="grid2">${App.field('Date issued', App.input('issued', { type: 'date', value: r.issued }))}${App.field('Due date', App.input('due', { type: 'date', value: r.due }))}</div>
        <div class="grid2">${App.field('Payment method', App.select('method', METHODS.map((m) => ({ value: m, label: m })), r.method))}${App.field('Reference no.', App.input('ref', { value: r.ref, placeholder: 'Invoice / UTR' }))}</div>
        ${App.field('Notes', App.textarea('notes', r.notes, { rows: 2 }))}
        ${isNew ? App.field(kind === 'collect' ? 'Amount already received (optional)' : 'Amount already paid (optional)', App.input('initial', { type: 'number', min: 0, step: 0.01, inputmode: 'decimal', placeholder: '0' }), 'Recorded as the first installment, dated today.') : ''}`,
      submit: isNew ? 'Create record' : 'Save',
      onSubmit: (d) => {
        const amount = money(+d.amount);
        if (!(amount > 0)) { App.toast('Enter the amount', 'bad'); return false; }
        const received = r.payments ? sum(r.payments, (p) => p.amount) : 0;
        if (!isNew && amount < received) { App.toast(`Amount cannot be less than the ${inr(received)} already recorded`, 'bad'); return false; }
        const initial = money(+d.initial || 0);
        if (initial > amount) { App.toast('Initial payment is more than the amount', 'bad'); return false; }
        const obj = { party: d.party.trim().slice(0, 60), description: (d.description || '').trim().slice(0, 100), category: d.category, amount, issued: d.issued || '', due: d.due || '', method: d.method, ref: (d.ref || '').trim().slice(0, 40), notes: (d.notes || '').slice(0, 400) };
        if (isNew) {
          const rec = { id: uid(), kind, created: dkey(), payments: [], ...obj };
          F().records.push(rec);
          if (initial > 0) addPayment(rec, { amount: initial, date: dkey(), method: obj.method, ref: obj.ref, note: 'Initial payment', toFinance: true }, true);
          App.toast('Record created');
        } else { Object.assign(r, obj); App.toast('Saved'); }
        App.commit();
      },
    });
  }
  App.actions.newFee = () => feeSheet(null, App.ui.feesTab);
  App.actions.editFee = (el) => feeSheet(F().records.find((x) => x.id === el.dataset.id));
  App.actions.delFee = (el) => {
    const r = F().records.find((x) => x.id === el.dataset.id);
    const linked = (r.payments || []).filter((p) => p.txnId).length;
    if (!App.confirm(`Delete this record${linked ? ` and its ${linked} linked Finance transaction(s)` : ''}? This cannot be undone.`)) return;
    const ids = (r.payments || []).map((p) => p.txnId).filter(Boolean);
    App.state.money.txns = App.state.money.txns.filter((t) => !ids.includes(t.id));
    F().records = F().records.filter((x) => x.id !== r.id);
    App.closeSheet();
    App.toast('Record deleted');
    App.commit();
  };

  /* ---------- payments ---------- */
  function addPayment(r, p, quiet) {
    const pay = { id: uid(), date: p.date, amount: money(p.amount), method: p.method, ref: p.ref || '', note: p.note || '' };
    r.payments = r.payments || [];
    r.payments.push(pay);
    if (p.toFinance) {
      const tx = { id: uid(), ts: Date.now(), type: r.kind === 'collect' ? 'income' : 'expense', amount: pay.amount, cat: r.kind === 'collect' ? 'fees' : /CMA|Course|Education/i.test(r.category) ? 'study' : /Gym/i.test(r.category) ? 'gym' : 'other',
        note: `${r.kind === 'collect' ? 'From' : 'To'} ${r.party}${r.description ? ' · ' + r.description : ''}`.slice(0, 80), date: pay.date, mode: METHODS.includes(pay.method) ? (pay.method === 'Cheque' ? 'Bank transfer' : pay.method) : 'UPI', link: { kind: 'fee', recId: r.id, payId: pay.id } };
      App.state.money.txns.push(tx);
      pay.txnId = tx.id;
    }
    App.save();
    if (!quiet) {
      const c = App.feeCalc(r);
      App.receipt({
        kind: r.kind === 'collect' ? 'in' : 'out', amount: pay.amount, title: `${r.kind === 'collect' ? 'Received from' : 'Paid to'} ${r.party}`,
        lines: [['For', r.description || r.category], ['Date', prettyDate(pay.date, { absolute: true, year: true })], ['Method', pay.method], ...(pay.ref ? [['Reference', pay.ref]] : []), ['Total', inr(r.amount)], [r.kind === 'collect' ? 'Received so far' : 'Paid so far', inr(c.received)], ['Outstanding', inr(c.outstanding)]],
        no: `${recNo(r)}-${r.payments.length}`, note: pay.txnId ? 'Also recorded in Finance.' : 'Not recorded in Finance.',
      });
      if (c.status === 'paid') setTimeout(() => { App.closeOverlay(); setTimeout(() => App.unlock('fee-paid-' + r.id, r.kind === 'collect' ? 'Fee fully collected' : 'Payment cleared', `${r.party} · ${inr(r.amount)}`, 'receipt'), 300); }, 2600);
    }
    return pay;
  }
  function paymentSheet(r) {
    const c = App.feeCalc(r);
    App.sheet({
      title: r.kind === 'collect' ? `Payment from ${r.party}` : `Payment to ${r.party}`,
      body: `<p class="muted small ta-c">Outstanding ${inr(c.outstanding, c.outstanding % 1 !== 0)} of ${inr(r.amount)}</p>
        <div class="amount-inp"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="0.01" max="${c.outstanding}" step="0.01" value="${c.outstanding}" required aria-label="Amount"></div>
        <div class="preset-row">${[0.25, 0.5, 1].map((k) => `<button type="button" class="pchip" data-act="preset" data-f="amount" data-v="${money(c.outstanding * k)}">${k === 1 ? 'Full' : k * 100 + '%'} · ${inr(c.outstanding * k)}</button>`).join('')}</div>
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: dkey(), max: dkey(), required: true }))}${App.field('Method', App.select('method', METHODS.map((m) => ({ value: m, label: m })), r.method || 'UPI'))}</div>
        ${App.field('Reference no.', App.input('ref', { placeholder: 'UTR / receipt no.' }))}
        ${App.field('Note', App.input('note', { placeholder: 'Optional' }))}
        ${App.toggle('toFinance', r.kind === 'collect' ? 'Add to Finance as income' : 'Add to Finance as an expense', true, 'Recommended. Only actual payments reach your balance; the unpaid amount never does.')}`,
      submit: 'Confirm payment',
      onSubmit: (d) => {
        const amt = money(+d.amount);
        const cur = App.feeCalc(r);
        if (!(amt > 0)) { App.toast('Enter an amount', 'bad'); return false; }
        if (amt > cur.outstanding + 0.001) { App.toast(`Cannot exceed outstanding ${inr(cur.outstanding)}`, 'bad'); return false; }
        addPayment(r, { amount: amt, date: d.date || dkey(), method: d.method, ref: (d.ref || '').trim(), note: (d.note || '').trim(), toFinance: !!d.toFinance });
        setTimeout(() => App.render({ quiet: true }), 30);
      },
    });
  }
  App.actions.recordPayment = (el) => paymentSheet(F().records.find((x) => x.id === el.dataset.id));
  App.actions.delPayment = (el) => {
    const r = F().records.find((x) => x.id === el.dataset.id);
    const p = r && r.payments.find((x) => x.id === el.dataset.p);
    if (!p || !App.confirm(`Delete this ${inr(p.amount)} payment${p.txnId ? ' and its Finance transaction' : ''}?`)) return;
    r.payments = r.payments.filter((x) => x.id !== p.id);
    if (p.txnId) App.state.money.txns = App.state.money.txns.filter((t) => t.id !== p.txnId);
    App.save();
    openFee(r.id);
    App.render({ quiet: true });
  };
  App.actions.feeReceipt = (el) => {
    const r = F().records.find((x) => x.id === el.dataset.id);
    const idx = r.payments.findIndex((x) => x.id === el.dataset.p);
    const p = r.payments[idx];
    const paidTo = sum(r.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).filter((x) => x.date <= p.date), (x) => x.amount);
    App.closeSheet();
    App.receipt({ kind: r.kind === 'collect' ? 'in' : 'out', amount: p.amount, title: `${r.kind === 'collect' ? 'Received from' : 'Paid to'} ${r.party}`,
      lines: [['For', r.description || r.category], ['Date', prettyDate(p.date, { absolute: true, year: true })], ['Method', p.method], ...(p.ref ? [['Reference', p.ref]] : []), ['Total', inr(r.amount)], ['Paid up to this date', inr(paidTo)]],
      no: `${recNo(r)}-${idx + 1}` });
  };
  App.collectPaymentPicker = () => {
    const open = F().records.filter((r) => r.kind === 'collect' && App.feeCalc(r).status !== 'paid');
    App.sheet({
      title: 'Collect payment',
      body: `${open.length ? `<div class="list">${open.map((r) => { const c = App.feeCalc(r); return `<button class="li" data-act="recordPayment" data-id="${r.id}"><span class="grow"><b>${esc(r.party)}</b><span class="sub">${esc(r.description || r.category)} · <span class="status ${c.status}" style="padding:1px 7px">${STATUS[c.status]}</span></span></span><b class="li-amt">${inr(c.outstanding)}</b></button>`; }).join('')}</div>` : '<p class="muted small">No open fees to collect.</p>'}
        <button type="button" class="btn btn-soft btn-block mt16" data-act="newFeeCollect">${icon('plus')}New fee to collect</button>`,
    });
  };
  App.actions.newFeeCollect = () => feeSheet(null, 'collect');

  App.actions.feesTab = (el) => { App.ui.feesTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.feesFilter = (el) => { App.ui.feesFilter = el.dataset.v; App.render({ quiet: true }); };
  App.views.fees = { render };
})();
