/**
 * 하루 10제 전기기사 (HaruElec) - PWA Service Worker & Web Push Engine (v3.3.0)
 * Handles App Shell Precaching, Network-First Caching, Background Push & Realtime Message Routing
 */

const CACHE_NAME = 'haruelec-pwa-v3.3.0';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/css/style.css?v=3.3.0',
  '/js/app.js?v=3.3.0',
  '/public/icons/icon-192.png',
  '/public/icons/icon-512.png'
];

// 1. Service Worker Installation & App Shell Precaching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activation & Old Cache Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Web Push Event Listener (Runs in Background & Lock Screen)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '⚡ 하루전기 수험생 응원 메시지';
  const options = {
    body: data.body || '새로운 응원 메시지가 도착했습니다! 목표를 향해 파이팅! 🔥',
    icon: data.icon || '/public/icons/icon-192.png',
    badge: data.badge || '/public/icons/badge-72.png',
    vibrate: [200, 100, 200, 100],
    tag: data.tag || 'haruelec-msg-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || 'https://elec.danminlove.com?openInbox=1',
      messageId: data.messageId || null,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'HARUELEC_PUSH_RECEIVED',
          payload: data
        });
      }
      return self.registration.showNotification(title, options);
    })
  );
});

// 4. Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/?openInbox=1';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('elec.danminlove.com') && 'focus' in client) {
          client.postMessage({
            type: 'OPEN_INBOX',
            messageId: event.notification.data ? event.notification.data.messageId : null
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 5. Fetch Event Listener (Network-First with Real Cache Persistence & Offline Fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bypass cache for dynamic APIs, data, releases, and version checks
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/releases/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy: persist fresh response into CacheStorage for offline fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});
