'use strict';
/* Settings: profile, schedule, appearance & motion, backup (JSON), CSV export, restore, offline status, privacy. */
(function () {
  const { icon, esc, dkey } = App;

  /* ---------- profile form (shared with onboarding) ---------- */
  App.profileFields = (p) => `
    <div class="grid2">${App.field('Name', App.input('name', { value: p.name, placeholder: 'Your name', required: true }))}${App.field('Avatar (emoji, optional)', App.input('avatar', { value: p.avatar, placeholder: 'Initials used if empty' }))}</div>
    ${App.field('Gender (for BMR formula)', App.chips('gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], p.gender))}
    <div class="grid3">
      ${App.field('Age', App.input('age', { type: 'number', value: p.age, min: 13, max: 90, required: true, inputmode: 'numeric' }))}
      ${App.field('Height (cm)', App.input('height', { type: 'number', value: p.height, min: 120, max: 230, required: true, inputmode: 'numeric' }))}
      ${App.field('Weight (kg)', App.input('weight', { type: 'number', value: p.weight, min: 25, max: 250, step: 0.1, required: true, inputmode: 'decimal' }))}
    </div>
    ${App.field('Target weights (kg)', App.input('targets', { value: (p.targets || []).join(', '), placeholder: 'e.g. 55, 60' }), 'Comma separated, in order.')}
    ${App.field('Activity', App.chips('activity', App.ACTIVITY.map((a) => ({ value: a.id, label: `${a.label}<small>${a.note}</small>` })), p.activity))}
    ${App.field('Body goal', App.chips('mode', Object.entries(App.GOAL_MODES).map(([k, v]) => ({ value: k, label: v.label })), p.mode))}
    <div class="grid2">${App.field('Education', App.input('education', { value: p.education, placeholder: 'e.g. B.Com' }))}${App.field('Qualification', App.input('qualification', { value: p.qualification, placeholder: 'e.g. US CMA Candidate' }))}</div>
    <div class="grid2">${App.field('Career objective', App.input('careerGoal', { value: p.careerGoal }))}${App.field('Current field', App.input('field', { value: p.field }))}</div>
    ${App.field('Location', App.input('location', { value: p.location, placeholder: 'City, State, Country' }))}
    <div class="grid2">${App.field('Work starts', App.input('workStart', { type: 'time', value: p.workStart }))}${App.field('Work ends', App.input('workEnd', { type: 'time', value: p.workEnd }))}</div>
    ${App.field('Workdays', App.chips('workDays', [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: d, label: App.DOW[d] })), (p.workDays || []).map(String), 'checkbox'))}
    <p class="field-hint">Currency: INR (₹) · Time zone: ${esc(p.tz || 'Asia/Kolkata')} (LifeOS uses your device clock).</p>`;

  App.readProfile = (d, base) => {
    const num = (v, a, b, def) => { const n = +v; return n >= a && n <= b ? n : def; };
    const days = d._all ? d._all('workDays').map(Number) : base.workDays;
    return {
      ...base,
      name: (d.name || '').trim().slice(0, 40) || 'Friend',
      avatar: (d.avatar || '').trim().slice(0, 4),
      gender: d.gender === 'female' ? 'female' : 'male',
      age: num(d.age, 13, 90, 25), height: num(d.height, 120, 230, 170), weight: Math.round(num(d.weight, 25, 250, 60) * 10) / 10,
      targets: String(d.targets || '').split(/[,\s]+/).map(Number).filter((x) => x >= 25 && x <= 250).slice(0, 5),
      activity: +d.activity || 1.55, mode: App.GOAL_MODES[d.mode] ? d.mode : 'bulk',
      education: (d.education || '').slice(0, 60), qualification: (d.qualification || '').slice(0, 60), careerGoal: (d.careerGoal || '').slice(0, 80), field: (d.field || '').slice(0, 60), location: (d.location || '').slice(0, 80),
      workStart: d.workStart || base.workStart || '14:00', workEnd: d.workEnd || base.workEnd || '23:00', workDays: days && days.length ? days : base.workDays,
      currency: 'INR', tz: base.tz || 'Asia/Kolkata',
    };
  };

  function render() {
    const s = App.state.settings;
    const p = App.state.profile;
    return `${App.back()}
      ${App.header('Settings', 'Profile · appearance · data', '')}
      <section class="card reveal" style="--i:1"><div class="row gap"><span class="avatar">${p.avatar ? esc(p.avatar) : esc(App.initials(p.name))}</span>
        <div class="grow"><b>${esc(p.name)}</b><small class="muted block">${[p.age && p.age + ' yrs', p.height && p.height + ' cm', App.currentWeight() + ' kg', p.location].filter(Boolean).map(esc).join(' · ')}</small>
        <small class="muted block">${[p.qualification, p.careerGoal].filter(Boolean).map(esc).join(' · ')}</small></div>
        <button class="btn btn-soft sm" data-act="editProfile">${icon('edit')}Edit</button></div></section>

      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('sun')}Appearance</h3></div>
        ${App.field('Theme', `<div class="seg">${[['auto', 'Auto'], ['time', 'By time'], ['dark', 'Dark'], ['light', 'Light']].map(([v, l]) => `<button class="seg-btn ${s.theme === v ? 'on' : ''}" data-act="setTheme" data-v="${v}">${l}</button>`).join('')}</div>`, 'Dark Premium or Light Fresh. Auto follows your phone; By time is light 7 AM – 7 PM.')}
        ${App.field('Motion', `<div class="seg">${[['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']].map(([v, l]) => `<button class="seg-btn ${s.motion === v ? 'on' : ''}" data-act="setMotion" data-v="${v}">${l}</button>`).join('')}</div>`, 'Reduced turns off non-essential animation (also follows your phone setting).')}
        <label class="toggle-row"><span class="grow"><b>Haptic feedback</b><small class="muted block">Vibration on supported Android phones</small></span><input type="checkbox" class="switch" data-change="setHaptics" ${s.haptics !== false ? 'checked' : ''}></label>
        <label class="toggle-row"><span class="grow"><b>Splash animation</b><small class="muted block">Logo reveal when the app opens</small></span><input type="checkbox" class="switch" data-change="setSplash" ${s.splash !== false ? 'checked' : ''}></label>
      </section>

      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('shield')}Backup & restore</h3></div>
        <p class="muted small">Your data lives only in this browser on this device. Export a backup regularly and keep it somewhere safe (not in a public repository).</p>
        <div class="grid2 mt12"><button class="btn btn-primary" data-act="exportData">${icon('download')}JSON backup</button>
          <label class="btn btn-ghost">${icon('upload')}Restore<input type="file" accept="application/json,.json" data-change="importData" hidden></label></div>
        <label class="toggle-row"><span class="grow"><b>Include meal photos in backup</b><small class="muted block">Makes the file larger</small></span><input type="checkbox" class="switch" id="bkPhotos" checked></label>
        <div class="divider"></div>
        ${App.field('CSV export', App.select('', CSV_SETS.map((c) => ({ value: c.id, label: c.label })), 'transactions', 'id="csvSet"'))}
        <button class="btn btn-ghost btn-block" data-act="exportCsv">${icon('download')}Download CSV</button>
      </section>

      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('globe')}Offline status</h3></div>
        <div id="offlineInfo" class="list"><p class="muted small">Checking…</p></div>
        <button class="btn btn-ghost btn-block mt12" data-act="checkOffline">${icon('refresh')}Check again</button>
        <p class="field-hint">After the first visit everything works without internet: food library, calculations, logging, charts, backup. Only links you add to learning resources open web pages.</p>
      </section>

      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('lock')}Privacy</h3></div>
        <ul class="small" style="padding-left:18px;display:grid;gap:6px"><li>No account, no server, no analytics, no cloud uploads.</li><li>The app code can be hosted publicly; your database is never part of it.</li><li>Photos stay on this device (and in backups if you choose).</li><li>LifeOS never sends payment requests or messages to anyone.</li></ul>
      </section>

      <section class="card reveal" style="--i:6"><div class="card-head"><h3>${icon('alert')}Danger zone</h3></div>
        <button class="btn btn-ghost danger btn-block" data-act="resetAll">${icon('trash')}Erase all LifeOS data on this device</button></section>
      <p class="muted tiny ta-c">LifeOS 3.0 · data schema v${App.SCHEMA} · storage: ${App.storageMode()}</p>
      <div class="tabbar-space"></div>`;
  }

  async function after() {
    const box = document.getElementById('offlineInfo');
    if (!box) return;
    const rows = [];
    rows.push(['Network', navigator.onLine ? 'Online' : 'Offline (working from cache)']);
    const sw = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    rows.push(['Offline engine (service worker)', sw && sw.active ? 'Active' : location.protocol.startsWith('http') ? 'Not active yet (reload once)' : 'Needs http(s) hosting']);
    try {
      const keys = await caches.keys();
      const k = keys.find((x) => x.startsWith('lifeos-'));
      if (k) { const c = await caches.open(k); rows.push(['Cached app files', `${(await c.keys()).length} (${k})`]); } else rows.push(['Cached app files', 'None yet']);
    } catch (_) { rows.push(['Cached app files', 'Unavailable']); }
    const est = await App.estimate();
    if (est) rows.push(['Storage used', `${(est.usage / 1048576).toFixed(1)} MB${est.persisted ? ' · persistent' : ' · may be cleared if the device is very low on space'}`]);
    rows.push(['Database', App.storageMode() === 'indexeddb' ? 'IndexedDB' : 'localStorage (fallback)']);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    rows.push(['Installed as app', standalone ? 'Yes' : 'No (use “Install app” / “Add to Home screen”)']);
    box.innerHTML = rows.map(([k, v]) => `<div class="li"><span class="grow small">${esc(k)}</span><b class="small ta-r">${esc(v)}</b></div>`).join('');
  }

  /* ---------- actions ---------- */
  App.actions.editProfile = () => {
    const p = App.state.profile;
    App.sheet({
      title: 'Profile', submit: 'Save profile', body: App.profileFields({ ...p, weight: App.currentWeight() }),
      onSubmit: (d) => {
        const np = App.readProfile(d, p);
        if (np.weight !== App.currentWeight()) App.logWeight(np.weight);
        App.state.profile = np;
        App.toast('Profile updated');
        App.commit();
      },
    });
  };
  App.actions.setTheme = (el) => { App.state.settings.theme = el.dataset.v; App.applyTheme(); App.commit(); };
  App.actions.setMotion = (el) => { App.state.settings.motion = el.dataset.v; App.applyTheme(); App.commit(); };
  App.changes.setHaptics = (el) => { App.state.settings.haptics = el.checked; App.save(); if (el.checked) App.buzz(20); };
  App.changes.setSplash = (el) => { App.state.settings.splash = el.checked; App.save(); };
  App.actions.checkOffline = () => after();

  App.backupObject = (photos = true) => {
    const data = JSON.parse(JSON.stringify(App.state));
    if (!photos) for (const list of Object.values(data.nutrition.logs || {})) for (const m of list) delete m.photo;
    return { app: 'LifeOS', schema: App.SCHEMA, exportedAt: new Date().toISOString(), data };
  };
  App.actions.exportData = () => {
    const ph = document.getElementById('bkPhotos');
    App.download(`lifeos-backup-${dkey()}.json`, JSON.stringify(App.backupObject(!ph || ph.checked)), 'application/json');
    App.state.seen.lastBackup = dkey();
    App.save();
    App.toast('Backup downloaded. Keep it private.');
  };
  App.changes.importData = (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      let data;
      try {
        const j = JSON.parse(r.result);
        data = j && j.app === 'LifeOS' && j.data ? j.data : j;
        if (!data || typeof data !== 'object' || !('todos' in data || 'goals' in data || 'profile' in data)) throw new Error('not a backup');
      } catch (_) { App.toast('That file is not a LifeOS backup', 'bad'); el.value = ''; return; }
      const cnt = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0);
      const summary = `Profile: ${data.profile ? data.profile.name : 'none'}\nTransactions: ${cnt(data.money && data.money.txns)}\nMeal days: ${cnt(data.nutrition && data.nutrition.logs) || cnt(data.food)}\nWorkouts: ${cnt(data.gym && data.gym.logs)}\nTasks: ${cnt(data.todos)}`;
      const hasData = !!App.state.profile;
      if (!App.confirm(`Restore this backup?\n\n${summary}\n\nThis REPLACES all LifeOS data on this device.${hasData ? ' A copy of your current data will be downloaded first.' : ''}`)) { el.value = ''; return; }
      if (hasData) App.download(`lifeos-before-restore-${dkey()}.json`, JSON.stringify(App.backupObject(true)), 'application/json');
      if (!data.version) data.version = 1;
      await App.replace(data);
      if (App.state.nutrition && !App.state.nutrition.plan) App.state.nutrition.plan = App.defaultPlan();
      App.applyTheme();
      App.toast('Backup restored');
      location.hash = 'home';
      App.render();
    };
    r.readAsText(f);
  };
  App.actions.resetAll = async () => {
    if (!App.confirm('Erase ALL LifeOS data on this device? Export a backup first if you might need it.')) return;
    if (!App.confirm('Are you sure? This cannot be undone.')) return;
    await App.wipe();
    try { localStorage.removeItem('lifeos.v1.migrated'); } catch (_) {}
    location.hash = '';
    location.reload();
  };

  /* ---------- CSV ---------- */
  const cell = (v) => {
    let s = v === undefined || v === null ? '' : String(v);
    if (/^[=+\-@]/.test(s) && isNaN(+s)) s = "'" + s; // avoid spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCsv = (head, rows) => [head, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const CSV_SETS = [
    { id: 'transactions', label: 'Finance transactions', f: (s) => toCsv(['date', 'type', 'category', 'amount_inr', 'note', 'mode', 'direction', 'account', 'linked'], s.money.txns.slice().sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.type, App.txnCat ? App.txnCat(t.cat).label : t.cat, t.amount, t.note, t.mode, t.dir || '', t.account || '', t.link ? t.link.kind : ''])) },
    { id: 'meals', label: 'Meals & nutrition', f: (s) => toCsv(['date', 'meal', 'food', 'qty', 'unit', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g'], Object.entries(s.nutrition.logs).sort().flatMap(([d, ms]) => ms.flatMap((m) => m.items.map((i) => [d, m.slot, i.name, i.qty, i.unit, i.grams, i.kcal, i.p, i.c, i.f, i.fib])))) },
    { id: 'weights', label: 'Body weight', f: (s) => toCsv(['date', 'kg'], s.body.weights.map((w) => [w.date, w.kg])) },
    { id: 'water', label: 'Water & steps', f: (s) => { const ds = [...new Set([...Object.keys(s.body.waterMl || {}), ...Object.keys(s.body.steps || {})])].sort(); return toCsv(['date', 'water_ml', 'steps'], ds.map((d) => [d, (s.body.waterMl || {})[d] || 0, (s.body.steps || {})[d] || ''])); } },
    { id: 'workouts', label: 'Workout sets', f: (s) => toCsv(['date', 'workout', 'exercise', 'set', 'kg', 'reps', 'done', 'finished'], Object.entries(s.gym.logs).sort().flatMap(([k, l]) => { const [d, day] = k.split('|'); return Object.entries(l.sets || {}).flatMap(([ex, sets]) => sets.map((x, i) => [d, (App.DAYS[day] || { name: day }).name, App.exDef(ex).name, i + 1, x && x.w, x && x.r, x && x.done ? 'yes' : 'no', l.finished ? 'yes' : 'no'])); })) },
    { id: 'fees', label: 'Fees & payments', f: (s) => toCsv(['record', 'kind', 'party', 'description', 'category', 'amount_inr', 'issued', 'due', 'status', 'received_inr', 'outstanding_inr', 'payment_date', 'payment_inr', 'method', 'reference'], s.fees.records.flatMap((r) => { const c = App.feeCalc(r); const base = [r.id, r.kind, r.party, r.description, r.category, r.amount, r.issued, r.due, c.status, c.received, c.outstanding]; return (r.payments || []).length ? r.payments.map((p) => [...base, p.date, p.amount, p.method, p.ref]) : [[...base, '', '', '', '']]; })) },
    { id: 'study', label: 'CMA study sessions', f: (s) => toCsv(['date', 'part', 'section', 'type', 'minutes', 'attempted', 'correct', 'note'], s.cma.sessions.slice().sort((a, b) => a.date.localeCompare(b.date)).map((x) => [x.date, x.part, x.section, x.type, x.minutes, x.attempted, x.correct, x.note])) },
    { id: 'journal', label: 'Work journal', f: (s) => toCsv(['date', 'summary', 'original_note', 'areas', 'minutes'], s.work.journal.slice().sort((a, b) => a.date.localeCompare(b.date)).map((j) => [j.date, j.summary, j.raw, (j.areas || []).join('; '), j.mins])) },
    { id: 'worktasks', label: 'Work tasks', f: (s) => toCsv(['title', 'area', 'status', 'priority', 'due', 'created', 'completed'], s.work.tasks.map((t) => [t.title, t.area, t.status, t.priority, t.due, t.created, t.doneAt])) },
    { id: 'timesheets', label: 'Timesheets', f: (s) => toCsv(['date', 'start', 'end', 'break_min', 'hours', 'status'], Object.entries(s.work.timesheets).sort().map(([d, t]) => [d, t.start, t.end, t.breakMin, App.r2(App.timesheetHours(t)), t.status])) },
    { id: 'social', label: 'Social media minutes', f: (s) => toCsv(['date', 'app', 'minutes'], Object.entries(s.social.logs).sort().flatMap(([d, l]) => Object.entries(l).map(([id, m]) => [d, (s.social.apps.find((a) => a.id === id) || { name: id }).name, m]))) },
    { id: 'tasks', label: 'Personal tasks', f: (s) => toCsv(['title', 'due', 'priority', 'done', 'completed'], s.todos.map((t) => [t.title, t.due, t.priority, t.done ? 'yes' : 'no', t.doneAt || ''])) },
  ];
  App.CSV_SETS = CSV_SETS;
  App.actions.exportCsv = () => {
    const id = document.getElementById('csvSet').value;
    const set = CSV_SETS.find((c) => c.id === id);
    App.download(`lifeos-${id}-${dkey()}.csv`, '\ufeff' + set.f(App.state), 'text/csv');
    App.toast(`${set.label} exported`);
  };

  App.views.settings = { render, after };
})();
