'use strict';
/* Storage: IndexedDB (object store "kv", one record per top-level module).
   Falls back to localStorage if IndexedDB is unavailable (e.g. some private modes).
   Data never leaves the device. */
(function () {
  const DB_NAME = 'lifeos';
  const DB_VERSION = 1;
  const STORE = 'kv';
  const LEGACY_KEY = 'lifeos.v1'; // original app (localStorage)
  const FALLBACK_KEY = 'lifeos.fallback';

  let db = null;
  let mode = 'indexeddb';

  function open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no-idb'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
  }

  function readAll() {
    return new Promise((resolve, reject) => {
      const out = {};
      const tx = db.transaction(STORE, 'readonly');
      const st = tx.objectStore(STORE);
      const req = st.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function writeAll(obj, removeMissing) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      if (removeMissing) st.clear();
      for (const [k, v] of Object.entries(obj)) st.put(v, k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));
    });
  }

  /** Load state. Order: IndexedDB -> fallback localStorage -> legacy v1 localStorage -> fresh defaults. */
  async function load() {
    let raw = null;
    try {
      db = await open();
      const all = await readAll();
      if (Object.keys(all).length) raw = all;
    } catch (e) {
      console.warn('IndexedDB unavailable, using localStorage', e);
      mode = 'localstorage';
    }
    if (!raw) {
      try {
        const fb = JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null');
        if (fb && typeof fb === 'object') raw = fb;
      } catch (_) {}
    }
    let migratedFromV1 = false;
    if (!raw) {
      try {
        const v1 = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        if (v1 && typeof v1 === 'object') { raw = v1; raw.version = raw.version || 1; migratedFromV1 = true; }
      } catch (_) {}
    }
    const state = App.migrate(raw || App.defaults());
    App.state = state;
    if (raw && (migratedFromV1 || raw.version !== state.version)) {
      await flush();
      if (migratedFromV1) {
        // Keep the original data as a safety copy; it is never deleted automatically.
        try { localStorage.setItem(LEGACY_KEY + '.migrated', localStorage.getItem(LEGACY_KEY)); localStorage.removeItem(LEGACY_KEY); } catch (_) {}
        App.migrationNote = 'Your previous LifeOS data was moved into the new database.';
      }
    }
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}
    return state;
  }

  let timer = null;
  let pending = false;
  async function flush() {
    clearTimeout(timer);
    pending = false;
    const snapshot = JSON.parse(JSON.stringify(App.state));
    try {
      if (mode === 'indexeddb' && db) await writeAll(snapshot, true);
      else localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot));
      App.lastSaved = Date.now();
    } catch (e) {
      console.error('Save failed', e);
      App.toast && App.toast('Could not save. Device storage may be full.', 'bad');
    }
  }

  function save() {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  }

  /** Replace everything (used by restore). */
  async function replace(state) {
    App.state = App.migrate(state);
    await flush();
  }

  async function estimate() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        return { usage: e.usage || 0, quota: e.quota || 0, persisted };
      }
    } catch (_) {}
    return null;
  }

  async function wipe() {
    clearTimeout(timer);
    try { if (db) await writeAll({}, true); } catch (_) {}
    try { localStorage.removeItem(FALLBACK_KEY); } catch (_) {}
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending) flush(); });
  window.addEventListener('pagehide', () => { if (pending) flush(); });

  Object.assign(App, { load, save, flush, replace, estimate, wipe, storageMode: () => mode });
})();
