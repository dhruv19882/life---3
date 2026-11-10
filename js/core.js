'use strict';
/* Core: app namespace, date/number helpers, icons, default state and schema migrations.
   Persistence lives in store.js (IndexedDB). */
const App = (window.App = { views: {}, actions: {}, changes: {}, inputs: {}, ui: {} });

(function () {
  const SCHEMA = 3; // v1 = original localStorage app, v3 = LifeOS 3.0

  /* ---------- dates (device local time; LifeOS is set up for Asia/Kolkata) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const parseD = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const lastNDays = (n, end = new Date()) => Array.from({ length: n }, (_, i) => dkey(addDays(end, i - n + 1)));
  /** Monday of the week containing d, as YYYY-MM-DD. */
  const weekStart = (d = new Date()) => {
    const x = typeof d === 'string' ? parseD(d) : new Date(d);
    const dow = (x.getDay() + 6) % 7;
    return dkey(addDays(x, -dow));
  };
  const weekDays = (start) => Array.from({ length: 7 }, (_, i) => dkey(addDays(parseD(start), i)));
  const monthsBetween = (a, b) => {
    const A = parseD(a), B = parseD(b);
    return (B.getFullYear() - A.getFullYear()) * 12 + (B.getMonth() - A.getMonth()) + (B.getDate() - A.getDate()) / 30.44;
  };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const prettyDate = (s, opts = {}) => {
    if (!s) return '';
    const diff = daysBetween(dkey(), s);
    if (!opts.absolute) {
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
    }
    const d = parseD(s);
    return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() || opts.year ? ' ' + d.getFullYear() : ''}`;
  };
  const monthLabel = (m) => {
    const d = parseD(m + '-01');
    return `${MON_LONG[d.getMonth()]} ${d.getFullYear()}`;
  };
  const timeToMin = (t) => {
    const [h, m] = String(t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fmtClock = (t) => {
    const m = timeToMin(t);
    const h = Math.floor(m / 60) % 24;
    return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
  };

  /* ---------- numbers & text ---------- */
  const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const inrFmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inr = (n, dec = false) => {
    const v = Number(n) || 0;
    return (v < 0 ? '-₹' : '₹') + (dec ? inrFmt2.format(Math.abs(v)) : inrFmt.format(Math.abs(Math.round(v))));
  };
  const num = (n, dec = 0) => (dec ? (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : inrFmt.format(Math.round(Number(n) || 0)));
  const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const fmtMin = (m) => {
    m = Math.round(m || 0);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}`;
  };
  const fmtHours = (m) => `${r1((m || 0) / 60)} h`;
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const money = (v) => Math.round((Number(v) || 0) * 100) / 100; // keep paise precision, avoid float drift
  const pct = (a, b) => (b > 0 ? a / b : 0);
  const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;

  /* ---------- default state ---------- */
  const DEFAULT_SOCIAL = [
    { id: 'ig', name: 'Instagram', color: '#E1306C', low: 30, high: 60 },
    { id: 'yt', name: 'YouTube', color: '#FF4E45', low: 45, high: 90 },
    { id: 'wa', name: 'WhatsApp', color: '#25D366', low: 30, high: 60 },
    { id: 'sc', name: 'Snapchat', color: '#F5E000', low: 20, high: 40 },
  ];

  const defaults = () => ({
    version: SCHEMA,
    createdAt: new Date().toISOString(),
    profile: null,
    settings: { theme: 'auto', motion: 'system', haptics: true, splash: true, sound: false },
    goals: [],
    todos: [],
    social: { apps: DEFAULT_SOCIAL.map((a) => ({ ...a })), logs: {} },
    money: { txns: [], budgets: {}, monthly: 15000, opening: 0, recurring: [] },
    body: { weights: [], waterMl: {}, steps: {}, stepGoal: 8000 },
    nutrition: { logs: {}, customFoods: [], favourites: [], recipes: [], savedMeals: [], overrides: {}, prices: {}, targets: {}, plan: null, recent: [] },
    gym: { logs: {}, split: null, days: {}, customEx: {} },
    dubai: null, // created from App.dubaiDefaults() on first open
    fees: { records: [] },
    work: { tasks: [], journal: [], timesheets: {} },
    cma: { parts: { p1: { examDate: '', status: 'preparing', score: '' }, p2: { examDate: '', status: 'not-started', score: '' } }, topics: {}, sessions: [], weeklyTargetMin: 600, weakFlags: {}, backlog: null },
    career: null, // created from App.careerDefaults() on first open
    reviews: {},
    achievements: {},
    seen: {},
  });

  /* ---------- migrations: run in order, each takes and returns the state ---------- */
  const MIGRATIONS = {
    // v1 (original app) -> v3
    2(s) {
      const d = defaults();
      for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
      if (s.profile) {
        s.profile = { ...App.profileDefaults(), ...s.profile };
      }
      // Old diet plan check-offs and extra foods become real nutrition log entries so nothing is lost.
      if (s.food && typeof s.food === 'object') {
        const legacy = App.LEGACY_PLAN || {};
        for (const [date, f] of Object.entries(s.food)) {
          const meals = (s.nutrition.logs[date] = s.nutrition.logs[date] || []);
          for (const [mid, on] of Object.entries(f.meals || {})) {
            if (!on || !legacy[mid]) continue;
            const m = legacy[mid];
            meals.push({ id: 'm1-' + date + '-' + mid, slot: m.slot, ts: Date.now(), source: 'legacy-plan',
              items: [{ name: m.name + ' (old plan)', qty: 1, unit: 'serving', grams: 0, kcal: m.kcal, p: m.p, c: m.c, f: m.f, fib: 0 }] });
          }
          for (const x of f.extra || []) {
            meals.push({ id: 'm1-' + x.id, slot: 'snacks', ts: Date.now(), source: 'legacy-extra',
              items: [{ name: x.name, qty: 1, unit: 'serving', grams: 0, kcal: +x.kcal || 0, p: +x.p || 0, c: 0, f: 0, fib: 0 }] });
          }
        }
        s.legacyFood = s.food;
        delete s.food;
      }
      // Social apps: keep user limits; "low" = warning limit, "high" = maximum limit.
      s.money.txns = (s.money.txns || []).map((t) => ({ ...t, amount: money(t.amount) }));
      s.money.recurring = s.money.recurring || [];
      s.money.opening = s.money.opening || 0;
      s.gym.days = s.gym.days || {};
      s.gym.customEx = s.gym.customEx || {};
      // Water was stored as 250 ml glasses; it is now stored in ml.
      s.body.waterMl = s.body.waterMl || {};
      for (const [d, g] of Object.entries(s.body.water || {})) s.body.waterMl[d] = (s.body.waterMl[d] || 0) + (+g || 0) * 250;
      delete s.body.water;
      delete s.body.waterGoal;
      return s;
    },
    3(s) {
      const d = defaults();
      for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
      for (const k of ['settings', 'nutrition', 'money', 'body', 'gym', 'work', 'cma', 'fees', 'social']) {
        if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) s[k] = { ...d[k], ...(s[k] || {}) };
      }
      return s;
    },
  };

  function migrate(s) {
    if (!s || typeof s !== 'object') return defaults();
    let v = Number(s.version) || 1;
    while (v < SCHEMA) {
      v++;
      if (MIGRATIONS[v]) s = MIGRATIONS[v](s);
      s.version = v;
    }
    // Always fill any keys that a newer build added.
    const d = defaults();
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    return s;
  }

  /* ---------- icons (24x24 stroke icons) ---------- */
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
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    heart: '<path d="M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 8 2.8c0 5.8-8 10.4-8 10.4Z"/>',
    rupee: '<path d="M6.5 4h11M6.5 8.5h11M9.5 4c3.3 0 5 1.9 5 4.5S12.8 13 9.5 13h-3l8 7.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3.5 9M4 13a8 8 0 0 0 14.6 4.5l1.9-2.5"/><path d="M3.5 4v5h5M20.5 20v-5h-5"/>',
    trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 4.5M16.5 6h3a3 3 0 0 1-3 4.5M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    shield: '<path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<circle cx="12" cy="12" r="9"/><path d="m13 6.5-4 6h3.5l-1 5 4-6H12l1-5Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    plane: '<path d="M21 15.5 13.5 11V5a1.5 1.5 0 0 0-3 0v6L3 15.5V17l7.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-4.5L21 17Z"/>',
    receipt: '<path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" transform="translate(0 0)"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    note: '<path d="M5 3h10l4 4v14H5Z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16.5h5"/>',
    road: '<path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z"/>',
    medal: '<circle cx="12" cy="15" r="5.5"/><path d="m8.5 10.5-3-7.5h4l2.5 5M15.5 10.5l3-7.5h-4L12 8"/><path d="m12 12.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.spark}</svg>`;

  /* ---------- haptics & motion preference ---------- */
  const buzz = (ms = 10) => {
    try {
      if (App.state && App.state.settings && App.state.settings.haptics === false) return;
      navigator.vibrate && navigator.vibrate(ms);
    } catch (_) {}
  };
  const reduced = () => {
    const pref = App.state && App.state.settings && App.state.settings.motion;
    if (pref === 'reduced') return true;
    if (pref === 'full') return false;
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  Object.assign(App, {
    SCHEMA, defaults, migrate, MIGRATIONS,
    dkey, mkey, parseD, addDays, daysBetween, lastNDays, weekStart, weekDays, monthsBetween, prettyDate, monthLabel, timeToMin, fmtClock,
    DOW, DOW_LONG, MON, MON_LONG,
    inr, num, r1, r2, fmtMin, fmtHours, esc, uid, clamp, sum, money, pct, plural, icon, buzz, reduced,
    ICONS: P,
  });
})();
