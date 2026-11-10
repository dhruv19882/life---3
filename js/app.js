'use strict';
/* App shell: router, rendering, event delegation, onboarding, settings, service worker. */
(function () {
  const { icon, esc } = App;
  Object.assign(App.ui, { goalsTab: 'todo', gymTab: 'today', moneyTab: 'overview', gymDay: null, todoFilter: 'open' });

  const ROUTES = ['home', 'goals', 'social', 'money', 'gym'];
  let current = null;

  function route() {
    const h = (location.hash || '#home').slice(1);
    return ROUTES.includes(h) ? h : 'home';
  }

  App.render = (opts = {}) => {
    const view = document.getElementById('view');
    const r = route();
    const changed = r !== current;
    const y = window.scrollY;
    let html;
    if (!App.state.profile) {
      html = onboarding();
      document.body.classList.add('onboarding');
    } else {
      document.body.classList.remove('onboarding');
      html = App.views[r].render();
    }
    view.innerHTML = `<div class="page ${changed && !opts.quiet ? 'enter' : ''}">${html}</div>`;
    view.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
    const page = view.firstElementChild;
    if (changed) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    if (!changed || opts.quiet) page.classList.add('no-reveal');
    App.animateIn(page);
    App.views[r] && App.views[r].after && App.views[r].after(page);
    current = r;
    updateTabs(r);
  };

  function updateTabs(r) {
    const tabs = [...document.querySelectorAll('.tab')];
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.r === r));
    const on = tabs.find((t) => t.dataset.r === r);
    const ind = document.getElementById('tabIndicator');
    if (on) {
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
    }
  }

  /** Re-render the current view after a state change and persist. */
  App.commit = (opts = { quiet: true }) => {
    App.save();
    App.render(opts);
  };

  /** Navigate to a route, optionally selecting a sub-tab (stored as App.ui[route + 'Tab']). */
  App.go = (r, tab) => {
    if (tab) App.ui[r + 'Tab'] = tab;
    if (route() === r && location.hash) App.render({ quiet: true });
    else location.hash = r;
  };
  App.actions.go = (el) => { App.buzz(); App.go(el.dataset.r, el.dataset.tab); };

  /* ---------- event delegation ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = App.actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName !== 'LABEL' && el.type !== 'checkbox') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && App.changes[el.dataset.change]) App.changes[el.dataset.change](el, e);
  });
  // Ripple effect on buttons
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .tab, .fab, .tile, .icon-btn, .seg-btn');
    if (!b) return;
    const rect = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const d = Math.max(rect.width, rect.height);
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') App.closeSheet(); });

  window.addEventListener('hashchange', () => App.render());
  window.addEventListener('resize', () => updateTabs(route()));

  /* ---------- onboarding / profile ---------- */
  function profileForm(p) {
    p = p || { name: '', gender: 'male', age: 20, height: 170, weight: 50, activity: 1.55, mode: 'bulk' };
    return `
      ${App.field('Your name', App.input('name', { value: p.name, placeholder: 'e.g. Rahul', required: true }))}
      ${App.field('Gender', App.chips('gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], p.gender))}
      <div class="grid3">
        ${App.field('Age', App.input('age', { type: 'number', value: p.age, min: 13, max: 80, required: true, inputmode: 'numeric' }))}
        ${App.field('Height (cm)', App.input('height', { type: 'number', value: p.height, min: 120, max: 220, required: true, inputmode: 'numeric' }))}
        ${App.field('Weight (kg)', App.input('weight', { type: 'number', value: p.weight, min: 30, max: 200, step: 0.1, required: true, inputmode: 'decimal' }))}
      </div>
      ${App.field('Activity', App.chips('activity', App.ACTIVITY.map((a) => ({ value: a.id, label: `${a.label}<small>${a.note}</small>` })), p.activity))}
      ${App.field('Goal', App.chips('mode', Object.entries(App.GOAL_MODES).map(([k, v]) => ({ value: k, label: v.label })), p.mode))}`;
  }

  function readProfile(d) {
    return {
      name: (d.name || '').trim().slice(0, 30) || 'Champ',
      gender: d.gender === 'female' ? 'female' : 'male',
      age: App.clamp(+d.age || 20, 13, 80),
      height: App.clamp(+d.height || 170, 120, 220),
      weight: App.clamp(+d.weight || 50, 30, 200),
      activity: +d.activity || 1.55,
      mode: App.GOAL_MODES[d.mode] ? d.mode : 'bulk',
    };
  }

  function onboarding() {
    return `<section class="onb">
      <div class="onb-hero reveal">
        <div class="logo-badge">${icon('bolt')}</div>
        <h1>Life<span class="grad-text">OS</span></h1>
        <p>Goals, to-dos, social media limits, money, fitness and your gym coach. One app.</p>
      </div>
      <form id="onbForm" class="card reveal" style="--i:1">
        <h3>Set up your coach</h3>
        <p class="muted">Used to calculate your calories, protein and workout plan. Everything stays on this phone.</p>
        ${profileForm(null)}
        <button class="btn btn-primary btn-block" type="submit">${icon('zap')}Build my plan</button>
      </form>
    </section>`;
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'onbForm') return;
    e.preventDefault();
    const p = readProfile(Object.fromEntries(new FormData(e.target).entries()));
    App.state.profile = p;
    App.state.body.weights.push({ date: App.dkey(), kg: p.weight });
    App.state.body.waterGoal = Math.round((App.targets(p).water * 1000) / 250);
    App.save();
    App.confetti();
    App.toast(`Welcome ${p.name}! Your plan is ready.`);
    location.hash = 'home';
    App.render();
  });

  /* ---------- settings ---------- */
  App.actions.settings = () => {
    App.sheet({
      title: 'Profile & settings',
      submit: 'Save profile',
      body: `${profileForm(App.state.profile)}
        <div class="divider"></div>
        <p class="field-label">Backup</p>
        <div class="row gap">
          <button type="button" class="btn btn-soft" data-act="exportData">${icon('download')}Export</button>
          <label class="btn btn-soft">${icon('upload')}Import<input type="file" accept="application/json" data-change="importData" hidden></label>
        </div>
        <p class="field-hint">Your data is stored only in this browser. Export a backup now and then.</p>
        <div class="divider"></div>
        <button type="button" class="btn btn-ghost danger" data-act="resetAll">${icon('trash')}Erase all data</button>`,
      onSubmit: (d) => {
        const p = readProfile(d);
        const old = App.state.profile;
        App.state.profile = p;
        if (old && old.weight !== p.weight) logWeight(p.weight);
        App.toast('Profile updated');
        App.commit();
      },
    });
  };

  function logWeight(kg) {
    const w = App.state.body.weights;
    const t = App.dkey();
    const ex = w.find((x) => x.date === t);
    if (ex) ex.kg = kg; else w.push({ date: t, kg });
    w.sort((a, b) => a.date.localeCompare(b.date));
  }
  App.logWeight = logWeight;

  App.actions.exportData = () => {
    const blob = new Blob([JSON.stringify(App.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lifeos-backup-${App.dkey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    App.toast('Backup downloaded');
  };
  App.changes.importData = (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d !== 'object' || !('goals' in d) || !('money' in d)) throw new Error('bad');
        localStorage.setItem(App.STORAGE_KEY, JSON.stringify(d));
        location.reload();
      } catch (_) {
        App.toast('That file is not a LifeOS backup', 'bad');
      }
    };
    r.readAsText(f);
  };
  App.actions.resetAll = () => {
    if (!confirm('Erase ALL your LifeOS data on this device? This cannot be undone.')) return;
    localStorage.removeItem(App.STORAGE_KEY);
    location.reload();
  };

  /* ---------- boot ---------- */
  document.querySelectorAll('#tabbar [data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
  App.render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
