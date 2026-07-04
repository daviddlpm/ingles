const CACHE_NAME = 'aventura-ingles-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './aventura.html',
  './clasico.html',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const isPage = req.mode === 'navigate' ||
                 req.url.endsWith('/index.html') ||
                 req.url.endsWith('/ingles/') ||
                 req.url.endsWith('/aventura.html') ||
                 req.url.endsWith('/clasico.html');

  if (isPage) {
    // Página principal: SIEMPRE intentar internet primero.
    // Solo se usa la copia guardada si no hay conexión.
    event.respondWith(
      fetch(req)
        .then(fetchRes => {
          const copy = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return fetchRes;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Recursos (fuentes, etc.): caché primero, red como respaldo.
    event.respondWith(
      caches.match(req).then(response => {
        if (response) return response;
        return fetch(req).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            if (req.url.startsWith('http')) {
              cache.put(req, fetchRes.clone());
            }
            return fetchRes;
          });
        });
      })
    );
  }
});
