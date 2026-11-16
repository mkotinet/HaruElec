/**
 * 하루 10제 전기기사 (HaruElec) - PWA Service Worker & Web Push Engine
 * Handles App Lifecycle, Offline Caching, Background Push Notifications & Realtime Message Routing
 */

const CACHE_NAME = 'haruelec-pwa-v3.2.0';

// 1. Service Worker Installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Service Worker Activation & Cache Cleanup
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
    vibrate: [200, 100, 200, 100], // Tactile electric pulse
    tag: data.tag || 'haruelec-msg-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || 'https://elec.danminlove.com?openInbox=1',
      messageId: data.messageId || null,
      timestamp: Date.now()
    }
  };

  // Broadcast to open client tabs
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

// 5. Fetch Event Listener (Ensures API & releases bypass cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/') || url.pathname.startsWith('/releases/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
