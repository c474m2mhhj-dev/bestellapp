// zeitraum CampusBot — Service Worker
// Handles background push notifications when Robert arrives

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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
