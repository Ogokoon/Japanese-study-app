const CACHE_NAME = 'ogokun-japanese-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

function isPageRequest(request) {
  if (request.mode === 'navigate') return true;
  var url = new URL(request.url);
  return url.pathname.endsWith('/') || url.pathname.endsWith('.html');
}

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  // The app page itself: always try the network first so a newly uploaded
  // index.html shows up on the very next launch. Fall back to the cached copy offline.
  if (isPageRequest(event.request)) {
    event.respondWith(
      fetch(event.request).then(function(networkResponse) {
        var copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        return networkResponse;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Icons, manifest and other static files: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(networkResponse) {
        var copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        return networkResponse;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});
