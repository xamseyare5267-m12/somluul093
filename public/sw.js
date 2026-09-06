/* SomLuul Service Worker — notifications only. Do NOT cache HTML (blank pages). */
const CACHE = 'somluul-v3-assets';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/manifest.json', '/icon-512x512.png', '/icon-180x180.png']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  // Navigations: always network — never stale blank HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0a0f1d;color:#fff"><h1>SomLuul</h1><p>Offline - check internet and refresh.</p><button onclick="location.reload()">Refresh</button></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
      )
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'SomLuul';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-512x512.png',
      badge: '/favicon-16x16.png',
      tag: data.tag || 'somluul-notif',
      renotify: !!data.renotify,
      requireInteraction: !!data.requireInteraction,
      silent: !!data.silent,
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data || {} });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'SomLuul', body: 'Ogeysiis cusub', data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SomLuul', {
      body: payload.body || '',
      icon: '/icon-512x512.png',
      badge: '/favicon-16x16.png',
      tag: payload.tag || 'somluul-push',
      renotify: true,
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
      vibrate: [300, 100, 300, 100, 300],
    })
  );
});
