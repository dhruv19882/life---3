/* LifeOS offline engine.
   Precaches the whole app shell on install, serves it cache-first, and refreshes files in the background.
   Only same-origin app files are cached. Personal data lives in IndexedDB, never in this cache.
   Bump VERSION whenever any file changes so installed phones pick up the update. */
const VERSION = 'lifeos-v3.0.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/core.js', './js/store.js', './js/data.js', './js/foods.js', './js/ui.js', './js/engine.js', './js/app.js',
  './js/views/home.js', './js/views/fitness.js', './js/views/nutrition.js', './js/views/food.js', './js/views/money.js',
  './js/views/fees.js', './js/views/dubai.js', './js/views/work.js', './js/views/cma.js', './js/views/career.js',
  './js/views/goals.js', './js/views/social.js', './js/views/progress.js', './js/views/more.js', './js/views/settings.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lifeos-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch third-party requests

  // App navigations: always answer from the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((hit) => {
        const net = fetch(req).then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put('./index.html', res.clone()));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit || new Response('', { status: 504, statusText: 'Offline' }));
      return hit || net;
    })
  );
});
