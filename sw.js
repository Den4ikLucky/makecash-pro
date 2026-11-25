/* Public content enters the offline cache only after an explicit user action. */
const CACHE = 'makecash-public-v1';
const PUBLIC_PATH = /^(?:\/$|\/index\.html$|\/manifest\.json$|\/assets\/|\/_next\/static\/)/;

self.addEventListener('install', () => undefined);
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') { self.skipWaiting(); return; }
  if (event.data?.type !== 'CACHE_PUBLIC' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const cached = [];
    const failed = event.data.urls.slice(1000).map(String);
    for (const input of event.data.urls.slice(0, 1000)) {
      try {
        const url = new URL(input, self.location.origin);
        if (url.origin !== self.location.origin || !PUBLIC_PATH.test(url.pathname) || url.search || url.hash) throw new Error('Not public');
        const response = await fetch(url.href, { credentials: 'omit', cache: 'reload' });
        if (!response.ok || response.type === 'opaque') throw new Error('Not available');
        await cache.put(url.href, response);
        if (!await cache.match(url.href)) throw new Error('Cache readback failed');
        cached.push(url.pathname);
      } catch { failed.push(String(input)); }
    }
    event.ports[0]?.postMessage({ cached, failed });
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !PUBLIC_PATH.test(url.pathname)) return;
  event.respondWith((async () => {
    try { return await fetch(event.request); }
    catch {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(event.request, { ignoreSearch: false });
      return saved ?? new Response('\u0421\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u043e\u0444\u043b\u0430\u0439\u043d. \u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 MakeCash \u0441 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435\u043c \u043a \u0441\u0435\u0442\u0438.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
