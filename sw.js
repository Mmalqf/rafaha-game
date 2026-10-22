const PREFIX = 'rafaha-' + self.registration.scope + '-';
const CACHE = PREFIX + 'v7-presenter-20261022';
const FILES = ['./', './index.html', './presenter.html', './questions.js?v=20261022-1', './question-history.js?v=20261022-1', './question-bank.js?v=20261022-1', './board.css?v=20261022-1', './board-sparkles.svg', './presenter.css?v=20261022-1', './presenter.js?v=20261022-1', './presenter-link.js?v=20261022-1', './vendor/qrcodegen.js?v=20261022-1', './manifest.webmanifest?v=20261022-1', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const allowed = new Set(FILES.map(path => new URL(path, self.registration.scope).href));
const pages = new Set(['./', './index.html', './presenter.html'].map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const pageUrl = new URL(request.url); pageUrl.search = ''; pageUrl.hash = '';
  // رابط المقدّم قد يحمل المستوى؛ تُحفظ الصفحة نفسها دون نسخ بيانات كل رابط.
  const isPage = request.mode === 'navigate' && pages.has(pageUrl.href);
  const key = isPage ? pageUrl.href : request.url;
  if (!allowed.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        try { await cache.put(key, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      const saved = await cache.match(key);
      if (saved) return saved;
      throw error;
    }
  })());
});
