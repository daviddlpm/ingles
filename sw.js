/* Service worker · El Reino del Inglés
   - Archivos propios: red primero (así las actualizaciones llegan) y caché si no hay conexión.
   - Three.js y tipografías (CDN): caché primero, para poder jugar sin internet tras la primera visita. */
const CACHE = 'reino-ingles-v2.0';
const CORE = [
  './', './index.html', './style.css', './content.js', './audio.js', './scene3d.js', './game.js', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=MedievalSharp&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Los recursos externos no deben impedir la instalación si fallan
    await Promise.all(CDN.map(u => fetch(u).then(r => r.ok || r.type === 'opaque' ? cache.put(u, r) : null).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // red primero (máx. 4 s), caché de respaldo
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), timeout(4000)]);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(req)) || (await cache.match('./index.html'));
      }
    })());
    return;
  }

  // Recursos externos: caché primero, y se guarda lo que llegue (incluye los archivos de fuentes)
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (e) { return Response.error(); }
  })());
});
