const CACHE_NAME = 'shelflife-v1';
// We cache the core shell. Note: ESM dependencies might change versions, 
// so in a real app you'd bundle them. For this dev setup, we try to cache the main entry points.
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './services/db.ts',
  './components/Reader.tsx',
  './components/Sidebar.tsx',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best effort caching. If one fails, we don't crash the whole install in this loose dev mode
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(e => console.warn('Failed to cache:', url)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Navigation requests: Network first, fall back to cache (for index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html') || caches.match('./');
      })
    );
    return;
  }

  // Other requests: Stale-while-revalidate for performance
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;
      }).catch(e => {
        // Network failed
        return null; 
      });

      return cachedResponse || fetchPromise;
    })
  );
});