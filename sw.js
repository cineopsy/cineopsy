// CinéOpsy Service Worker v3
// Strategy: Network-first for HTML/JS/CSS (always fresh), cache fallback for offline
const CACHE = 'cineopsy-v3';
const STATIC = ['manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // HTML, JS, CSS — always try network first, never serve stale
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(res => {
        // Cache a copy for offline fallback
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else — cache first (fonts, images)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'CinéOpsy', body: 'New content available!' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
