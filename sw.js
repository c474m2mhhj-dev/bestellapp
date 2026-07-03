// zeitraum CampusBot — Service Worker
// Handles background push notifications when Robert arrives
// + offline caching so the installed app loads instantly and survives flaky campus wifi

const CACHE = 'zeitraum-v1';
// Same-origin app shell — precached on install (relative → works at /bestellapp/ and /)
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// Live data that must NEVER be cached (orders, menu, weather) — always hit network
const LIVE_HOSTS = ['supabase.co', 'open-meteo.com'];

// Cache one URL at a time, tolerating failures (opaque/CORS assets)
function cachePut(cache, req, res) {
  try { cache.put(req, res.clone()); } catch (e) {}
  return res;
}

self.addEventListener('message', e => {
  if (e.data?.type === 'ROBERT_ARRIVED') {
    e.waitUntil(
      self.registration.showNotification(e.data.title || '🤖 Robert ist da!', {
        body: e.data.body || 'Dein Getränk wartet. Bitte abholen!',
        icon: e.data.icon || '/bestellapp/icon-192.png',
        badge: e.data.icon || '/bestellapp/icon-192.png',
        vibrate: [300, 100, 300, 100, 500],
        tag: 'robert-arrival',
        renotify: true,
        requireInteraction: true,
        data: { url: self.location.origin + '/bestellapp/' }
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) {
        if (c.url.includes('bestellapp') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(e.notification.data?.url || '/bestellapp/');
    })
  );
});

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // Live data (orders, menu, weather) → always network, never cached
  if (LIVE_HOSTS.some(h => url.hostname.endsWith(h))) return;

  // HTML navigations → network-first so the newest app version always loads online,
  // fall back to the cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => caches.open(CACHE).then(c => cachePut(c, req, res)))
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else (app icons + pinned React/Babel CDN libs) → stale-while-revalidate:
  // serve cache instantly, refresh in the background
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => caches.open(CACHE).then(c => cachePut(c, req, res)))
        .catch(() => cached);
      return cached || net;
    })
  );
});
