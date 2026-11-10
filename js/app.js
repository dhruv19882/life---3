'use strict';
/* App shell: router, navigation (bottom bar + desktop sidebar), floating action menu, theme & motion,
   onboarding, service worker. */
(function () {
  const { icon, esc } = App;

  const NAV = [
    { r: 'home', label: 'Home', ic: 'home', group: 'main', note: 'Your day at a glance' },
    { r: 'fitness', label: 'Fitness', ic: 'dumbbell', group: 'main', note: 'Gym coach & body' },
    { r: 'work', label: 'Work', ic: 'briefcase', group: 'main', note: 'Work OS' },
    { r: 'progress', label: 'Progress', ic: 'chart', group: 'main', note: 'Life Score & reviews' },
    { r: 'nutrition', label: 'Nutrition', ic: 'flame', group: 'more', note: 'Targets, meals, planner' },
    { r: 'food', label: 'Food Library', ic: 'food', group: 'more', note: 'Indian food gallery' },
    { r: 'money', label: 'Finance', ic: 'wallet', group: 'more', note: 'Income, spend, budgets' },
    { r: 'dubai', label: 'Dubai Mission', ic: 'plane', group: 'more', note: 'Relocation & savings' },
    { r: 'fees', label: 'Fees & Payments', ic: 'receipt', group: 'more', note: 'To collect & to pay' },
    { r: 'cma', label: 'US CMA', ic: 'book', group: 'more', note: 'Study tracker' },
    { r: 'career', label: 'Career', ic: 'road', group: 'more', note: 'Skills & portfolio' },
    { r: 'goals', label: 'Goals & Tasks', ic: 'target', group: 'more', note: 'Goals and to-dos' },
    { r: 'social', label: 'Social Media', ic: 'phone', group: 'more', note: 'Screen-time limits' },
    { r: 'review', label: 'Daily Review', ic: 'moon', group: 'more', note: 'End-of-day check-in' },
    { r: 'settings', label: 'Settings', ic: 'settings', group: 'more', note: 'Profile, theme, backup' },
  ];
  App.NAV = NAV;
  const ALIAS = { gym: 'fitness', more: 'more' };
  const ROUTES = [...NAV.map((n) => n.r), 'more'];
  let current = null;

  function route() {
    let h = (location.hash || '#home').slice(1).split('?')[0];
    h = ALIAS[h] || h;
    return ROUTES.includes(h) && App.views[h] ? h : 'home';
  }
  App.route = route;

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
      try { html = App.views[r].render(); }
      catch (e) { console.error(e); html = `<div class="card mt24">${App.empty('alert', 'This screen hit an error', String(e.message || e))}</div>`; }
    }
    view.innerHTML = `<div class="page ${changed && !opts.quiet ? 'enter' : ''}">${html}</div>`;
    view.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
    const page = view.firstElementChild;
    if (changed) window.scrollTo(0, 0); else window.scrollTo(0, y);
    if (!changed || opts.quiet) page.classList.add('no-reveal');
    App.animateIn(page);
    if (App.state.profile && App.views[r].after) App.views[r].after(page);
    current = r;
    updateNav(r);
  };

  function updateNav(r) {
    const tabR = ['home', 'fitness', 'work', 'progress'].includes(r) ? r : 'more';
    const tabs = [...document.querySelectorAll('.tab')];
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.r === tabR));
    const on = tabs.find((t) => t.dataset.r === tabR);
    const ind = document.getElementById('tabIndicator');
    if (on && on.offsetWidth) {
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = `translateX(${on.offsetLeft - 6}px)`;
      ind.classList.add('on');
    }
    document.querySelectorAll('.side-link').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
    // Centre the floating + button over its slot in the bottom bar (the slot sits after Home and Fitness).
    const gap = document.querySelector('.tab-gap');
    const fab = document.getElementById('fab');
    if (gap && fab) {
      const g = gap.getBoundingClientRect();
      fab.style.left = innerWidth < 1000 && g.width ? `${g.left + g.width / 2}px` : '';
    }
  }

  function renderSidebar() {
    const link = (n) => `<button class="side-link" data-act="go" data-r="${n.r}">${icon(n.ic)}<span>${esc(n.label)}</span></button>`;
    document.getElementById('sidebar').innerHTML = `
      <div class="side-logo"><span class="logo-mark">${icon('bolt')}</span><span>Life<b>OS</b></span></div>
      ${NAV.filter((n) => n.group === 'main').map(link).join('')}
      <div class="side-group">Modules</div>
      ${NAV.filter((n) => n.group === 'more').map(link).join('')}`;
  }

  App.commit = (opts = { quiet: true }) => { App.save(); App.render(opts); };
  App.go = (r, tab) => {
    if (tab) App.ui[(ALIAS[r] || r) + 'Tab'] = tab;
    closeFab();
    if (route() === (ALIAS[r] || r) && location.hash) App.render({ quiet: true });
    else location.hash = r;
  };
  App.actions.go = (el) => { App.buzz(); App.closeSheet(); App.go(el.dataset.r, el.dataset.tab); };

  /* ---------- event delegation ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = App.actions[el.dataset.act];
    if (!fn) { console.warn('No action', el.dataset.act); return; }
    if (el.tagName !== 'LABEL' && el.type !== 'checkbox' && el.type !== 'file') e.preventDefault();
    try { fn(el, e); } catch (err) { console.error(err); App.toast('That action failed. Nothing was changed.', 'bad'); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && App.changes[el.dataset.change]) App.changes[el.dataset.change](el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && App.inputs[el.dataset.input]) App.inputs[el.dataset.input](el, e);
  });
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .tab, .icon-btn, .seg-btn, .qadd, .more-item, .tile, .pillar');
    if (!b || App.reduced()) return;
    const rect = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const d = Math.max(rect.width, rect.height);
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { App.closeSheet(); App.closeOverlay(); closeFab(); }
  });
  window.addEventListener('hashchange', () => App.render());
  window.addEventListener('resize', () => updateNav(route()));

  /* ---------- floating action menu ---------- */
  const FAB = [
    { label: 'Add Food', ic: 'food', act: () => App.openFoodPicker() },
    { label: 'Add Expense', ic: 'minus', act: () => App.txnSheet(null, 'expense') },
    { label: 'Add Income', ic: 'plus', act: () => App.txnSheet(null, 'income') },
    { label: 'Collect Payment', ic: 'receipt', act: () => App.collectPaymentPicker() },
    { label: 'Add Weight', ic: 'scale', act: () => App.actions.quickWeight() },
    { label: 'Add Water', ic: 'drop', act: () => App.waterSheet() },
    { label: 'Log Workout', ic: 'dumbbell', act: () => { App.ui.gymDay = null; App.go('fitness', 'today'); } },
    { label: 'Study Session', ic: 'book', act: () => App.studySheet() },
    { label: 'Work Note', ic: 'note', act: () => App.journalSheet() },
    { label: 'Add Task', ic: 'list', act: () => App.todoSheet(null) },
  ];
  function closeFab() {
    const m = document.getElementById('fabMenu');
    const b = document.getElementById('fab');
    if (!m || m.hidden) return;
    m.classList.remove('on');
    b.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!m.classList.contains('on')) m.hidden = true; }, 300);
  }
  App.closeFab = closeFab;
  App.actions.fab = () => {
    const m = document.getElementById('fabMenu');
    const b = document.getElementById('fab');
    if (!m.hidden) return closeFab();
    App.buzz(15);
    m.innerHTML = `<div class="fm-bg" data-act="fabClose"></div><div class="fm-grid" role="menu">${FAB.map((f, i) =>
      `<button class="fm-item" role="menuitem" style="--i:${i}" data-act="fabDo" data-i="${i}"><span class="tile-ic">${icon(f.ic)}</span>${esc(f.label)}</button>`).join('')}</div>`;
    m.hidden = false;
    b.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => m.classList.add('on'));
  };
  App.actions.fabClose = closeFab;
  App.actions.fabDo = (el) => { closeFab(); App.buzz(); setTimeout(() => FAB[+el.dataset.i].act(), 120); };

  /* ---------- theme & motion ---------- */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  App.applyTheme = () => {
    const t = (App.state.settings && App.state.settings.theme) || 'auto';
    const h = new Date().getHours();
    const dark = t === 'dark' || (t === 'auto' && mq.matches) || (t === 'time' && (h < 7 || h >= 19));
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.getElementById('metaTheme').setAttribute('content', dark ? '#111315' : '#F2F4EE');
    try { localStorage.setItem('lifeos.theme', t); } catch (_) {}
    const m = (App.state.settings && App.state.settings.motion) || 'system';
    document.documentElement.classList.toggle('motion-reduced', m === 'reduced');
    document.documentElement.classList.toggle('motion-full', m === 'full');
  };
  mq.addEventListener && mq.addEventListener('change', App.applyTheme);
  setInterval(() => { if (App.state && App.state.settings.theme === 'time') App.applyTheme(); }, 60000);

  /* ---------- onboarding ---------- */
  function onboarding() {
    const p = App.profileDefaults();
    return `<section class="onb">
      <div class="onb-hero reveal">
        <div class="logo-badge">${icon('bolt')}</div>
        <h1>Life<b>OS</b></h1>
        <p>One Life. One System. Total Clarity.</p>
      </div>
      <form id="onbForm" class="card reveal" style="--i:1" novalidate>
        <h3>Set up your profile</h3>
        <p class="muted small mt4">Used for calorie, protein and water targets. Everything stays on this device. You can change it later in Settings.</p>
        <div class="mt16">${App.profileFields(p)}</div>
        <button class="btn btn-primary btn-block btn-lg mt8" type="submit">${icon('zap')}Start LifeOS</button>
        <div class="divider"></div>
        <label class="btn btn-ghost btn-block">${icon('upload')}Restore a backup or starter file<input type="file" accept="application/json,.json" data-change="importData" hidden></label>
        <p class="field-hint ta-c">Have a LifeOS backup (.json)? Restore it here instead.</p>
      </form>
    </section>`;
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'onbForm') return;
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form).entries());
    d._all = (n) => new FormData(form).getAll(n);
    const p = App.readProfile(d, App.profileDefaults());
    App.state.profile = p;
    App.state.body.weights.push({ date: App.dkey(), kg: p.weight });
    App.save();
    location.hash = 'home';
    App.render();
    setTimeout(() => App.celebrate({ title: `Welcome, ${p.name}`, sub: 'Your LifeOS is ready. Tap + to log anything.', ic: 'bolt', label: 'LifeOS activated' }), 400);
  });

  /* ---------- splash ---------- */
  function hideSplash() {
    const s = document.getElementById('splash');
    s.classList.add('done');
    setTimeout(() => s.remove(), 600);
  }

  /* ---------- boot ---------- */
  async function boot() {
    const t0 = performance.now();
    await App.load();
    App.applyTheme();
    if (App.state.nutrition && !App.state.nutrition.plan) App.state.nutrition.plan = App.defaultPlan();
    document.querySelectorAll('#tabbar [data-icon], #fab [data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
    renderSidebar();
    const showSplash = App.state.settings.splash !== false && !App.reduced() && !sessionStorage.getItem('lifeos.splashed');
    const wait = showSplash ? Math.max(0, 1500 - (performance.now() - t0)) : 0;
    try { sessionStorage.setItem('lifeos.splashed', '1'); } catch (_) {}
    setTimeout(() => {
      App.render();
      hideSplash();
      if (App.migrationNote) setTimeout(() => App.toast(App.migrationNote), 700);
    }, wait);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw && nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) App.toast('Update ready. Reopen LifeOS to use it.', 'warn');
          });
        });
      }).catch((e) => console.warn('SW registration failed', e));
    }
  }
  boot().catch((e) => {
    console.error(e);
    hideSplash();
    document.getElementById('view').innerHTML = `<div class="card mt24"><b>LifeOS could not start.</b><p class="muted">${esc(e.message || e)}</p></div>`;
  });
})();
