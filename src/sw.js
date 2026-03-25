// Service Worker for offline support and caching
const CACHE_NAME = 'menuPlanner-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/modules/app.js',
  '/src/modules/i18n.js',
  '/src/modules/menu.js',
  '/src/modules/basket.js',
  '/src/modules/recipe.js',
  '/src/modules/favorites.js',
  '/src/modules/sharing.js',
  '/src/modules/storage.js',
  '/src/modules/ui.js',
  '/src/modules/ui-advanced.js',
  '/src/modules/search.js',
  '/src/modules/metadata.js',
  '/src/modules/pdf.js',
  '/src/modules/translation.js',
  '/src/utils/constants.js',
  '/src/utils/helpers.js',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.warn('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.warn('Caching static assets');
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`Failed to cache ${url}:`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.warn('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.warn(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network first for API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Handle message events from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
