'use strict';
/* Core: state storage, date and number helpers, icons, event delegation. */
const App = (window.App = { views: {}, actions: {}, changes: {}, ui: {} });

(function () {
  const KEY = 'lifeos.v1';

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const parseD = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const lastNDays = (n) => Array.from({ length: n }, (_, i) => dkey(addDays(new Date(), i - n + 1)));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const prettyDate = (s) => {
    if (!s) return '';
    const t = dkey();
    const diff = daysBetween(t, s);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const d = parseD(s);
    return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
  };

  /* ---------- formatting ---------- */
  const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const inr = (n) => (n < 0 ? '-₹' : '₹') + inrFmt.format(Math.abs(Math.round(n || 0)));
  const num = (n) => inrFmt.format(Math.round(n || 0));
  const fmtMin = (m) => {
    m = Math.round(m || 0);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}`;
  };
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- state ---------- */
  const defaults = () => ({
    version: 1,
    profile: null,
    goals: [],
    todos: [],
    social: {
      apps: [
        { id: 'ig', name: 'Instagram', color: '#e1306c', low: 30, high: 60 },
        { id: 'yt', name: 'YouTube', color: '#ff3b3b', low: 45, high: 90 },
        { id: 'wa', name: 'WhatsApp', color: '#25d366', low: 30, high: 60 },
        { id: 'sc', name: 'Snapchat', color: '#f5e000', low: 20, high: 40 },
      ],
      logs: {}, // { 'YYYY-MM-DD': { appId: minutes } }
    },
    money: { txns: [], budgets: {}, monthly: 15000 },
    body: { weights: [], water: {}, steps: {}, waterGoal: 10, stepGoal: 8000 },
    food: {}, // { date: { meals: {mealId:true}, extra:[{id,name,kcal,protein}] } }
    gym: { logs: {} }, // { date: { day, sets:{exId:[{w,r,done}]}, finished } }
  });

  function load() {
    const base = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        for (const k of Object.keys(base)) {
          if (raw[k] === undefined) continue;
          base[k] =
            base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && raw[k] && typeof raw[k] === 'object'
              ? { ...base[k], ...raw[k] }
              : raw[k];
        }
      }
    } catch (e) {
      console.warn('Could not read saved data', e);
    }
    return base;
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(App.state));
      } catch (e) {
        App.toast && App.toast('Could not save: storage is full', 'bad');
      }
    }, 120);
  }

  /* ---------- icons (stroke icons, 24x24) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18h2"/>',
    wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><circle cx="16" cy="14" r="1.2"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.3-2.3-5.6-4-7.7-.5 2-1.6 3.2-3 3.5.4-3.3-1-6.3-3.5-8-.2 3.2-1.8 5-3.3 7A8.3 8.3 0 0 0 5 15.2C5 19.3 8 22 12 22Z"/>',
    drop: '<path d="M12 2.7S5.5 9.6 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.6 12 2.7 12 2.7Z"/>',
    steps: '<path d="M7 16.5c-1.7 0-3-1.6-3-4.5S5 6 7 6s3 2.7 3 5.5-1.3 5-3 5Z"/><path d="M4.5 19.5h5"/><path d="M17 13.5c1.7 0 3-1.6 3-4.5s-1-6-3-6-3 2.7-3 5.5 1.3 5 3 5Z"/><path d="M14.5 16.5h5"/>',
    alert: '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    up: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    downT: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
    play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
    food: '<path d="M7 2.5v8.5M4.5 2.5v5a2.5 2.5 0 0 0 5 0v-5M7 11v10.5"/><path d="M17.5 21.5V2.5c-2.5 1.5-3.5 4.5-3.5 8 0 2 1 3 3.5 3"/>',
    scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.7a1.6 1.6 0 0 0-2.6 0Z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>',
    upload: '<path d="M12 16V5M7 9.5l5-5 5 5M4.5 20h15"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 21h4"/>',
    zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    heart: '<path d="M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 8 2.8c0 5.8-8 10.4-8 10.4Z"/>',
    rupee: '<path d="M6.5 4h11M6.5 8.5h11M9.5 4c3.3 0 5 1.9 5 4.5S12.8 13 9.5 13h-3l8 7.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3.5 9M4 13a8 8 0 0 0 14.6 4.5l1.9-2.5"/><path d="M3.5 4v5h5M20.5 20v-5h-5"/>',
    trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 4.5M16.5 6h3a3 3 0 0 1-3 4.5M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    shield: '<path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<circle cx="12" cy="12" r="9"/><path d="m13 6.5-4 6h3.5l-1 5 4-6H12l1-5Z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ---------- haptics ---------- */
  const buzz = (ms = 10) => {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (_) {}
  };

  Object.assign(App, {
    state: load(),
    save,
    defaults,
    STORAGE_KEY: KEY,
    dkey, mkey, parseD, addDays, daysBetween, lastNDays, prettyDate, DOW, MON,
    inr, num, fmtMin, esc, uid, clamp, icon, buzz,
  });
})();
