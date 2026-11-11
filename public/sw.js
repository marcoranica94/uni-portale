// Service worker del portale: solo notifiche (nessuna cache, le pagine arrivano sempre fresche dalla rete).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let m = { title: 'Uni', body: '', url: '/', tag: 'uni' };
  try {
    m = Object.assign(m, e.data ? e.data.json() : {});
  } catch (err) {
    if (e.data) m.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(m.title, {
      body: m.body,
      tag: m.tag,
      icon: '/icone/icona-192.png',
      lang: 'it',
      data: { url: m.url },
    }),
  );
});

// Tocco sulla notifica: porta alla pagina indicata, riusando una finestra del portale se è già aperta.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if (new URL(f.url).origin === self.location.origin && 'focus' in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
