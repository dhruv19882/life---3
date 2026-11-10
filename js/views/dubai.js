'use strict';
/* Dubai Mission: relocation roadmap, savings plan, expense planner and career-readiness checklist.
   No visa or job offer is assumed. Unknown costs stay marked "needs research" until you enter and verify them. */
(function () {
  const { icon, esc, inr, dkey, uid, prettyDate, sum, money, r1 } = App;

  // Simple skyline silhouette (original drawing) used as a savings progress visual.
  const BLD = [[6, 22, 46], [30, 18, 70], [50, 26, 54], [78, 16, 88], [96, 22, 64], [176, 20, 76], [198, 28, 58], [228, 16, 94], [246, 24, 66], [272, 18, 50], [292, 24, 80]];
  const BURJ = 'M138 150 L138 96 L142 96 L142 70 L146 70 L146 44 L149 44 L149 18 L151 4 L153 18 L153 44 L156 44 L156 70 L160 70 L160 96 L164 96 L164 150 Z';
  function skyline(p) {
    const shapes = BLD.map(([x, w, h]) => `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" rx="2"/>`).join('') + `<path d="${BURJ}"/>`;
    return `<svg class="skyline" viewBox="0 0 320 150" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Savings progress ${Math.round(p * 100)}%">
      <defs><clipPath id="skyClip">${shapes}</clipPath><linearGradient id="skyGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#B9EF45"/><stop offset="1" stop-color="#8EDCF0"/></linearGradient></defs>
      <g fill="currentColor" opacity="0.12">${shapes}</g>
      <g clip-path="url(#skyClip)"><rect class="sky-fill" x="0" y="0" width="320" height="150" fill="url(#skyGrad)" style="--p:${p}"/></g>
      <line x1="0" x2="320" y1="149.5" y2="149.5" stroke="currentColor" opacity="0.2"/>
    </svg>`;
  }

  function render() {
    const d = App.dubai();
    const c = App.dubaiCalc();
    const daysLeft = c.daysLeft;
    const target = c.target;
    const personal = d.costs.filter((x) => x.group === 'personal');
    const employment = d.costs.filter((x) => x.group === 'employment');
    const pctCheck = c.checklistTotal ? c.checklistDone / c.checklistTotal : 0;
    const phase = (ids) => { const items = d.checklist.filter((x) => ids.includes(x.id)); return items.length ? items.filter((x) => x.done).length / items.length : 0; };
    const roadmap = [
      { t: 'Prepare', s: 'CMA, skills, portfolio', p: phase(['c0', 'c1', 'c2']) },
      { t: 'Search', s: 'CV, interviews, research, applications', p: phase(['c3', 'c4', 'c5', 'c6', 'c7', 'c8']) },
      { t: 'Secure', s: 'Legitimate offer, verify visa rules', p: phase(['c9', 'c10']) },
      { t: 'Move', s: d.confirmedDate && d.travelConfirmed ? `Travel on ${prettyDate(d.confirmedDate, { absolute: true, year: true })}` : 'Book only after an offer and visa are confirmed', p: d.travelConfirmed ? 1 : 0 },
    ];
    const cdBox = (v, l) => `<div class="cd-box"><b>${v}</b><small>${l}</small></div>`;
    return `${App.back()}
      ${App.header('Dubai Mission', 'Relocation & savings planner', `<button class="icon-btn lg" data-act="dubaiDates" aria-label="Edit dates">${icon('cal')}</button>`)}
      <section class="card dubai-hero reveal" style="--i:1">
        <div class="row between"><span class="eyebrow muted">${c.confirmed ? 'Confirmed travel date' : 'Target relocation date'}</span>
          ${target ? `<span class="date-tag ${c.confirmed ? 'confirmed' : 'target'}">${icon(c.confirmed ? 'check' : 'flag')}${prettyDate(target, { absolute: true, year: true })} · ${c.confirmed ? 'Confirmed' : 'Target only'}</span>` : ''}</div>
        ${target ? (daysLeft >= 0 ? `<div class="countdown">${cdBox(App.num(daysLeft), 'days')}${cdBox(Math.floor(daysLeft / 7), 'weeks')}${cdBox(r1(c.monthsLeft), 'months')}</div>`
          : `<p class="mt12"><b>The target date has passed.</b> <span class="muted">Set a new target whenever you are ready.</span></p>`)
          : `<p class="mt12 muted">No target date yet. Set one to get a countdown and a monthly savings target.</p><button class="btn btn-primary mt12" data-act="dubaiDates">${icon('cal')}Set target date</button>`}
        ${skyline(c.progress)}
        <div class="row between"><div><span class="huge">${App.count(c.saved, { prefix: '₹' })}</span><small class="muted block">saved of ${c.required ? inr(c.required) : 'an amount you have not estimated yet'}</small></div><b class="big">${c.required ? Math.round(c.progress * 100) + '%' : '—'}</b></div>
        <div class="stat-row">${App.stat('Remaining', inr(c.remaining))}${App.stat('Monthly target', c.monthlyTarget ? inr(c.monthlyTarget) : '—', c.monthsLeft ? `${r1(c.monthsLeft)} months left` : '')}${App.stat('This month', inr(c.thisMonth))}</div>
        <div class="row gap mt12"><button class="btn btn-primary grow" data-act="dubaiDeposit" data-n="1">${icon('plus')}Add savings</button><button class="btn btn-ghost" data-act="dubaiDeposit" data-n="-1">${icon('minus')}Withdraw</button></div>
      </section>
      ${c.unknown ? `<div class="inline-alert warn reveal">${icon('alert')}<span><b>${App.plural(c.unknown, 'cost item')} not estimated yet.</b> Required savings is incomplete until you research and enter them.</span></div>` : ''}
      ${c.unverified && !c.unknown ? `<div class="inline-alert info reveal">${icon('info')}<span>${App.plural(c.unverified, 'estimate')} not verified yet. Check official and employer sources before relying on them.</span></div>` : ''}

      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('road')}Relocation roadmap</h3><span class="muted small">${c.checklistDone}/${c.checklistTotal} milestones</span></div>
        <div class="timeline">${roadmap.map((r, i) => `<div class="tl-item ${r.p >= 1 ? 'done' : roadmap.slice(0, i).every((x) => x.p >= 1) ? 'next' : ''}"><b>${r.t}</b><small class="muted block">${esc(r.s)}</small>${App.bar(r.p, r.p >= 1 ? 'lime' : 'sky', 'thin')}</div>`).join('')}</div></section>

      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('wallet')}Personal relocation costs</h3><button class="link" data-act="dubaiAddCost" data-g="personal">${icon('plus')}Add</button></div>
        ${personal.map(costRow).join('')}
        <div class="row between mt12"><b>Personal total</b><b class="tnum">${inr(sum(personal.filter((x) => x.amount !== null && x.amount !== ''), (x) => x.amount))}</b></div></section>

      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('briefcase')}Employment-related (kept separate)</h3><button class="link" data-act="dubaiAddCost" data-g="employment">${icon('plus')}Add</button></div>
        <p class="muted small">Visa and employment costs are often handled by the employer. They are excluded from your savings target unless you include them.</p>
        ${employment.map(costRow).join('')}
        <label class="toggle-row mt8"><span class="grow"><b>Include in savings target</b></span><input type="checkbox" class="switch" data-change="dubaiIncEmp" ${d.includeEmployment ? 'checked' : ''}></label></section>

      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('check')}Career readiness checklist</h3><span class="muted small">${Math.round(pctCheck * 100)}%</span></div>
        ${App.bar(pctCheck, 'lime')}
        <div class="mt12">${d.checklist.map((x) => `<div class="ms ${x.done ? 'done' : ''}"><button class="check sm ${x.done ? 'on' : ''}" data-act="dubaiCheck" data-id="${x.id}" aria-label="Toggle">${icon('check')}</button>
          <button class="grow ta-l" data-act="dubaiCheckEdit" data-id="${x.id}"><span class="ms-t small"><b>${esc(x.title)}</b></span>${x.done && x.doneAt ? `<small class="muted block">Done ${prettyDate(x.doneAt)}</small>` : ''}${x.note ? `<small class="muted block">${esc(x.note)}</small>` : ''}</button></div>`).join('')}</div>
        <button class="btn btn-ghost btn-block mt12" data-act="dubaiCheckAdd">${icon('plus')}Add milestone</button></section>

      <section class="card reveal" style="--i:6"><div class="card-head"><h3>${icon('list')}Savings history</h3><span class="muted small">Start ${inr(d.startSavings)}</span></div>
        ${d.deposits.length ? `<div class="list">${d.deposits.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((x) => `<div class="li"><span class="grow"><b>${esc(x.note || (x.amount >= 0 ? 'Savings added' : 'Withdrawal'))}</b><span class="sub">${prettyDate(x.date)}${x.txnId ? ' · linked to Finance' : ''}</span></span><b class="li-amt ${x.amount >= 0 ? 'pos' : 'neg'}">${x.amount >= 0 ? '+' : '−'}${inr(Math.abs(x.amount))}</b><button class="icon-btn sm" data-act="dubaiDelDep" data-id="${x.id}" aria-label="Delete">${icon('trash')}</button></div>`).join('')}</div>` : '<p class="muted small">No deposits yet.</p>'}</section>
      <p class="section-note">${icon('shield')}<span>This planner does not assume a visa or job offer. Verify visa and employment requirements only with the employer and official UAE government sources.</span></p>
      <div class="tabbar-space"></div>`;
  }
  function costRow(x) {
    const unknown = x.amount === null || x.amount === '';
    return `<button class="cost-row" style="width:100%;text-align:left" data-act="dubaiCost" data-id="${x.id}"><span><b class="small">${esc(x.label)}</b>${x.note ? `<small class="muted block">${esc(x.note)}</small>` : ''}</span>
      <span class="ta-r"><span class="amt ${unknown ? 'unknown' : ''}">${unknown ? 'Needs research' : inr(x.amount)}</span><small class="block ${x.verified ? 'pos' : 'faint'}">${x.verified ? '✓ verified' : 'unverified'}</small></span></button>`;
  }

  App.actions.dubaiDates = () => {
    const d = App.dubai();
    App.sheet({
      title: 'Dubai dates',
      body: `${App.field('Target relocation date', App.input('targetDate', { type: 'date', value: d.targetDate, min: dkey() }), 'A goal you plan towards. Change it any time.')}
        <div class="divider"></div>
        ${App.field('Confirmed travel date', App.input('confirmedDate', { type: 'date', value: d.confirmedDate }), 'Only fill this in once you have a real offer, visa and booked ticket.')}
        ${App.toggle('travelConfirmed', 'Travel is confirmed', d.travelConfirmed, 'Offer accepted, visa approved and ticket booked.')}
        ${App.field('Savings before tracking (₹)', App.input('startSavings', { type: 'number', value: d.startSavings, min: 0, step: 1, inputmode: 'numeric' }))}`,
      onSubmit: (v) => {
        if (v.travelConfirmed && !v.confirmedDate) { App.toast('Add the confirmed travel date first', 'bad'); return false; }
        const wasConfirmed = d.travelConfirmed;
        d.targetDate = v.targetDate || '';
        d.confirmedDate = v.confirmedDate || '';
        d.travelConfirmed = !!v.travelConfirmed;
        d.startSavings = money(+v.startSavings || 0);
        if (!wasConfirmed && d.travelConfirmed) App.unlock('dubai-confirmed', 'Dubai travel confirmed', prettyDate(d.confirmedDate, { absolute: true, year: true }), 'plane');
        else App.toast('Dates saved');
        App.commit();
      },
    });
  };
  App.actions.dubaiDeposit = (el) => {
    const out = +el.dataset.n < 0;
    App.sheet({
      title: out ? 'Withdraw from Dubai savings' : 'Add to Dubai savings',
      body: `<div class="amount-inp"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="1" step="0.01" placeholder="0" required aria-label="Amount"></div>
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: dkey(), max: dkey(), required: true }))}${App.field('Note', App.input('note', { placeholder: 'e.g. November saving' }))}</div>
        ${App.toggle('toFinance', out ? 'Record as transfer into balance in Finance' : 'Record as transfer out of balance in Finance', true, 'Keeps your spendable balance accurate. Transfers are not counted as spending.')}`,
      submit: out ? 'Withdraw' : 'Add savings',
      onSubmit: (v) => {
        const amt = money(+v.amount);
        if (!(amt > 0)) return false;
        const c0 = App.dubaiCalc();
        if (out && amt > c0.saved) { App.toast(`You have ${inr(c0.saved)} saved`, 'bad'); return false; }
        const d = App.dubai();
        const dep = { id: uid(), date: v.date || dkey(), amount: out ? -amt : amt, note: (v.note || '').trim().slice(0, 60) };
        if (v.toFinance) {
          const tx = { id: uid(), ts: Date.now(), type: 'transfer', dir: out ? 'in' : 'out', account: 'Dubai fund', cat: 'transfer', amount: amt, note: dep.note || (out ? 'From Dubai savings' : 'To Dubai savings'), date: dep.date, mode: 'Bank transfer', link: { kind: 'dubai', depId: dep.id } };
          App.state.money.txns.push(tx);
          dep.txnId = tx.id;
        }
        d.deposits.push(dep);
        App.save();
        const c = App.dubaiCalc();
        App.receipt({ kind: out ? 'in' : 'transfer', amount: amt, title: out ? 'Withdrawn from Dubai fund' : 'Moved to Dubai fund', lines: [['Date', prettyDate(dep.date, { absolute: true, year: true })], ['Dubai savings now', inr(c.saved)], ['Remaining', inr(c.remaining)], ['Progress', c.required ? Math.round(c.progress * 100) + '%' : 'set estimates']], no: 'DXB-' + dep.id.slice(-5).toUpperCase(), note: dep.txnId ? 'Recorded in Finance as a transfer.' : '' });
        for (const m of [0.25, 0.5, 0.75, 1]) if (c0.required && c0.progress < m && c.progress >= m) setTimeout(() => { App.closeOverlay(); App.unlock('dubai-' + m * 100, `Dubai fund ${m * 100}% saved`, `${inr(c.saved)} of ${inr(c.required)}`, 'plane'); }, 2400);
        setTimeout(() => App.render({ quiet: true }), 30);
      },
    });
  };
  App.actions.dubaiDelDep = (el) => {
    const d = App.dubai();
    const dep = d.deposits.find((x) => x.id === el.dataset.id);
    if (!dep || !App.confirm(`Delete this entry${dep.txnId ? ' and its Finance transfer' : ''}?`)) return;
    d.deposits = d.deposits.filter((x) => x.id !== dep.id);
    if (dep.txnId) App.state.money.txns = App.state.money.txns.filter((t) => t.id !== dep.txnId);
    App.commit();
  };
  function costSheet(x, group) {
    const d = App.dubai();
    const isNew = !x;
    x = x || { id: uid(), group, label: '', amount: null, verified: false, note: '' };
    App.sheet({
      title: isNew ? 'Add cost' : x.label,
      body: `${App.field('Item', App.input('label', { value: x.label, required: true }))}
        ${App.field('Estimated amount (₹)', App.input('amount', { type: 'number', value: x.amount ?? '', min: 0, step: 1, inputmode: 'numeric', placeholder: 'Leave empty if unknown' }), 'Leave empty to keep it marked “needs research”.')}
        ${App.toggle('verified', 'Verified from a reliable source', x.verified, 'e.g. airline quote, landlord, employer, official UAE portal')}
        ${App.field('Notes / source', App.textarea('note', x.note, { rows: 2 }))}`,
      danger: isNew ? null : { act: 'dubaiDelCost', label: 'Remove', attrs: `data-id="${x.id}"` },
      onSubmit: (v) => {
        x.label = v.label.trim().slice(0, 60);
        x.amount = v.amount === '' ? null : money(+v.amount);
        x.verified = !!v.verified && x.amount !== null;
        x.note = (v.note || '').slice(0, 200);
        if (isNew) d.costs.push(x);
        App.toast('Estimate saved');
        App.commit();
      },
    });
  }
  App.actions.dubaiCost = (el) => costSheet(App.dubai().costs.find((x) => x.id === el.dataset.id));
  App.actions.dubaiAddCost = (el) => costSheet(null, el.dataset.g);
  App.actions.dubaiDelCost = (el) => { if (!App.confirm('Remove this cost item?')) return; const d = App.dubai(); d.costs = d.costs.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.changes.dubaiIncEmp = (el) => { App.dubai().includeEmployment = el.checked; App.commit(); };
  App.actions.dubaiCheck = (el) => {
    const d = App.dubai();
    const x = d.checklist.find((c) => c.id === el.dataset.id);
    x.done = !x.done;
    x.doneAt = x.done ? dkey() : '';
    App.buzz(x.done ? 20 : 8);
    App.save();
    if (x.done) {
      const all = d.checklist.every((c) => c.done);
      if (all) App.unlock('dubai-ready', 'Career-ready for Dubai', 'Every readiness milestone is complete', 'plane');
      else if (/legitimate employment/i.test(x.title)) App.unlock('dubai-offer', 'Job offer secured', 'Next: verify visa and relocation requirements', 'briefcase');
      else App.toast('Milestone complete');
    }
    App.render({ quiet: true });
  };
  function checkSheet(x) {
    const d = App.dubai();
    const isNew = !x;
    x = x || { id: 'u' + uid(), title: '', done: false, doneAt: '', note: '' };
    App.sheet({
      title: isNew ? 'New milestone' : 'Milestone',
      body: `${App.field('Milestone', App.input('title', { value: x.title, required: true }))}${App.field('Notes', App.textarea('note', x.note, { rows: 3, placeholder: 'Progress, links, contacts…' }))}`,
      danger: isNew ? null : { act: 'dubaiCheckDel', label: 'Remove', attrs: `data-id="${x.id}"` },
      onSubmit: (v) => { x.title = v.title.trim().slice(0, 100); x.note = (v.note || '').slice(0, 400); if (isNew) d.checklist.push(x); App.commit(); },
    });
  }
  App.actions.dubaiCheckEdit = (el) => checkSheet(App.dubai().checklist.find((c) => c.id === el.dataset.id));
  App.actions.dubaiCheckAdd = () => checkSheet(null);
  App.actions.dubaiCheckDel = (el) => { if (!App.confirm('Remove this milestone?')) return; const d = App.dubai(); d.checklist = d.checklist.filter((c) => c.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  App.views.dubai = { render };
})();
