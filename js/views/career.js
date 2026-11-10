'use strict';
/* Career & skill roadmap towards Finance Analyst / FP&A Analyst: skills with milestones, resources and practice projects,
   portfolio manager and a career progression timeline. Completion = milestones you tick, nothing else. */
(function () {
  const { icon, esc, dkey, uid, prettyDate } = App;
  App.ui.careerTab = 'skills';
  App.ui.skillOpen = {};
  const CR = () => (App.state.career = App.state.career || App.careerDefaults());
  const PTYPES = ['Excel dashboard', 'Financial model', 'Power BI project', 'SQL project', 'Python automation', 'Other'];
  const PSTAT = { idea: 'Idea', progress: 'In progress', done: 'Done' };
  const skillPct = (s) => (s.milestones.length ? s.milestones.filter((m) => m.done).length / s.milestones.length : 0);

  function render() {
    const tab = App.ui.careerTab;
    const c = CR();
    const avg = c.skills.length ? c.skills.reduce((a, s) => a + skillPct(s), 0) / c.skills.length : 0;
    return `${App.back()}
      ${App.header('Career', esc((App.state.profile && App.state.profile.careerGoal) || 'Finance Analyst / FP&A Analyst'), '')}
      <section class="card hero reveal" style="--i:0"><div class="hero-main">
        ${App.ring(avg, { size: 110, stroke: 11, grad: 'lime', label: `${Math.round(avg * 100)}%<small>skills</small>` })}
        <div class="hero-side">
          <div class="mini-stat"><span class="dot" style="--c:var(--lime)"></span><div><b>${c.skills.filter((s) => skillPct(s) >= 1).length}/${c.skills.length}</b><small>Skills complete</small></div></div>
          <div class="mini-stat"><span class="dot" style="--c:var(--sky)"></span><div><b>${c.portfolio.filter((p) => p.status === 'done').length}</b><small>Portfolio projects done</small></div></div>
          <div class="mini-stat"><span class="dot" style="--c:var(--mint)"></span><div><b>${c.timeline.filter((t) => t.done).length}/${c.timeline.length}</b><small>Career stages</small></div></div>
        </div></div></section>
      <div class="reveal" style="--i:1">${App.seg('careerTab', [{ value: 'skills', label: 'Skills' }, { value: 'portfolio', label: `Portfolio · ${c.portfolio.length}` }, { value: 'timeline', label: 'Timeline' }], tab)}</div>
      <div class="mt12">${({ skills: renderSkills, portfolio: renderPortfolio, timeline: renderTimeline })[tab]()}</div>
      <div class="tabbar-space"></div>`;
  }

  function renderSkills() {
    return CR().skills.map((s, i) => {
      const p = skillPct(s);
      const open = App.ui.skillOpen[s.id];
      return `<article class="card ex-card skill-card ${p >= 1 ? 'complete' : ''} ${open ? 'open' : ''} reveal" style="--i:${i + 2}">
        <button class="ex-head" data-act="skillToggle" data-id="${s.id}"><span class="ex-num">${p >= 1 ? icon('check') : Math.round(p * 100)}</span>
          <span class="grow ta-l"><b>${esc(s.name)}</b><small class="muted block">${s.milestones.filter((m) => m.done).length}/${s.milestones.length} milestones · ${s.projects.filter((x) => x.done).length}/${s.projects.length} projects</small>${App.bar(p, p >= 1 ? 'lime' : 'sky', 'thin')}</span><span class="chev">${icon('down')}</span></button>
        <div class="ex-body"><div class="ex-inner">
          <h4 class="group-title" style="margin-top:4px">Milestones</h4>
          ${s.milestones.map((m) => `<div class="ms ${m.done ? 'done' : ''}"><button class="check sm ${m.done ? 'on' : ''}" data-act="skillMs" data-s="${s.id}" data-id="${m.id}" aria-label="Toggle">${icon('check')}</button><span class="ms-t small grow">${esc(m.title)}</span><button class="icon-btn sm" data-act="skillDel" data-s="${s.id}" data-k="milestones" data-id="${m.id}" aria-label="Remove">${icon('x')}</button></div>`).join('')}
          <h4 class="group-title">Learning resources</h4>
          ${s.resources.length ? s.resources.map((r) => `<div class="ms"><span class="grow small">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="faint tiny">(needs internet)</span>` : esc(r.title)}</span><button class="icon-btn sm" data-act="skillDel" data-s="${s.id}" data-k="resources" data-id="${r.id}" aria-label="Remove">${icon('x')}</button></div>`).join('') : '<p class="muted small">None yet.</p>'}
          <h4 class="group-title">Practice projects</h4>
          ${s.projects.length ? s.projects.map((x) => `<div class="ms ${x.done ? 'done' : ''}"><button class="check sm ${x.done ? 'on' : ''}" data-act="skillProj" data-s="${s.id}" data-id="${x.id}" aria-label="Toggle">${icon('check')}</button><span class="ms-t small grow">${esc(x.title)}</span><button class="icon-btn sm" data-act="skillDel" data-s="${s.id}" data-k="projects" data-id="${x.id}" aria-label="Remove">${icon('x')}</button></div>`).join('') : '<p class="muted small">None yet.</p>'}
          <div class="row gap mt12 wrap"><button class="btn btn-soft xs" data-act="skillAdd" data-s="${s.id}" data-k="milestones">${icon('plus')}Milestone</button><button class="btn btn-soft xs" data-act="skillAdd" data-s="${s.id}" data-k="resources">${icon('plus')}Resource</button><button class="btn btn-soft xs" data-act="skillAdd" data-s="${s.id}" data-k="projects">${icon('plus')}Project</button></div>
        </div></div></article>`;
    }).join('') + `<button class="btn btn-ghost btn-block" data-act="newSkill">${icon('plus')}Add a skill</button>`;
  }

  function renderPortfolio() {
    const items = CR().portfolio;
    return `<button class="btn btn-primary btn-block" data-act="newProject">${icon('plus')}Add portfolio project</button>
      ${PTYPES.map((t) => {
        const list = items.filter((p) => p.type === t);
        if (!list.length) return '';
        return `<h4 class="group-title">${esc(t)}<span>${list.length}</span></h4><div class="card tight">${list.map((p) => `<button class="li" data-act="editProject" data-id="${p.id}"><span class="grow"><b>${esc(p.title)}</b><span class="sub">${esc(p.desc || '')}</span></span><span class="status ${p.status === 'done' ? 'paid' : p.status === 'progress' ? 'pending' : 'partial'}">${PSTAT[p.status]}</span></button>`).join('')}</div>`;
      }).join('') || `<div class="mt12">${App.empty('layers', 'Build your portfolio', 'Track Excel dashboards, financial models, Power BI, SQL and Python projects you can show employers.')}</div>`}`;
  }

  function renderTimeline() {
    const tl = CR().timeline;
    const nextIdx = tl.findIndex((t) => !t.done);
    return `<section class="card"><div class="timeline">${tl.map((t, i) => `<div class="tl-item ${t.done ? 'done' : i === nextIdx ? 'next' : ''}"><button class="ta-l" style="width:100%" data-act="editStage" data-id="${t.id}">
        <b>${esc(t.title)}</b>${i === nextIdx ? ' <span class="badge sky">Next</span>' : ''}<small class="muted block">${t.date ? prettyDate(t.date, { absolute: true, year: true }) + ' · ' : ''}${esc(t.note || '')}</small></button></div>`).join('')}</div>
      <button class="btn btn-ghost btn-block" data-act="newStage">${icon('plus')}Add stage</button></section>`;
  }

  /* ---------- actions ---------- */
  const skill = (id) => CR().skills.find((s) => s.id === id);
  App.actions.careerTab = (el) => { App.ui.careerTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.skillToggle = (el) => { const id = el.dataset.id; App.ui.skillOpen[id] = !App.ui.skillOpen[id]; el.closest('.ex-card').classList.toggle('open', App.ui.skillOpen[id]); };
  App.actions.skillMs = (el) => {
    const s = skill(el.dataset.s);
    const m = s.milestones.find((x) => x.id === el.dataset.id);
    const before = skillPct(s);
    m.done = !m.done;
    m.doneAt = m.done ? dkey() : '';
    App.buzz(m.done ? 18 : 6);
    App.save();
    if (before < 1 && skillPct(s) >= 1) App.unlock('skill-' + s.id, `${s.name} mastered`, 'Every milestone complete', 'medal');
    else if (m.done) App.toast('Milestone complete');
    App.render({ quiet: true });
  };
  App.actions.skillProj = (el) => { const s = skill(el.dataset.s); const p = s.projects.find((x) => x.id === el.dataset.id); p.done = !p.done; App.buzz(); App.commit(); };
  App.actions.skillDel = (el) => { if (!App.confirm('Remove this item?')) return; const s = skill(el.dataset.s); s[el.dataset.k] = s[el.dataset.k].filter((x) => x.id !== el.dataset.id); App.commit(); };
  App.actions.skillAdd = (el) => {
    const s = skill(el.dataset.s);
    const k = el.dataset.k;
    App.sheet({
      title: `Add ${k === 'milestones' ? 'milestone' : k === 'resources' ? 'resource' : 'project'} · ${s.name}`,
      body: App.field('Title', App.input('title', { required: true })) + (k === 'resources' ? App.field('Link (optional)', App.input('url', { type: 'url', placeholder: 'https://…' }), 'Links open in the browser and need internet. Everything else works offline.') : ''),
      onSubmit: (d) => {
        const item = { id: uid(), title: d.title.trim().slice(0, 120) };
        if (k === 'resources') item.url = /^https?:\/\//i.test(d.url || '') ? d.url.trim() : '';
        else item.done = false;
        s[k].push(item);
        App.ui.skillOpen[s.id] = true;
        App.commit();
      },
    });
  };
  App.actions.newSkill = () => App.sheet({
    title: 'New skill', body: App.field('Skill', App.input('name', { required: true, placeholder: 'e.g. Tally, VBA, Tableau' })),
    onSubmit: (d) => { CR().skills.push({ id: uid(), name: d.name.trim().slice(0, 40), milestones: [], resources: [], projects: [] }); App.commit(); },
  });

  function projectSheet(p) {
    const isNew = !p;
    p = p || { type: PTYPES[0], title: '', status: 'idea', link: '', desc: '' };
    App.sheet({
      title: isNew ? 'Portfolio project' : 'Edit project',
      body: `${App.field('Title', App.input('title', { value: p.title, required: true, placeholder: 'e.g. Budget vs actual dashboard' }))}
        ${App.field('Type', App.select('type', PTYPES.map((t) => ({ value: t, label: t })), p.type))}
        ${App.field('Status', App.chips('status', Object.entries(PSTAT).map(([v, l]) => ({ value: v, label: l })), p.status))}
        ${App.field('Description', App.textarea('desc', p.desc, { rows: 3 }))}
        ${App.field('Link (optional)', App.input('link', { type: 'url', value: p.link, placeholder: 'GitHub, Drive, portfolio site' }))}`,
      danger: isNew ? null : { act: 'delProject', label: 'Delete', attrs: `data-id="${p.id}"` },
      onSubmit: (d) => {
        const was = p.status;
        const obj = { title: d.title.trim().slice(0, 80), type: d.type, status: PSTAT[d.status] ? d.status : 'idea', desc: (d.desc || '').slice(0, 400), link: /^https?:\/\//i.test(d.link || '') ? d.link.trim() : '' };
        if (isNew) CR().portfolio.push({ id: uid(), created: dkey(), ...obj }); else Object.assign(p, obj);
        const done = CR().portfolio.filter((x) => x.status === 'done').length;
        if (was !== 'done' && obj.status === 'done' && [1, 3, 5].includes(done)) App.unlock('portfolio-' + done, `${App.plural(done, 'portfolio project')} done`, obj.title, 'layers');
        App.commit();
      },
    });
  }
  App.actions.newProject = () => projectSheet(null);
  App.actions.editProject = (el) => projectSheet(CR().portfolio.find((x) => x.id === el.dataset.id));
  App.actions.delProject = (el) => { if (!App.confirm('Delete this project?')) return; CR().portfolio = CR().portfolio.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  function stageSheet(t) {
    const isNew = !t;
    t = t || { title: '', note: '', date: '', done: false };
    App.sheet({
      title: isNew ? 'New career stage' : 'Career stage',
      body: `${App.field('Stage', App.input('title', { value: t.title, required: true }))}${App.field('Target / completion date', App.input('date', { type: 'date', value: t.date }))}${App.field('Notes', App.textarea('note', t.note, { rows: 2 }))}${App.toggle('done', 'Reached', t.done)}`,
      danger: isNew ? null : { act: 'delStage', label: 'Delete', attrs: `data-id="${t.id}"` },
      onSubmit: (d) => {
        const was = t.done;
        const obj = { title: d.title.trim().slice(0, 80), date: d.date || '', note: (d.note || '').slice(0, 200), done: !!d.done };
        if (isNew) CR().timeline.push({ id: uid(), ...obj }); else Object.assign(t, obj);
        if (!was && obj.done && !isNew) App.unlock('stage-' + t.id, obj.title, 'Career stage reached', 'road');
        App.commit();
      },
    });
  }
  App.actions.newStage = () => stageSheet(null);
  App.actions.editStage = (el) => stageSheet(CR().timeline.find((x) => x.id === el.dataset.id));
  App.actions.delStage = (el) => { if (!App.confirm('Delete this stage?')) return; CR().timeline = CR().timeline.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  App.views.career = { render };
})();
