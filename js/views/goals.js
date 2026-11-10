'use strict';
/* Goals (long-term + short-term steps) and personal to-do list. Carried over from LifeOS v1 and restyled. */
(function () {
  const { icon, esc, dkey, prettyDate, daysBetween, uid } = App;
  App.ui.goalsTab = App.ui.goalsTab || 'todo';
  App.ui.todoFilter = 'open';

  const CATS = [
    { value: 'health', label: '💪 Health' }, { value: 'career', label: '💼 Career' }, { value: 'money', label: '💰 Money' },
    { value: 'study', label: '📚 Study' }, { value: 'dubai', label: '✈️ Dubai' }, { value: 'personal', label: '🌱 Personal' },
  ];
  const catEmoji = (c) => (CATS.find((x) => x.value === c) || CATS[5]).label.split(' ')[0];
  const PRI = { high: { label: 'High', cls: 'bad' }, med: { label: 'Medium', cls: 'warn' }, low: { label: 'Low', cls: 'ok' } };

  function goalProgress(g) {
    if (g.done) return 100;
    if (g.term === 'long') {
      const kids = App.state.goals.filter((x) => x.parentId === g.id);
      if (kids.length) return Math.round(kids.reduce((a, k) => a + (k.done ? 100 : k.progress || 0), 0) / kids.length);
    }
    return g.progress || 0;
  }
  App.goalProgress = goalProgress;

  function deadlineText(g) {
    if (!g.deadline) return '';
    const n = daysBetween(dkey(), g.deadline);
    if (g.done) return 'Completed';
    if (n < 0) return `<span class="neg">${-n} days overdue</span>`;
    if (n === 0) return 'Due today';
    if (n < 60) return `${n} days left`;
    return `${Math.round(n / 30)} months left`;
  }

  App.goalMini = (g) => {
    const pct = goalProgress(g);
    return `<button class="goal-mini" data-act="editGoal" data-id="${g.id}"><span class="goal-emoji">${catEmoji(g.cat)}</span>
      <div class="grow"><div class="row between"><b>${esc(g.title)}</b><small class="muted">${pct}%</small></div>${App.bar(pct / 100, g.term === 'long' ? 'lime' : 'sky')}
      <small class="muted">${g.term === 'long' ? 'Long-term' : 'Short-term'}${g.deadline ? ' · ' + deadlineText(g) : ''}</small></div></button>`;
  };

  App.todoItem = (t) => {
    const overdue = !t.done && t.due && t.due < dkey();
    const goal = t.goalId && App.state.goals.find((g) => g.id === t.goalId);
    return `<li class="todo ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="check ${t.done ? 'on' : ''}" data-act="toggleTodo" data-id="${t.id}" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button>
      <button class="todo-body" data-act="editTodo" data-id="${t.id}"><span class="todo-title">${esc(t.title)}</span>
        <span class="todo-meta">${t.due ? `<span class="${overdue ? 'neg' : ''}">${icon('cal')}${prettyDate(t.due)}</span>` : ''}
          <span class="pill ${PRI[t.priority || 'med'].cls}">${PRI[t.priority || 'med'].label}</span>${goal ? `<span class="pill">${catEmoji(goal.cat)} ${esc(goal.title)}</span>` : ''}</span></button></li>`;
  };

  function renderTodos() {
    const s = App.state;
    const today = dkey();
    const f = App.ui.todoFilter;
    const list = s.todos.filter((t) => (f === 'done' ? t.done : !t.done));
    const pw = { high: 0, med: 1, low: 2 };
    list.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || pw[a.priority || 'med'] - pw[b.priority || 'med']);
    const groups = f === 'done'
      ? [['Completed', list.slice().sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''))]]
      : [['Overdue', list.filter((t) => t.due && t.due < today)], ['Today', list.filter((t) => t.due === today)], ['Upcoming', list.filter((t) => t.due && t.due > today)], ['Someday', list.filter((t) => !t.due)]];
    const open = s.todos.filter((t) => !t.done).length;
    const doneN = s.todos.length - open;
    const body = list.length
      ? groups.filter(([, l]) => l.length).map(([name, l], gi) => `<section class="reveal" style="--i:${gi + 2}"><h4 class="group-title ${name === 'Overdue' ? 'neg' : ''}">${name}<span>${l.length}</span></h4><ul class="todo-list card tight">${l.map(App.todoItem).join('')}</ul></section>`).join('')
      : App.empty('list', f === 'done' ? 'Nothing completed yet' : 'Your list is clear', f === 'done' ? 'Finished tasks show up here.' : 'Add a task for today, or link one to a goal.', `<button class="btn btn-primary" data-act="addTodo">${icon('plus')}Add task</button>`);
    return `<div class="row between gap reveal" style="--i:1">${App.seg('todoFilter', [{ value: 'open', label: `Open · ${open}` }, { value: 'done', label: `Done · ${doneN}` }], f)}${f === 'done' && doneN ? `<button class="link" data-act="clearDone">Clear</button>` : ''}</div>${body}`;
  }

  function renderGoals() {
    const goals = App.state.goals;
    const longs = goals.filter((g) => g.term === 'long');
    const orphans = goals.filter((g) => g.term === 'short' && !longs.some((l) => l.id === g.parentId));
    if (!goals.length) return App.empty('target', 'Dream big, start small', 'Add a long-term goal (1–5 years), then break it into short-term goals you can finish in weeks.', `<button class="btn btn-primary" data-act="addGoal" data-term="long">${icon('plus')}Long-term goal</button>`);
    const card = (g, i) => {
      const pct = goalProgress(g);
      const kids = goals.filter((x) => x.parentId === g.id);
      const tasks = App.state.todos.filter((t) => t.goalId === g.id && !t.done).length;
      return `<article class="card goal-card reveal ${g.done ? 'is-done' : ''}" style="--i:${i + 2}">
        <div class="goal-top">${App.ring(pct / 100, { size: 64, stroke: 7, grad: g.done ? 'lime' : 'sky', label: `<b class="small">${pct}%</b>` })}
          <button class="grow ta-l goal-info" data-act="editGoal" data-id="${g.id}"><span class="eyebrow">${catEmoji(g.cat)} Long-term</span><b class="goal-title">${esc(g.title)}</b>
            <small class="muted">${deadlineText(g) || 'No deadline'}${tasks ? ` · ${tasks} open task${tasks > 1 ? 's' : ''}` : ''}</small></button></div>
        ${g.why ? `<p class="goal-why">“${esc(g.why)}”</p>` : ''}
        ${kids.length ? `<div class="sub-goals">${kids.map((k) => `<div class="sub-goal ${k.done ? 'done' : ''}"><button class="check sm ${k.done ? 'on' : ''}" data-act="toggleGoal" data-id="${k.id}" aria-label="Toggle done">${icon('check')}</button>
          <button class="grow ta-l" data-act="editGoal" data-id="${k.id}"><span>${esc(k.title)}</span>${App.bar((k.done ? 100 : k.progress || 0) / 100, 'sky', 'thin')}<small class="muted">${deadlineText(k) || 'Short-term'}</small></button></div>`).join('')}</div>` : ''}
        <div class="row gap mt12"><button class="btn btn-soft sm grow" data-act="addGoal" data-term="short" data-parent="${g.id}">${icon('plus')}Short-term step</button><button class="btn btn-ghost sm" data-act="addTodo" data-goal="${g.id}">${icon('list')}Task</button></div>
      </article>`;
    };
    return `${longs.map(card).join('')}${orphans.length ? `<h4 class="group-title reveal">Short-term goals<span>${orphans.length}</span></h4><div class="card reveal">${orphans.map(App.goalMini).join('')}</div>` : ''}`;
  }

  function render() {
    const tab = App.ui.goalsTab;
    return `${App.back()}
      ${App.header('Goals & Tasks', 'Plan', `<button class="icon-btn lg" data-act="${tab === 'todo' ? 'addTodo' : 'addGoal'}" data-term="long" aria-label="Add">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('goalsTab', [{ value: 'todo', label: 'To-do' }, { value: 'goals', label: 'Goals' }], tab)}</div>
      <div class="stack mt12">${tab === 'todo' ? renderTodos() : renderGoals()}</div>
      <div class="tabbar-space"></div>`;
  }

  App.actions.goalsTab = (el) => { App.ui.goalsTab = el.dataset.v; App.render({ quiet: true }); };
  App.actions.todoFilter = (el) => { App.ui.todoFilter = el.dataset.v; App.render({ quiet: true }); };
  App.actions.toggleTodo = (el) => {
    const t = App.state.todos.find((x) => x.id === el.dataset.id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? dkey() : null;
    App.buzz(t.done ? 20 : 8);
    const li = el.closest('.todo');
    if (li && t.done) {
      li.classList.add('done', 'pop');
      el.classList.add('on');
      setTimeout(() => App.commit(), 380);
      const left = App.state.todos.filter((x) => !x.done && x.due && x.due <= dkey()).length;
      if (left === 0 && t.due && t.due <= dkey()) App.unlock('alltasks-' + dkey(), "All of today's tasks done", 'Clear list. Plan tomorrow in the Daily Review.', 'check');
    } else App.commit();
  };
  App.actions.clearDone = () => {
    if (!App.confirm('Delete all completed tasks?')) return;
    App.state.todos = App.state.todos.filter((t) => !t.done);
    App.commit();
  };

  function todoSheet(t, preset = {}) {
    const isNew = !t;
    t = t || { title: '', due: dkey(), priority: 'med', goalId: '', ...preset };
    const goals = App.state.goals.filter((g) => !g.done);
    App.sheet({
      title: isNew ? 'New task' : 'Edit task',
      submit: isNew ? 'Add task' : 'Save',
      body: `${App.field('Task', App.input('title', { value: t.title, placeholder: 'What needs to be done?', required: true }))}
        ${App.field('Due date', App.input('due', { type: 'date', value: t.due || '' }), 'Leave empty for "someday".')}
        ${App.field('Priority', App.chips('priority', [{ value: 'high', label: 'High' }, { value: 'med', label: 'Medium' }, { value: 'low', label: 'Low' }], t.priority || 'med'))}
        ${goals.length ? App.field('Link to goal', `<select class="inp" name="goalId"><option value="">None</option>${goals.map((g) => `<option value="${g.id}" ${g.id === t.goalId ? 'selected' : ''}>${catEmoji(g.cat)} ${esc(g.title)}</option>`).join('')}</select>`) : ''}`,
      danger: isNew ? null : { act: 'deleteTodo', label: 'Delete', attrs: `data-id="${t.id}"` },
      onSubmit: (d) => {
        const title = (d.title || '').trim();
        if (!title) return false;
        const obj = { title: title.slice(0, 140), due: d.due || '', priority: PRI[d.priority] ? d.priority : 'med', goalId: d.goalId || '' };
        if (isNew) App.state.todos.push({ id: uid(), done: false, created: dkey(), ...obj }); else Object.assign(t, obj);
        App.toast(isNew ? 'Task added' : 'Task saved');
        App.commit();
      },
    });
  }
  App.todoSheet = todoSheet;
  App.actions.addTodo = (el) => todoSheet(null, el && el.dataset.goal ? { goalId: el.dataset.goal } : {});
  App.actions.editTodo = (el) => todoSheet(App.state.todos.find((x) => x.id === el.dataset.id));
  App.actions.deleteTodo = (el) => {
    if (!App.confirm('Delete this task?')) return;
    App.state.todos = App.state.todos.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.toast('Task deleted');
    App.commit();
  };

  function goalSheet(g, term, parentId) {
    const isNew = !g;
    g = g || { title: '', term: term || 'long', parentId: parentId || '', cat: 'personal', deadline: '', progress: 0, why: '' };
    const longs = App.state.goals.filter((x) => x.term === 'long' && x.id !== g.id);
    const kids = !isNew && App.state.goals.some((x) => x.parentId === g.id);
    App.sheet({
      title: isNew ? (g.term === 'long' ? 'New long-term goal' : 'New short-term goal') : 'Edit goal',
      submit: isNew ? 'Add goal' : 'Save',
      body: `${App.field('Goal', App.input('title', { value: g.title, placeholder: g.term === 'long' ? 'e.g. Become an FP&A Analyst' : 'e.g. Finish CMA Part 1 Section B', required: true }))}
        ${App.field('Type', App.chips('term', [{ value: 'long', label: 'Long-term' }, { value: 'short', label: 'Short-term' }], g.term))}
        ${App.field('Category', App.chips('cat', CATS, g.cat))}
        ${longs.length ? App.field('Part of (for short-term goals)', `<select class="inp" name="parentId"><option value="">None</option>${longs.map((l) => `<option value="${l.id}" ${l.id === g.parentId ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}</select>`) : ''}
        ${App.field('Deadline', App.input('deadline', { type: 'date', value: g.deadline }))}
        ${kids ? `<p class="field-hint">Progress is calculated from its short-term goals.</p>` : App.field('Progress', `<div class="range-wrap"><input class="range" type="range" name="progress" min="0" max="100" step="5" value="${g.progress || 0}" oninput="this.nextElementSibling.textContent=this.value+'%'"><output>${g.progress || 0}%</output></div>`)}
        ${App.field('Why does this matter?', App.textarea('why', g.why || '', { rows: 2, placeholder: 'Your reason keeps you going on hard days' }))}
        ${!isNew ? App.toggle('done', 'Mark as achieved', g.done) : ''}`,
      danger: isNew ? null : { act: 'deleteGoal', label: 'Delete', attrs: `data-id="${g.id}"` },
      onSubmit: (d) => {
        const title = (d.title || '').trim();
        if (!title) return false;
        const t = d.term === 'short' ? 'short' : 'long';
        const obj = { title: title.slice(0, 120), term: t, cat: d.cat || 'personal', deadline: d.deadline || '', parentId: t === 'short' ? d.parentId || '' : '', why: (d.why || '').slice(0, 300), progress: d.progress !== undefined ? +d.progress : g.progress || 0 };
        const wasDone = g.done;
        if (isNew) App.state.goals.push({ id: uid(), done: false, created: dkey(), ...obj }); else Object.assign(g, obj, { done: !!d.done });
        if (!isNew && !wasDone && d.done) App.unlock('goal-' + g.id, 'Goal achieved', g.title, 'trophy');
        else App.toast(isNew ? 'Goal added' : 'Goal saved');
        App.commit();
      },
    });
  }
  App.actions.addGoal = (el) => goalSheet(null, el.dataset.term, el.dataset.parent);
  App.actions.editGoal = (el) => goalSheet(App.state.goals.find((x) => x.id === el.dataset.id));
  App.actions.toggleGoal = (el) => {
    const g = App.state.goals.find((x) => x.id === el.dataset.id);
    if (!g) return;
    g.done = !g.done;
    if (g.done) { App.buzz(20); App.toast('Step complete'); }
    const parent = App.state.goals.find((x) => x.id === g.parentId);
    if (parent && !parent.done && App.state.goals.filter((x) => x.parentId === parent.id).every((x) => x.done)) {
      parent.done = true;
      App.unlock('goal-' + parent.id, 'Goal achieved', parent.title, 'trophy');
    }
    App.commit();
  };
  App.actions.deleteGoal = (el) => {
    const id = el.dataset.id;
    if (!App.confirm('Delete this goal? Linked short-term goals and tasks will be unlinked.')) return;
    App.state.goals = App.state.goals.filter((x) => x.id !== id);
    App.state.goals.forEach((x) => { if (x.parentId === id) x.parentId = ''; });
    App.state.todos.forEach((t) => { if (t.goalId === id) t.goalId = ''; });
    App.closeSheet();
    App.commit();
  };

  App.views.goals = { render };
})();
