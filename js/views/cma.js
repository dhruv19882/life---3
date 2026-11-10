'use strict';
/* US CMA study system: Part 1 & 2 topic tracking, study sessions, MCQ/Hock/mock scores, accuracy, weak topics,
   weekly target, exam countdown, backlog subjects. Only what you log is shown; nothing is estimated. */
(function () {
  const { icon, esc, dkey, uid, prettyDate, sum, r1, daysBetween, lastNDays, parseD, weekStart } = App;
  App.ui.cmaTab = 'overview';
  App.ui.cmaOpen = {};
  const C = () => App.state.cma;
  const backlog = () => (C().backlog = C().backlog || App.cmaBacklogDefaults());
  const TOPIC_ST = [
    { v: '', label: 'Not started', cls: '' }, { v: 'learning', label: 'Learning', cls: 'pending' },
    { v: 'done', label: 'Done', cls: 'paid' }, { v: 'revised', label: 'Revised', cls: 'paid' },
  ];
  const tKey = (sec, i) => `${sec}:${i}`;
  const secProgress = (sec) => {
    const n = sec.topics.length;
    const st = sec.topics.map((_, i) => C().topics[tKey(sec.id, i)] || '');
    return { done: st.filter((x) => x === 'done' || x === 'revised').length, revised: st.filter((x) => x === 'revised').length, n };
  };
  const partProgress = (pk) => {
    const secs = App.CMA[pk].sections;
    const t = secs.reduce((a, s) => { const p = secProgress(s); a.done += p.done; a.n += p.n; return a; }, { done: 0, n: 0 });
    return t.n ? t.done / t.n : 0;
  };
  const accTxt = (a) => (a.acc === null ? '—' : Math.round(a.acc * 100) + '%');
  const TYPE_LABEL = Object.fromEntries(App.STUDY_TYPES.map((t) => [t.value, t.label]));

  function render() {
    const tab = App.ui.cmaTab;
    return `${App.back()}
      ${App.header('US CMA', 'Study system', `<button class="icon-btn lg" data-act="newStudy" aria-label="Log study session">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('cmaTab', [{ value: 'overview', label: 'Overview' }, { value: 'p1', label: 'Part 1' }, { value: 'p2', label: 'Part 2' }, { value: 'practice', label: 'Practice' }, { value: 'backlog', label: 'Backlog' }], tab)}</div>
      <div class="mt12">${tab === 'overview' ? renderOverview() : tab === 'practice' ? renderPractice() : tab === 'backlog' ? renderBacklog() : renderPart(tab)}</div>
      <div class="tabbar-space"></div>`;
  }

  function renderOverview() {
    const cw = App.cmaWeek();
    const all = App.cmaAccuracy();
    const weak = App.cmaWeakSections();
    const days = lastNDays(7);
    const mins = days.map((d) => sum(App.cmaSessions(d, d), (s) => s.minutes));
    const totalH = sum(C().sessions, (s) => s.minutes) / 60;
    const examCard = (pk) => {
      const p = C().parts[pk];
      const d = p.examDate ? daysBetween(dkey(), p.examDate) : null;
      const prog = partProgress(pk);
      return `<button class="card tile" data-act="cmaPart" data-p="${pk}"><div class="tile-top"><span class="tile-ic ${pk === 'p1' ? 'f-lime' : 'f-sky'}">${icon('book')}</span><span class="badge ${p.status === 'passed' ? 'ok' : ''}">${esc({ 'not-started': 'Not started', preparing: 'Preparing', scheduled: 'Scheduled', passed: 'Passed' }[p.status] || p.status)}</span></div>
        <span class="tile-val">${p.status === 'passed' ? 'Passed' : d === null ? 'No date' : d >= 0 ? `${d}<small> days</small>` : 'Date passed'}</span>
        <span class="tile-label">${App.CMA[pk].name}${p.examDate ? ' · ' + prettyDate(p.examDate, { absolute: true, year: true }) : ''}</span>${App.bar(prog, pk === 'p1' ? 'lime' : 'sky')}<small class="muted mt4">${Math.round(prog * 100)}% topics done</small></button>`;
    };
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="hero-main">
          ${App.ring(cw.target ? cw.minutes / cw.target : 0, { size: 132, stroke: 12, grad: 'lime', label: `${r1(cw.minutes / 60)}<small>of ${r1(cw.target / 60)} h</small>` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:var(--lime)"></span><div><b>${App.plural(cw.sessions.length, 'session')}</b><small>This week</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--sky)"></span><div><b>${accTxt(all)}</b><small>MCQ accuracy · ${App.num(all.attempted)} Qs</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:var(--mint)"></span><div><b>${r1(totalH)} h</b><small>Total logged</small></div></div>
          </div>
        </div>
        <div class="row gap mt16"><button class="btn btn-primary grow" data-act="newStudy">${icon('plus')}Log session</button><button class="btn btn-ghost" data-act="cmaTarget">${icon('target')}Target</button></div>
      </section>
      <div class="tiles reveal" style="--i:2">${examCard('p1')}${examCard('p2')}</div>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('chart')}Study hours · last 7 days</h3></div>
        ${App.barChart(days.map((d, i) => ({ label: App.DOW[parseD(d).getDay()], value: r1(mins[i] / 60), cls: d === dkey() ? 'grad-lime' : 'grad-sky' })), { height: 120, lines: cw.target ? [{ v: r1(cw.target / 7 / 60), cls: 'ok', label: 'Daily' }] : [], fmt: (v) => v + 'h' })}</section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('alert')}Weak topics</h3></div>
        ${weak.length ? `<div class="list">${weak.map((w) => `<div class="li"><span class="grow"><b>${esc(w.sec.code)}. ${esc(w.sec.name)}</b><span class="sub">${w.attempted ? `${accTxt(w)} on ${w.attempted} questions` : 'Flagged by you'}</span></span>${w.flagged ? '<span class="pill warn">Flagged</span>' : ''}</div>`).join('')}</div>`
          : '<p class="muted small">A section appears here when your accuracy is below 70% over 20+ logged questions, or when you flag it.</p>'}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('medal')}Milestones</h3></div>
        <div class="ach-grid">${Object.values(App.CMA).flatMap((p) => p.sections).map((s) => { const pr = secProgress(s); const ok = pr.done === pr.n; return `<div class="ach ${ok ? '' : 'locked'}"><span class="tile-ic ${ok ? 'f-lime' : 'f-dark'}">${icon(ok ? 'medal' : 'lock')}</span>${s.id.slice(0, 2).toUpperCase()}${s.code}<small class="muted block">${pr.done}/${pr.n}</small></div>`; }).join('')}</div></section>
      <p class="section-note">${icon('info')}<span>Sections follow the IMA content specification. From the Sept/Oct 2026 window essays are replaced by case-based questions; check IMA for your exam window.</span></p>`;
  }

  function renderPart(pk) {
    const part = App.CMA[pk];
    const p = C().parts[pk];
    return `<section class="card hero reveal" style="--i:1"><span class="eyebrow">${part.name}</span><h2 class="mt4">${esc(part.title)}</h2>
        <div class="stat-row">${App.stat('Topics done', `${Math.round(partProgress(pk) * 100)}%`)}${App.stat('Accuracy', accTxt(App.cmaAccuracy((s) => s.part === pk)))}${App.stat('Hours', r1(sum(C().sessions.filter((s) => s.part === pk), (s) => s.minutes) / 60))}</div>
        <div class="row gap mt12"><button class="btn btn-soft grow" data-act="cmaExam" data-p="${pk}">${icon('cal')}${p.examDate ? `Exam ${prettyDate(p.examDate, { absolute: true, year: true })}` : 'Set exam date'}</button></div></section>
      ${part.sections.map((s, i) => {
        const pr = secProgress(s);
        const a = App.cmaAccuracy((x) => x.section === s.id);
        const open = App.ui.cmaOpen[s.id];
        return `<article class="card ex-card ${pr.done === pr.n ? 'complete' : ''} ${open ? 'open' : ''} reveal" style="--i:${i + 2}">
          <button class="ex-head" data-act="cmaSec" data-id="${s.id}"><span class="ex-num">${pr.done === pr.n ? icon('check') : s.code}</span>
            <span class="grow ta-l"><b>${esc(s.name)}</b><small class="muted block">${s.weight}% of exam · ${pr.done}/${pr.n} topics · accuracy ${accTxt(a)}${C().weakFlags[s.id] ? ' · flagged weak' : ''}</small></span><span class="chev">${icon('down')}</span></button>
          <div class="ex-body"><div class="ex-inner">
            ${s.topics.map((t, ti) => { const st = C().topics[tKey(s.id, ti)] || ''; const o = TOPIC_ST.find((x) => x.v === st); return `<div class="topic"><span class="grow small">${esc(t)}</span><button class="status ${o.cls || 'pending'} topic-st" style="${o.v ? '' : 'opacity:.55'}" data-act="cmaTopic" data-s="${s.id}" data-i="${ti}">${o.label}</button></div>`; }).join('')}
            <div class="row gap mt12"><button class="btn btn-ghost sm grow" data-act="cmaWeak" data-id="${s.id}">${icon('flag')}${C().weakFlags[s.id] ? 'Unflag weak' : 'Flag as weak'}</button><button class="btn btn-soft sm grow" data-act="newStudy" data-part="${pk}" data-sec="${s.id}">${icon('plus')}Log session</button></div>
          </div></div></article>`;
      }).join('')}`;
  }

  function renderPractice() {
    const ss = C().sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    const by = (type) => App.cmaAccuracy((s) => s.type === type);
    const mocks = ss.filter((s) => s.type === 'mock' && +s.attempted > 0).reverse();
    return `<section class="card reveal" style="--i:1"><div class="stat-row">${App.stat('MCQ', accTxt(by('mcq')), `${by('mcq').attempted} Qs`)}${App.stat('Hock', accTxt(by('hock')), `${by('hock').attempted} Qs`)}${App.stat('Mock tests', accTxt(by('mock')), `${mocks.length} taken`)}</div>
        ${mocks.length >= 2 ? `<div class="mt12">${App.lineChart(mocks.map((m) => ({ v: Math.round((m.correct / m.attempted) * 100), label: m.date })), { height: 120, fmt: (v) => v + '%', color: 'sky', min: 0, max: 100 })}</div><p class="muted tiny">Mock test scores over time</p>` : ''}</section>
      <button class="btn btn-primary btn-block reveal" data-act="newStudy" data-type="mcq">${icon('plus')}Log practice or mock test</button>
      ${ss.length ? `<section class="card mt12 reveal"><div class="list">${ss.slice(0, 40).map((s) => { const sec = s.section && Object.values(App.CMA).flatMap((p) => p.sections).find((x) => x.id === s.section); const bl = s.part === 'backlog' && backlog().find((b) => b.id === s.section);
        return `<button class="li" data-act="editStudy" data-id="${s.id}"><span class="grow"><b>${esc(TYPE_LABEL[s.type] || s.type)} · ${App.fmtMin(s.minutes)}</b><span class="sub">${prettyDate(s.date)} · ${s.part === 'backlog' ? esc(bl ? bl.subject : 'Backlog') : (App.CMA[s.part] || { name: '' }).name}${sec ? ' ' + sec.code + '. ' + esc(sec.name) : ''}</span></span>${+s.attempted ? `<b class="li-amt">${s.correct}/${s.attempted}</b>` : ''}</button>`; }).join('')}</div></section>`
        : `<div class="mt12">${App.empty('book', 'No sessions yet', 'Log study time and question attempts. Accuracy is calculated only from what you enter.')}</div>`}`;
  }

  function renderBacklog() {
    const bl = backlog();
    const suggestions = ['Business Mathematics', 'Business Economics'].filter((s) => !bl.some((b) => b.subject === s));
    return `<p class="muted small">Track university backlog papers alongside CMA so neither falls behind.</p>
      ${bl.map((b, i) => {
        const mins = sum(C().sessions.filter((s) => s.part === 'backlog' && s.section === b.id), (s) => s.minutes);
        const d = b.examDate ? daysBetween(dkey(), b.examDate) : null;
        const tp = b.topics.length ? b.topics.filter((t) => t.done).length / b.topics.length : 0;
        return `<article class="card mt12 reveal" style="--i:${i + 1}"><div class="row between top"><div><b>${esc(b.subject)}</b><small class="muted block">${b.status === 'cleared' ? 'Cleared' : d === null ? 'No exam date' : d >= 0 ? `Exam in ${App.plural(d, 'day')}` : 'Exam date passed'} · ${App.fmtMin(mins)} studied</small></div>
          <div class="row gap-s"><button class="icon-btn sm" data-act="editBacklog" data-id="${b.id}" aria-label="Edit">${icon('edit')}</button><button class="btn btn-primary xs" data-act="newStudy" data-part="backlog" data-sec="${b.id}" data-type="backlog">${icon('plus')}Study</button></div></div>
          ${b.topics.length ? `${App.bar(tp, 'mint', 'thin')}<div class="mt8">${b.topics.map((t, ti) => `<div class="ms ${t.done ? 'done' : ''}"><button class="check sm ${t.done ? 'on' : ''}" data-act="blTopic" data-id="${b.id}" data-i="${ti}" aria-label="Toggle">${icon('check')}</button><span class="ms-t small">${esc(t.title)}</span></div>`).join('')}</div>` : '<p class="muted small mt8">Add chapters or topics with Edit.</p>'}
        </article>`;
      }).join('')}
      <div class="row gap wrap mt12">${suggestions.map((s) => `<button class="btn btn-soft sm" data-act="addBacklog" data-s="${esc(s)}">${icon('plus')}${esc(s)}</button>`).join('')}<button class="btn btn-ghost sm" data-act="addBacklog">${icon('plus')}Other subject</button></div>`;
  }

  /* ---------- sessions ---------- */
  function studySheet(s, preset = {}) {
    const isNew = !s;
    s = s || { date: dkey(), minutes: 60, part: preset.part || 'p1', section: preset.sec || '', type: preset.type || 'study', attempted: '', correct: '', note: '' };
    const secOpts = (part) => part === 'backlog' ? backlog().map((b) => ({ value: b.id, label: b.subject })) : [{ value: '', label: 'Whole part / mixed' }, ...App.CMA[part].sections.map((x) => ({ value: x.id, label: `${x.code}. ${x.name}` }))];
    App.sheet({
      title: isNew ? 'Log study session' : 'Edit session',
      body: `${App.field('Type', App.chips('type', App.STUDY_TYPES, s.type))}
        ${App.field('Part', App.chips('part', [{ value: 'p1', label: 'Part 1' }, { value: 'p2', label: 'Part 2' }, ...(backlog().length ? [{ value: 'backlog', label: 'Backlog' }] : [])], s.part))}
        ${App.field('Section / subject', App.select('section', secOpts(s.part), s.section, 'id="studySec"'))}
        <div class="preset-row">${[25, 45, 60, 90, 120, 180].map((m) => `<button type="button" class="pchip" data-act="preset" data-f="minutes" data-v="${m}">${App.fmtMin(m)}</button>`).join('')}</div>
        <div class="grid2">${App.field('Minutes', App.input('minutes', { type: 'number', value: s.minutes, min: 1, max: 960, required: true, inputmode: 'numeric' }))}${App.field('Date', App.input('date', { type: 'date', value: s.date, max: dkey(), required: true }))}</div>
        <div class="grid2">${App.field('Questions attempted', App.input('attempted', { type: 'number', value: s.attempted, min: 0, max: 2000, inputmode: 'numeric', placeholder: 'optional' }))}${App.field('Correct', App.input('correct', { type: 'number', value: s.correct, min: 0, max: 2000, inputmode: 'numeric', placeholder: 'optional' }))}</div>
        ${App.field('Note', App.input('note', { value: s.note, placeholder: 'e.g. Variance analysis, Hock chapter 3' }))}`,
      danger: isNew ? null : { act: 'delStudy', label: 'Delete', attrs: `data-id="${s.id}"` },
      onOpen: (sh) => sh.querySelectorAll('input[name="part"]').forEach((r) => r.addEventListener('change', () => {
        document.getElementById('studySec').innerHTML = secOpts(r.value).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join('');
      })),
      onSubmit: (d) => {
        const att = Math.round(+d.attempted || 0), cor = Math.round(+d.correct || 0);
        if (cor > att) { App.toast('Correct answers cannot exceed attempted', 'bad'); return false; }
        const obj = { date: d.date, minutes: Math.max(1, Math.round(+d.minutes || 0)), part: ['p1', 'p2', 'backlog'].includes(d.part) ? d.part : 'p1', section: d.section || '', type: d.type, attempted: att || '', correct: att ? cor : '', note: (d.note || '').slice(0, 200) };
        const before = App.cmaWeek();
        if (isNew) C().sessions.push({ id: uid(), ts: Date.now(), ...obj }); else Object.assign(s, obj);
        App.save();
        const after = App.cmaWeek();
        if (isNew && after.target && before.minutes < after.target && after.minutes >= after.target) App.unlock('cma-week-' + weekStart(), 'Weekly study target reached', `${r1(after.minutes / 60)} h this week`, 'book');
        else App.toast(`Logged ${App.fmtMin(obj.minutes)}${att ? ` · ${Math.round((cor / att) * 100)}% accuracy` : ''}`);
        App.render({ quiet: true });
      },
    });
  }
  App.studySheet = (preset) => studySheet(null, preset);
  App.actions.newStudy = (el) => studySheet(null, { part: el.dataset.part, sec: el.dataset.sec, type: el.dataset.type });
  App.actions.editStudy = (el) => studySheet(C().sessions.find((x) => x.id === el.dataset.id));
  App.actions.delStudy = (el) => { if (!App.confirm('Delete this session?')) return; C().sessions = C().sessions.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  /* ---------- topics, exams, target ---------- */
  App.actions.cmaTab = (el) => { App.ui.cmaTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.cmaPart = (el) => { App.ui.cmaTab = el.dataset.p; App.render({ quiet: true }); };
  App.actions.cmaSec = (el) => { const id = el.dataset.id; App.ui.cmaOpen[id] = !App.ui.cmaOpen[id]; el.closest('.ex-card').classList.toggle('open', App.ui.cmaOpen[id]); };
  App.actions.cmaTopic = (el) => {
    const k = tKey(el.dataset.s, el.dataset.i);
    const cur = C().topics[k] || '';
    const idx = TOPIC_ST.findIndex((x) => x.v === cur);
    const next = TOPIC_ST[(idx + 1) % TOPIC_ST.length].v;
    const sec = Object.values(App.CMA).flatMap((p) => p.sections).find((x) => x.id === el.dataset.s);
    const before = secProgress(sec);
    if (next) C().topics[k] = next; else delete C().topics[k];
    App.buzz(8);
    App.save();
    const after = secProgress(sec);
    if (before.done < before.n && after.done === after.n) {
      const pk = sec.id.slice(0, 2);
      if (partProgress(pk) >= 1) App.unlock('cma-part-' + pk, `${App.CMA[pk].name} syllabus complete`, 'Every topic is done. Time for mocks and revision.', 'trophy');
      else App.unlock('cma-sec-' + sec.id, `Section ${sec.code} complete`, sec.name, 'medal');
    }
    App.render({ quiet: true });
  };
  App.actions.cmaWeak = (el) => { const f = C().weakFlags; if (f[el.dataset.id]) delete f[el.dataset.id]; else f[el.dataset.id] = true; App.commit(); };
  App.actions.cmaExam = (el) => {
    const pk = el.dataset.p;
    const p = C().parts[pk];
    App.sheet({
      title: `${App.CMA[pk].name} exam`,
      body: `${App.field('Exam date', App.input('examDate', { type: 'date', value: p.examDate }))}
        ${App.field('Status', App.chips('status', [{ value: 'not-started', label: 'Not started' }, { value: 'preparing', label: 'Preparing' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'passed', label: 'Passed' }], p.status))}
        ${App.field('Score (optional)', App.input('score', { type: 'number', value: p.score, min: 0, max: 500, placeholder: 'out of 500' }))}`,
      onSubmit: (d) => {
        const was = p.status;
        p.examDate = d.examDate || ''; p.status = d.status; p.score = d.score || '';
        if (was !== 'passed' && p.status === 'passed') App.unlock('cma-passed-' + pk, `CMA ${App.CMA[pk].name} passed`, p.score ? `Score ${p.score}` : 'A major career milestone', 'trophy');
        App.commit();
      },
    });
  };
  App.actions.cmaTarget = () => {
    App.sheet({
      title: 'Weekly study target',
      body: `${App.field('Hours per week', App.input('h', { type: 'number', value: r1((C().weeklyTargetMin || 0) / 60), min: 0, max: 80, step: 0.5, required: true, inputmode: 'decimal' }), 'Example: 10 h = about 1.5 h a day.')}`,
      onSubmit: (d) => { C().weeklyTargetMin = Math.round((+d.h || 0) * 60); App.toast('Target saved'); App.commit(); },
    });
  };

  /* ---------- backlog ---------- */
  function backlogSheet(b, subject) {
    const isNew = !b;
    b = b || { id: uid(), subject: subject || '', examDate: '', status: 'pending', topics: [] };
    App.sheet({
      title: isNew ? 'Backlog subject' : b.subject,
      body: `${App.field('Subject', App.input('subject', { value: b.subject, required: true }))}
        <div class="grid2">${App.field('Exam date', App.input('examDate', { type: 'date', value: b.examDate }))}${App.field('Status', App.select('status', [{ value: 'pending', label: 'Pending' }, { value: 'cleared', label: 'Cleared' }], b.status))}</div>
        ${App.field('Topics (one per line)', App.textarea('topics', b.topics.map((t) => t.title).join('\n'), { rows: 6, placeholder: 'Ratios & proportions\nMatrices\nDifferentiation' }))}`,
      danger: isNew ? null : { act: 'delBacklog', label: 'Delete', attrs: `data-id="${b.id}"` },
      onSubmit: (d) => {
        const titles = (d.topics || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 60);
        const was = b.status;
        b.subject = d.subject.trim().slice(0, 60); b.examDate = d.examDate || ''; b.status = d.status;
        b.topics = titles.map((t) => b.topics.find((x) => x.title === t) || { title: t, done: false });
        if (isNew) backlog().push(b);
        if (was !== 'cleared' && b.status === 'cleared') App.unlock('backlog-' + b.id, `${b.subject} cleared`, 'Backlog paper done', 'medal');
        App.commit();
      },
    });
  }
  App.actions.addBacklog = (el) => backlogSheet(null, el.dataset.s);
  App.actions.editBacklog = (el) => backlogSheet(backlog().find((x) => x.id === el.dataset.id));
  App.actions.delBacklog = (el) => { if (!App.confirm('Delete this subject? Logged sessions stay in history.')) return; C().backlog = backlog().filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.blTopic = (el) => { const b = backlog().find((x) => x.id === el.dataset.id); const t = b.topics[+el.dataset.i]; t.done = !t.done; App.buzz(t.done ? 15 : 6); App.commit(); };

  App.views.cma = { render };
})();
