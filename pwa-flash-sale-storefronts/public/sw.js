/* -------------------------------------------------------------------------- */
/* Flash Storefront Service Worker                                             */
/* -------------------------------------------------------------------------- */

const VERSION = 'flash-store-v3';
const APP_SHELL_CACHE = `flash-shell-${VERSION}`;
const RUNTIME_CACHE = `flash-runtime-${VERSION}`;
const IMAGE_CACHE = `flash-images-${VERSION}`;
const API_BASE_URL = 'http://localhost:4001/api';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

const DB_NAME = 'flash-store-offline';
const CHECKOUT_STORE = 'checkoutQueue';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.includes(VERSION))
          .map((cacheName) => caches.delete(cacheName))
      );
      await clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // App shell navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (!response || response.status !== 200) throw new Error('Navigation network error');
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        } catch (e) {
          // SPA fallback to cached index.html, then offline page.
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          const offline = await caches.match('/offline.html');
          return offline;
        }
      })()
    );
    return;
  }

  // Local static assets
  if (url.origin === self.location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirst(request, IMAGE_CACHE));
      return;
    }

    if (request.url.includes('/assets/')) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
      return;
    }
  }

  // All other requests
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
};

/* -------------------------------------------------------------------------- */
/* IndexedDB Helpers for Offline Queue                                        */
/* -------------------------------------------------------------------------- */

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHECKOUT_STORE)) {
        db.createObjectStore(CHECKOUT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async (storeName, mode, operation) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let result;
    try {
      result = operation(store, tx);
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }

    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const enqueueCheckout = (payload) =>
  withStore(CHECKOUT_STORE, 'readwrite', (store) => {
    store.put({ id: payload.id, payload, queuedAt: Date.now() });
  });

const getAllQueuedCheckouts = () =>
  withStore(CHECKOUT_STORE, 'readonly', (store) => requestToPromise(store.getAll()));

const deleteQueuedCheckout = (id) =>
  withStore(CHECKOUT_STORE, 'readwrite', (store) => store.delete(id));

const broadcastMessage = async (message) => {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientsList.forEach((client) => client.postMessage(message));
};

const sendQueueStatus = async (clientId) => {
  const queue = await getAllQueuedCheckouts();
  if (clientId) {
    const client = await self.clients.get(clientId);
    client?.postMessage({ type: 'CHECKOUT_SYNC_PENDING', count: queue.length });
  } else {
    await broadcastMessage({ type: 'CHECKOUT_SYNC_PENDING', count: queue.length });
  }
};

const deliverCampaignEvent = (payload) => {
  if (!payload.campaignId && !payload.notificationId) {
    return Promise.resolve();
  }

  return fetch(`${API_BASE_URL}/campaign-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
};

self.addEventListener('message', (event) => {
  const { data, source } = event;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'QUEUE_CHECKOUT') {
    event.waitUntil(
      (async () => {
        await enqueueCheckout(data.payload);
        await sendQueueStatus(source?.id);
      })()
    );
    return;
  }

  if (data.type === 'CHECKOUT_SYNC_STATUS_REQUEST') {
    event.waitUntil(sendQueueStatus(source?.id));
    return;
  }

  if (data.type === 'TRIGGER_CHECKOUT_SYNC') {
    event.waitUntil(processCheckoutQueue());
  }
});

const processCheckoutQueue = async () => {
  const queue = await getAllQueuedCheckouts();
  if (!queue.length) {
    await broadcastMessage({ type: 'CHECKOUT_SYNC_PENDING', count: 0 });
    return;
  }

  for (const item of queue) {
    const ageMinutes = (Date.now() - item.queuedAt) / (1000 * 60);
    if (ageMinutes > 72 * 60) {
      await deleteQueuedCheckout(item.id);
      await broadcastMessage({
        type: 'CHECKOUT_SYNC_COMPLETE',
        success: false,
        order: item.payload,
        reason: 'expired',
      });
      continue;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await deleteQueuedCheckout(item.id);
      await broadcastMessage({
        type: 'CHECKOUT_SYNC_COMPLETE',
        success: true,
        order: item.payload,
      });
    } catch (error) {
      console.warn('Checkout sync failed, will retry later.', error);
      break;
    }
  }

  await sendQueueStatus();
};

self.addEventListener('sync', (event) => {
  if (event.tag === 'checkout-sync') {
    event.waitUntil(processCheckoutQueue());
  }
});

/* -------------------------------------------------------------------------- */
/* Push Notifications                                                         */
/* -------------------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    console.error('Failed to parse push payload', error);
    return;
  }

  const title = payload.title || 'Flash Store Update';
  const options = {
    body: payload.body || 'Check out the latest offers!',
    icon: payload.icon || '/icons/icon-192.svg',
    badge: payload.badge || '/icons/icon-192.svg',
    image: payload.image,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: payload.actions || [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: payload.data || { url: '/' },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      deliverCampaignEvent({
        campaignId: payload.data?.campaignId,
        notificationId: payload.data?.notificationId,
        event: 'deliver',
        category: payload.data?.category,
        metadata: { receivedAt: new Date().toISOString() },
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = (() => {
    try {
      return new URL(rawUrl, self.location.origin).href;
    } catch {
      return self.location.origin + '/';
    }
  })();

  if (event.action === 'dismiss') {
    event.waitUntil(
      deliverCampaignEvent({
        campaignId: event.notification.data?.campaignId,
        notificationId: event.notification.data?.notificationId,
        event: 'dismiss',
        category: event.notification.data?.category,
      })
    );
    return;
  }

  event.waitUntil(
    (async () => {
      // Always open a new tab/window to avoid focus restrictions
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl).catch(() => undefined);
      }
      await deliverCampaignEvent({
        campaignId: event.notification.data?.campaignId,
        notificationId: event.notification.data?.notificationId,
        event: 'click',
        category: event.notification.data?.category,
      });
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(
    deliverCampaignEvent({
      campaignId: event.notification.data?.campaignId,
      notificationId: event.notification.data?.notificationId,
      event: 'dismiss',
      category: event.notification.data?.category,
    })
  );
});

/* -------------------------------------------------------------------------- */
/* 🧠 Flash Store Service Worker (Full Version)                               */
/* -------------------------------------------------------------------------- */

const CACHE_NAME = 'flash-store-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

/* -------------------------------------------------------------------------- */
/* 📦 INSTALL: Pre-cache essential assets                                     */
/* -------------------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [ServiceWorker] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
});

/* -------------------------------------------------------------------------- */
/* 🔁 ACTIVATE: Remove old caches                                             */
/* -------------------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ [ServiceWorker] Removing old cache', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
  console.log('🚀 [ServiceWorker] Activated');
});

/* -------------------------------------------------------------------------- */
/* 🌐 FETCH: Serve cached assets for GET requests                             */
/* -------------------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET or external requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

/* -------------------------------------------------------------------------- */
/* 🔔 PUSH: Display incoming notifications                                    */
/* -------------------------------------------------------------------------- */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('⚠️ Push event received but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (err) {
    console.error('❌ Failed to parse push data:', err);
    return;
  }

  console.log('📨 Push received:', data);

  const title = data.title || '🛍️ Flash Store Update';
  const options = {
    body: data.body || 'Check out the latest offers!',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: true, // Keeps visible until user interacts
    actions: [
      { action: 'open', title: 'View Now' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* -------------------------------------------------------------------------- */
/* 🖱️ CLICK: Focus or open the app (Redirect fix for Admin issue)             */
/* -------------------------------------------------------------------------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Default URL from notification data
  const targetUrl = event.notification.data?.url || '/';

  // Skip if user clicked "Dismiss"
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // ✅ Focus app tab if it's already open (avoid admin pages)
      for (const client of windowClients) {
        if (client.url.includes('localhost:3000/') && !client.url.includes('/admin')) {
          console.log('🔄 Focusing existing storefront tab');
          return client.focus();
        }
      }

      // ✅ If not open, open main storefront instead of admin
      if (clients.openWindow) {
        console.log('🆕 Opening new storefront tab');
        return clients.openWindow(self.location.origin + '/');
      }
    })
  );
});

/* -------------------------------------------------------------------------- */
/* ⚙️ LOGGING EVENTS FOR DEBUGGING                                           */
/* -------------------------------------------------------------------------- */
self.addEventListener('install', () => console.log('✅ Service Worker installed'));
self.addEventListener('activate', () => console.log('🚀 Service Worker activated'));
