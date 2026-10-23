const CACHE = 'mbcaisse-v5';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const bypass = ['firebaseio.com','googleapis.com','firebaseapp.com','gstatic.com','cdnjs.cloudflare.com'];
  if(bypass.some(d => url.hostname.includes(d))) return;
  // Pages HTML : réseau d'abord, pour toujours avoir la dernière version (cache seulement hors connexion)
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  if(isPage){
    e.respondWith(
      fetch(e.request).then(res => {
        if(res.ok){ const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
