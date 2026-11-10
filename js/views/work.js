'use strict';
/* Work OS for Accounts & Finance: dashboard, tasks, daily journal with rule-based professional summaries,
   timesheets and a weekly professional report. Everything is offline and editable. */
(function () {
  const { icon, esc, dkey, uid, prettyDate, sum, r1, weekStart, weekDays, parseD, addDays } = App;
  App.ui.workTab = 'today';
  App.ui.workFilter = 'open';
  App.ui.workArea = 'all';
  App.ui.reportWeek = null;
  const W = () => App.state.work;
  const AREA = (id) => App.WORK_AREAS.find((a) => a.id === id) || App.WORK_AREAS[0];
  const PRI = { high: { label: 'High', cls: 'bad' }, med: { label: 'Medium', cls: 'warn' }, low: { label: 'Low', cls: 'ok' } };
  const TS_STATUS = { draft: 'Draft', submitted: 'Submitted', approved: 'Approved' };

  /* ---------- rule-based professional summary (no AI, no internet) ---------- */
  const TERMS = [
    [/\bquick\s?books\b|\bqbo?\b/gi, 'QuickBooks'], [/\bw[\s-]?8\s?ben\b/gi, 'W-8BEN'], [/\bw[\s-]?9s?\b/gi, 'W-9'], [/\bw[\s-]?8s?\b/gi, 'W-8'],
    [/\b(form\s)?1099s?\b/gi, 'Form 1099'], [/\bexcel\b/gi, 'Excel'], [/\bvba\b/gi, 'VBA'], [/\bpower\s?query\b/gi, 'Power Query'], [/\bpower\s?bi\b/gi, 'Power BI'],
    [/\bvendor\s+recon\w*\b/gi, 'vendor reconciliation'], [/\bbank\s+recon\w*\b/gi, 'bank reconciliation'], [/\brecons?\b|\brecos?\b/gi, 'reconciliation'],
    [/\breimb(s|urse)?\b/gi, 'reimbursement'], [/\bje'?s\b|\bjes\b/gi, 'journal entries'], [/\bgl\b/gi, 'general ledger'], [/\bap\b/gi, 'accounts payable'], [/\bar\b/gi, 'accounts receivable'],
    [/\bpo'?s\b/gi, 'purchase orders'], [/\bgst\b/gi, 'GST'], [/\btds\b/gi, 'TDS'], [/\bts\b/gi, 'timesheet'], [/\bmgr\b/gi, 'manager'], [/\bfyi\b/gi, ''],
  ];
  const VERBS = [
    [/^(i\s+)?(was\s+)?(work(ed|ing)?\s+on|did)\b/i, 'Worked on'], [/^(i\s+)?(review(ed)?|check(ed)?|went through)\b/i, 'Reviewed'],
    [/^(i\s+)?(prepar(e|ed)|made|drafted)\b/i, 'Prepared'], [/^(i\s+)?(updat(e|ed))\b/i, 'Updated'], [/^(i\s+)?(reconcil(e|ed))\b/i, 'Reconciled'],
    [/^(i\s+)?(verif(y|ied))\b/i, 'Verified'], [/^(i\s+)?(process(ed)?)\b/i, 'Processed'], [/^(i\s+)?(sen[dt])\b/i, 'Sent'], [/^(i\s+)?(fix(ed)?|resolv(e|ed))\b/i, 'Resolved'],
    [/^(i\s+)?(call(ed)?|meeting with|met)\b/i, 'Coordinated with'], [/^(i\s+)?(enter(ed)?|post(ed)?|book(ed)?)\b/i, 'Recorded'], [/^(i\s+)?(follow(ed)?\s+up(\s+on)?)\b/i, 'Followed up on'],
    [/^(i\s+)?(help(ed)?)\b/i, 'Assisted with'], [/^(i\s+)?(complet(e|ed)|finish(ed)?)\b/i, 'Completed'], [/^(i\s+)?(automat(e|ed))\b/i, 'Automated'],
    [/^(i\s+)?(creat(e|ed)|built|build)\b/i, 'Created'], [/^(i\s+)?(submit(ted)?)\b/i, 'Submitted'], [/^(i\s+)?(approv(e|ed))\b/i, 'Approved'], [/^(i\s+)?(learn(ed|t)?)\b/i, 'Learned'],
    [/^(i\s+)?(cleaned|clean)\b/i, 'Cleaned up'], [/^(i\s+)?(analy[sz](e|ed))\b/i, 'Analysed'], [/^(i\s+)?(match(ed)?)\b/i, 'Matched'], [/^(i\s+)?(collect(ed)?)\b/i, 'Collected'],
    [/^(i\s+)?(email(ed)?|mail(ed)?)\b/i, 'Emailed'], [/^(i\s+)?(download(ed)?|export(ed)?)\b/i, 'Exported'], [/^(i\s+)?(upload(ed)?|import(ed)?)\b/i, 'Imported'],
  ];
  const VERB_WORDS = 'work|worked|working|did|review|reviewed|check|checked|prepare|prepared|made|update|updated|reconcile|reconciled|verify|verified|process|processed|send|sent|fix|fixed|resolve|resolved|call|called|enter|entered|post|posted|follow|followed|help|helped|complete|completed|finish|finished|automate|automated|create|created|built|submit|submitted|approve|approved|learn|learned|clean|cleaned|analyse|analysed|analyze|analyzed|match|matched|collect|collected|email|emailed|export|exported|import|imported|book|booked|drafted';
  const AREA_RX = {
    reimb: /reimburs/i, vendor: /vendor|supplier/i, bank: /bank|statement/i, payroll: /payroll|salar/i, tax: /\btax|GST|TDS/i,
    w9: /W-9|W-8/, f1099: /1099/, qb: /QuickBooks/, excel: /Excel|VBA|Power Query|macro|automat/i, project: /project/i, timesheet: /timesheet/i,
  };
  App.workSummary = (raw) => {
    let t = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!t) return { summary: '', areas: [] };
    for (const [rx, rep] of TERMS) t = t.replace(rx, rep);
    const SPLIT = new RegExp(String.raw`[.;\n]+|,\s*(?:and\s+)?(?=(?:also\s+)?(?:i\s+)?(?:${VERB_WORDS})\b)|\s+(?:and|then|also)\s+(?=(?:also\s+)?(?:i\s+)?(?:${VERB_WORDS})\b)`, 'i');
    const clauses = t.split(SPLIT);
    const out = [];
    for (let c of clauses) {
      c = (c || '').trim().replace(/^(today|also|then|and)\s+/i, '').replace(/^(i\s+)?(also\s+)/i, '').trim();
      if (!c) continue;
      let done = false;
      for (const [rx, verb] of VERBS) {
        if (rx.test(c)) { c = c.replace(rx, verb).replace(/\s+/g, ' '); done = true; break; }
      }
      if (!done) c = /^(the|a|an|my|some)\b/i.test(c) || /^[a-z]/.test(c) ? 'Worked on ' + c.replace(/^(the|my)\s+/i, '') : c;
      c = c.charAt(0).toUpperCase() + c.slice(1);
      c = c.replace(/\bi\b/g, 'I').replace(/\s+([,.])/g, '$1');
      if (!/[.!?]$/.test(c)) c += '.';
      out.push(c);
    }
    const summary = out.join(' ');
    const areas = Object.entries(AREA_RX).filter(([, rx]) => rx.test(summary)).map(([k]) => k);
    return { summary, areas: areas.length ? areas : ['general'] };
  };

  /* ---------- items ---------- */
  App.workTaskItem = (t) => {
    const overdue = t.status !== 'done' && t.due && t.due < dkey();
    const a = AREA(t.area);
    return `<li class="todo ${t.status === 'done' ? 'done' : ''}">
      <button class="check ${t.status === 'done' ? 'on' : ''}" data-act="toggleWorkTask" data-id="${t.id}" aria-label="Toggle done">${icon('check')}</button>
      <button class="todo-body" data-act="editWorkTask" data-id="${t.id}"><span class="todo-title">${esc(t.title)}</span>
        <span class="todo-meta"><span>${a.e} ${esc(a.label)}</span>${t.due ? `<span class="${overdue ? 'neg' : ''}">${icon('cal')}${prettyDate(t.due)}</span>` : ''}
        ${t.status === 'awaiting' ? '<span class="pill warn">Awaiting approval</span>' : ''}<span class="pill ${PRI[t.priority || 'med'].cls}">${PRI[t.priority || 'med'].label}</span></span></button></li>`;
  };

  function render() {
    const tab = App.ui.workTab;
    return `${App.header('Work OS', `${esc((App.state.profile && App.state.profile.field) || 'Accounts & Finance')}`, `<button class="icon-btn lg" data-act="newJournal" aria-label="Add work note">${icon('note')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('workTab', [{ value: 'today', label: 'Dashboard' }, { value: 'tasks', label: 'Tasks' }, { value: 'journal', label: 'Journal' }, { value: 'time', label: 'Timesheet' }, { value: 'report', label: 'Report' }], tab)}</div>
      <div class="mt12">${({ today: renderDash, tasks: renderTasks, journal: renderJournal, time: renderTime, report: renderReport })[tab]()}</div>
      <div class="tabbar-space"></div>`;
  }

  function renderDash() {
    const w = W();
    const today = dkey();
    const wd = App.workDay();
    const ws = weekStart();
    const days = weekDays(ws);
    const hoursW = sum(days, (d) => App.timesheetHours(w.timesheets[d]));
    const doneW = w.tasks.filter((t) => t.status === 'done' && days.includes(t.doneAt)).length;
    const pending = w.tasks.filter((t) => t.status === 'open').length;
    const awaiting = w.tasks.filter((t) => t.status === 'awaiting');
    const upcoming = w.tasks.filter((t) => t.status !== 'done' && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const ts = w.timesheets[today];
    const sched = App.scheduledHours();
    const p = App.state.profile;
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between"><div><span class="eyebrow">${wd.workday ? `Workday · ${App.fmtClock(p.workStart)}–${App.fmtClock(p.workEnd)}` : 'Not a scheduled workday'}</span>
          <div class="huge mt4">${App.count(wd.hours, { dec: 1 })}<small class="muted" style="font-size:16px"> / ${r1(sched)} h</small></div><small class="muted">Hours today · ${ts ? TS_STATUS[ts.status || 'draft'] : 'no timesheet yet'}</small></div>
          ${App.ring(sched ? wd.hours / sched : 0, { size: 84, stroke: 9, grad: 'sky', label: `<b class="small">${Math.round(sched ? (wd.hours / sched) * 100 : 0)}%</b>` })}</div>
        <div class="stat-row four">${App.stat('Done today', wd.done.length)}${App.stat('Done this week', doneW)}${App.stat('Pending', pending)}${App.stat('Approvals', awaiting.length)}</div>
        <div class="row gap mt12"><button class="btn btn-primary grow" data-act="newJournal">${icon('note')}Work note</button><button class="btn btn-ghost grow" data-act="newWorkTask">${icon('plus')}Task</button><button class="btn btn-ghost" data-act="editTimesheet" data-d="${today}" aria-label="Timesheet">${icon('clock')}</button></div>
      </section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('chart')}This week's hours</h3><span class="muted small">${r1(hoursW)} h</span></div>
        ${App.barChart(days.map((d) => ({ label: App.DOW[parseD(d).getDay()], value: r1(App.timesheetHours(w.timesheets[d])), cls: d === today ? 'grad-lime' : 'grad-sky' })), { height: 120, lines: sched ? [{ v: sched, cls: 'ok', label: 'Schedule' }] : [], fmt: (v) => v + 'h' })}</section>
      ${awaiting.length ? `<section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('clock')}Pending approvals</h3></div><ul class="todo-list">${awaiting.map(App.workTaskItem).join('')}</ul></section>` : ''}
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('cal')}Upcoming deadlines</h3><button class="link" data-act="workTab" data-v="tasks">All ${icon('right')}</button></div>
        ${upcoming.length ? `<ul class="todo-list">${upcoming.map(App.workTaskItem).join('')}</ul>` : '<p class="muted small">No dated work tasks.</p>'}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('note')}Today's journal</h3></div>
        ${wd.journal.length ? wd.journal.map((j) => `<button class="li" data-act="editJournal" data-id="${j.id}"><span class="grow small">${esc(j.summary)}</span>${icon('edit')}</button>`).join('') : `<p class="muted small">Write a quick note like “worked on vendor recon and reviewed W9 forms”. LifeOS turns it into clean professional English.</p>`}</section>`;
  }

  function renderTasks() {
    const f = App.ui.workFilter, a = App.ui.workArea;
    const list = W().tasks.filter((t) => (f === 'all' ? true : f === 'done' ? t.status === 'done' : f === 'awaiting' ? t.status === 'awaiting' : t.status !== 'done') && (a === 'all' || t.area === a))
      .sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999') || ({ high: 0, med: 1, low: 2 }[x.priority || 'med'] - { high: 0, med: 1, low: 2 }[y.priority || 'med']));
    const counts = (id) => W().tasks.filter((t) => t.area === id && t.status !== 'done').length;
    return `<div class="row gap">${App.seg('workFilter', [{ value: 'open', label: 'Open' }, { value: 'awaiting', label: 'Approval' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }], f)}<button class="icon-btn" data-act="newWorkTask" aria-label="New task">${icon('plus')}</button></div>
      <div class="cat-scroll">${[{ id: 'all', label: 'All areas', e: '✨' }, ...App.WORK_AREAS].map((x) => `<button class="cat-chip ${a === x.id ? 'on' : ''}" data-act="workArea" data-c="${x.id}">${x.e} ${esc(x.label)}${x.id !== 'all' && counts(x.id) ? ` · ${counts(x.id)}` : ''}</button>`).join('')}</div>
      ${list.length ? `<ul class="todo-list card mt8">${list.map(App.workTaskItem).join('')}</ul>` : `<div class="mt12">${App.empty('briefcase', 'No tasks here', 'Add assigned work: reimbursements, reconciliations, payroll, 1099 checks…', `<button class="btn btn-primary" data-act="newWorkTask">${icon('plus')}New task</button>`)}</div>`}`;
  }

  function renderJournal() {
    const list = W().journal.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    const byDate = {};
    list.forEach((j) => (byDate[j.date] = byDate[j.date] || []).push(j));
    return `<button class="btn btn-primary btn-block" data-act="newJournal">${icon('note')}New journal entry</button>
      ${list.length ? Object.entries(byDate).slice(0, 30).map(([d, js]) => `<h4 class="group-title">${prettyDate(d)}<span>${js.length}</span></h4><div class="card tight">${js.map((j) => `<button class="li" data-act="editJournal" data-id="${j.id}"><span class="grow"><span class="small">${esc(j.summary)}</span><span class="sub">${(j.areas || []).map((x) => AREA(x).e + ' ' + AREA(x).label).join(' · ')}${j.mins ? ` · ${App.fmtMin(j.mins)}` : ''}</span></span></button>`).join('')}</div>`).join('')
        : `<div class="mt12">${App.empty('note', 'No entries yet', 'Keep a daily work log. It powers your weekly report.')}</div>`}`;
  }

  function renderTime() {
    const ws = App.ui.reportWeek || weekStart();
    const days = weekDays(ws);
    const total = sum(days, (d) => App.timesheetHours(W().timesheets[d]));
    return `<div class="month-nav"><button class="icon-btn" data-act="tsWeek" data-n="-7" aria-label="Previous week">${icon('left')}</button><b>Week of ${prettyDate(ws, { absolute: true })}</b><button class="icon-btn" data-act="tsWeek" data-n="7" ${ws >= weekStart() ? 'disabled' : ''} aria-label="Next week">${icon('right')}</button></div>
      <section class="card"><div class="card-head"><h3>${icon('clock')}Timesheet</h3><b>${r1(total)} h</b></div>
        <div class="list">${days.map((d) => { const ts = W().timesheets[d]; const h = App.timesheetHours(ts); return `<button class="li" data-act="editTimesheet" data-d="${d}"><span class="grow"><b>${App.DOW_LONG[parseD(d).getDay()]}</b><span class="sub">${ts ? `${App.fmtClock(ts.start)} – ${App.fmtClock(ts.end)}${+ts.breakMin ? ` · ${ts.breakMin}m break` : ''}` : App.isWorkday(d) ? 'Not logged' : 'Off'}</span></span>
          ${ts ? `<span class="status ${ts.status === 'approved' ? 'paid' : ts.status === 'submitted' ? 'pending' : 'partial'}">${TS_STATUS[ts.status || 'draft']}</span>` : ''}<b class="li-amt">${h ? r1(h) + ' h' : '—'}</b></button>`; }).join('')}</div>
        <div class="row gap mt12"><button class="btn btn-soft grow" data-act="tsFillWeek" data-w="${ws}">${icon('clock')}Fill workdays with schedule</button><button class="btn btn-ghost" data-act="tsSubmitWeek" data-w="${ws}">${icon('upload')}Mark submitted</button></div>
        <p class="field-hint">“Fill” only adds days that are empty and never overwrites what you logged. Submitting here only changes the status in LifeOS.</p></section>`;
  }

  function weekReport(ws) {
    const w = W();
    const p = App.state.profile;
    const days = weekDays(ws);
    const end = days[6];
    const hours = sum(days, (d) => App.timesheetHours(w.timesheets[d]));
    const tsDays = days.filter((d) => w.timesheets[d]);
    const st = (s) => tsDays.filter((d) => (w.timesheets[d].status || 'draft') === s).length;
    const done = w.tasks.filter((t) => t.status === 'done' && days.includes(t.doneAt));
    const open = w.tasks.filter((t) => t.status === 'open');
    const awaiting = w.tasks.filter((t) => t.status === 'awaiting');
    const nextWeekEnd = dkey(addDays(parseD(end), 7));
    const upcoming = w.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= nextWeekEnd).sort((a, b) => a.due.localeCompare(b.due));
    const journal = w.journal.filter((j) => days.includes(j.date)).sort((a, b) => a.date.localeCompare(b.date));
    const fmt = (d) => prettyDate(d, { absolute: true, year: true });
    const byArea = {};
    for (const t of done) (byArea[t.area] = byArea[t.area] || []).push(`${t.title} (completed ${App.DOW[parseD(t.doneAt).getDay()]})`);
    for (const j of journal) for (const a of j.areas || ['general']) (byArea[a] = byArea[a] || []);
    const L = [];
    L.push(`WEEKLY WORK REPORT`);
    L.push(`Week: ${fmt(days[0])} – ${fmt(end)}`);
    L.push(`Prepared by: ${p.name || ''}${p.field ? ' · ' + p.field : ''}`);
    L.push('');
    L.push('1. Summary');
    L.push(`- Hours logged: ${r1(hours)} h across ${tsDays.length} day(s)${tsDays.length ? ` (approved ${st('approved')}, submitted ${st('submitted')}, draft ${st('draft')})` : ''}`);
    L.push(`- Tasks completed: ${done.length} · Open: ${open.length} · Awaiting approval: ${awaiting.length}`);
    L.push('');
    L.push('2. Work completed by area');
    const areas = Object.keys(byArea);
    if (!areas.length) L.push('- No completed tasks or journal entries recorded this week.');
    for (const a of areas) {
      L.push(`${AREA(a).label}`);
      if (byArea[a].length) byArea[a].forEach((x) => L.push(`  - ${x}`));
      else L.push('  - See daily log');
    }
    L.push('');
    L.push('3. Daily log');
    if (!journal.length) L.push('- No journal entries this week.');
    for (const d of days) {
      const js = journal.filter((j) => j.date === d);
      if (js.length) L.push(`${App.DOW[parseD(d).getDay()]} ${prettyDate(d, { absolute: true })}: ${js.map((j) => j.summary).join(' ')}`);
    }
    L.push('');
    L.push('4. Pending items & upcoming deadlines');
    if (!awaiting.length && !upcoming.length) L.push('- None recorded.');
    awaiting.forEach((t) => L.push(`- Awaiting approval: ${t.title}`));
    upcoming.forEach((t) => L.push(`- ${t.title} — due ${fmt(t.due)} (${PRI[t.priority || 'med'].label} priority)`));
    return L.join('\n');
  }
  App.weekWorkReport = weekReport;

  function renderReport() {
    const ws = App.ui.reportWeek || weekStart();
    const txt = weekReport(ws);
    return `<div class="month-nav"><button class="icon-btn" data-act="tsWeek" data-n="-7" aria-label="Previous week">${icon('left')}</button><b>Week of ${prettyDate(ws, { absolute: true })}</b><button class="icon-btn" data-act="tsWeek" data-n="7" ${ws >= weekStart() ? 'disabled' : ''} aria-label="Next week">${icon('right')}</button></div>
      <section class="card"><div class="card-head"><h3>${icon('note')}Professional weekly report</h3></div>
        <pre class="formula" style="white-space:pre-wrap;font-size:12.5px;max-height:none">${esc(txt)}</pre>
        <div class="row gap mt12"><button class="btn btn-primary grow" data-act="copyReport">${icon('copy')}Copy</button><button class="btn btn-ghost grow" data-act="downloadReport">${icon('download')}Download .txt</button></div>
        <p class="field-hint">Built only from your tasks, journal and timesheets. Review before sharing with anyone.</p></section>`;
  }

  /* ---------- actions ---------- */
  App.actions.workTab = (el) => { App.ui.workTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.workFilter = (el) => { App.ui.workFilter = el.dataset.v; App.render({ quiet: true }); };
  App.actions.workArea = (el) => { App.ui.workArea = el.dataset.c; App.render({ quiet: true }); };
  App.actions.tsWeek = (el) => { const ws = App.ui.reportWeek || weekStart(); const n = dkey(addDays(parseD(ws), +el.dataset.n)); if (n > weekStart()) return; App.ui.reportWeek = n; App.render({ quiet: true }); };
  App.actions.copyReport = () => App.copy(weekReport(App.ui.reportWeek || weekStart()));
  App.actions.downloadReport = () => { const ws = App.ui.reportWeek || weekStart(); App.download(`work-report-${ws}.txt`, weekReport(ws), 'text/plain'); };

  function taskSheet(t) {
    const isNew = !t;
    t = t || { title: '', area: 'general', status: 'open', priority: 'med', due: '', notes: '' };
    App.sheet({
      title: isNew ? 'New work task' : 'Edit work task',
      body: `${App.field('Task', App.input('title', { value: t.title, required: true, placeholder: 'e.g. Verify 1099 vendor list' }))}
        ${App.field('Area', App.select('area', App.WORK_AREAS.map((a) => ({ value: a.id, label: `${a.e} ${a.label}` })), t.area))}
        ${App.field('Status', App.chips('status', [{ value: 'open', label: 'Pending' }, { value: 'awaiting', label: 'Awaiting approval' }, { value: 'done', label: 'Completed' }], t.status))}
        <div class="grid2">${App.field('Due date', App.input('due', { type: 'date', value: t.due }))}${App.field('Priority', App.select('priority', [{ value: 'high', label: 'High' }, { value: 'med', label: 'Medium' }, { value: 'low', label: 'Low' }], t.priority))}</div>
        ${App.field('Notes', App.textarea('notes', t.notes, { rows: 2 }))}`,
      danger: isNew ? null : { act: 'delWorkTask', label: 'Delete', attrs: `data-id="${t.id}"` },
      onSubmit: (d) => {
        const title = (d.title || '').trim();
        if (!title) return false;
        const status = ['open', 'awaiting', 'done'].includes(d.status) ? d.status : 'open';
        const obj = { title: title.slice(0, 140), area: d.area, status, priority: d.priority, due: d.due || '', notes: (d.notes || '').slice(0, 500) };
        if (status === 'done' && t.status !== 'done') obj.doneAt = dkey();
        if (status !== 'done') obj.doneAt = '';
        if (isNew) W().tasks.push({ id: uid(), created: dkey(), ...obj }); else Object.assign(t, obj);
        App.toast(isNew ? 'Task added' : 'Saved');
        App.commit();
      },
    });
  }
  App.actions.newWorkTask = () => taskSheet(null);
  App.actions.editWorkTask = (el) => taskSheet(W().tasks.find((x) => x.id === el.dataset.id));
  App.actions.delWorkTask = (el) => { if (!App.confirm('Delete this work task?')) return; W().tasks = W().tasks.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.toggleWorkTask = (el) => {
    const t = W().tasks.find((x) => x.id === el.dataset.id);
    if (!t) return;
    t.status = t.status === 'done' ? 'open' : 'done';
    t.doneAt = t.status === 'done' ? dkey() : '';
    App.buzz(t.status === 'done' ? 20 : 8);
    if (t.status === 'done') { const li = el.closest('.todo'); if (li) li.classList.add('pop'); el.classList.add('on'); App.toast('Work task completed'); setTimeout(() => App.commit(), 380); }
    else App.commit();
  };

  function journalSheet(j) {
    const isNew = !j;
    j = j || { date: dkey(), raw: '', summary: '', areas: [], mins: '' };
    App.sheet({
      title: isNew ? 'Work note' : 'Edit work note',
      body: `${App.field('What did you work on?', App.textarea('raw', j.raw, { rows: 3, placeholder: 'e.g. worked on vendor recon and reviewed W9 forms, sent reimb report to mgr', attrs: 'data-input="journalRaw"' }))}
        <button type="button" class="btn btn-soft btn-block" data-act="genSummary">${icon('spark')}Generate professional summary</button>
        <p class="field-hint">Rule-based rewriting on this device: fixes grammar, tense and finance terms (QuickBooks, W-9, Form 1099…). It does not add facts.</p>
        <div class="mt12">${App.field('Summary (edit before saving)', App.textarea('summary', j.summary, { rows: 3, placeholder: 'Your summary appears here', attrs: 'id="jSummary"' }))}</div>
        ${App.field('Areas', App.chips('areas', App.WORK_AREAS.map((a) => ({ value: a.id, label: `${a.e} ${a.label}` })), j.areas, 'checkbox'))}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: j.date, max: dkey(), required: true }))}${App.field('Time spent (min)', App.input('mins', { type: 'number', value: j.mins, min: 0, max: 1440, inputmode: 'numeric' }))}</div>`,
      danger: isNew ? null : { act: 'delJournal', label: 'Delete', attrs: `data-id="${j.id}"` },
      submit: 'Save note',
      onSubmit: (d) => {
        let summary = (d.summary || '').trim();
        if (!summary && d.raw) summary = App.workSummary(d.raw).summary;
        if (!summary) { App.toast('Write a note first', 'bad'); return false; }
        const areas = d._all('areas');
        const obj = { date: d.date || dkey(), raw: (d.raw || '').slice(0, 2000), summary: summary.slice(0, 2000), areas: areas.length ? areas : App.workSummary(summary).areas, mins: Math.max(0, Math.round(+d.mins || 0)) };
        if (isNew) W().journal.push({ id: uid(), ts: Date.now(), ...obj }); else Object.assign(j, obj);
        App.toast('Work note saved');
        App.commit();
      },
    });
  }
  App.journalSheet = () => journalSheet(null);
  App.actions.newJournal = () => journalSheet(null);
  App.actions.editJournal = (el) => journalSheet(W().journal.find((x) => x.id === el.dataset.id));
  App.actions.delJournal = (el) => { if (!App.confirm('Delete this note?')) return; W().journal = W().journal.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.genSummary = () => {
    const raw = document.querySelector('#sheetForm [name="raw"]').value;
    const r = App.workSummary(raw);
    const s = document.getElementById('jSummary');
    s.value = r.summary;
    s.classList.add('flash');
    setTimeout(() => s.classList.remove('flash'), 400);
    document.querySelectorAll('#sheetForm input[name="areas"]').forEach((c) => { c.checked = r.areas.includes(c.value); });
  };
  App.inputs.journalRaw = () => {};

  App.actions.editTimesheet = (el) => {
    const d = el.dataset.d;
    const p = App.state.profile;
    const ts = W().timesheets[d] || { start: p.workStart || '14:00', end: p.workEnd || '23:00', breakMin: 30, status: 'draft', note: '' };
    App.sheet({
      title: `Timesheet · ${prettyDate(d)}`,
      body: `<div class="grid3">${App.field('Start', App.input('start', { type: 'time', value: ts.start, required: true }))}${App.field('End', App.input('end', { type: 'time', value: ts.end, required: true }))}${App.field('Break (min)', App.input('breakMin', { type: 'number', value: ts.breakMin, min: 0, max: 600 }))}</div>
        <p class="field-hint">End before start is treated as an overnight shift.</p>
        ${App.field('Status', App.chips('status', Object.entries(TS_STATUS).map(([v, l]) => ({ value: v, label: l })), ts.status || 'draft'))}
        ${App.field('Note', App.input('note', { value: ts.note || '', placeholder: 'Optional' }))}`,
      danger: W().timesheets[d] ? { act: 'delTimesheet', label: 'Clear', attrs: `data-d="${d}"` } : null,
      onSubmit: (v) => {
        W().timesheets[d] = { start: v.start, end: v.end, breakMin: Math.max(0, +v.breakMin || 0), status: TS_STATUS[v.status] ? v.status : 'draft', note: (v.note || '').slice(0, 200) };
        App.toast(`Timesheet saved · ${r1(App.timesheetHours(W().timesheets[d]))} h`);
        App.commit();
      },
    });
  };
  App.actions.delTimesheet = (el) => { if (!App.confirm('Clear this day’s timesheet?')) return; delete W().timesheets[el.dataset.d]; App.closeSheet(); App.commit(); };
  App.actions.tsFillWeek = (el) => {
    const p = App.state.profile;
    let n = 0;
    for (const d of weekDays(el.dataset.w)) if (d <= dkey() && App.isWorkday(d) && !W().timesheets[d]) { W().timesheets[d] = { start: p.workStart, end: p.workEnd, breakMin: 30, status: 'draft', note: '' }; n++; }
    App.toast(n ? `${App.plural(n, 'day')} filled from your schedule` : 'Nothing to fill');
    App.commit();
  };
  App.actions.tsSubmitWeek = (el) => {
    let n = 0;
    for (const d of weekDays(el.dataset.w)) { const ts = W().timesheets[d]; if (ts && (ts.status || 'draft') === 'draft') { ts.status = 'submitted'; n++; } }
    App.toast(n ? `${App.plural(n, 'day')} marked submitted` : 'No draft days');
    App.commit();
  };

  App.views.work = { render };
})();
