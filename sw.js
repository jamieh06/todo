// Offline support (same approach as the Planner). The page is fetched network-first so updates show up
// straight away, with the cached copy as a fallback when there's no signal. Icons are cache-first.
// Supabase requests are never cached: sync always talks to the live database.
const CACHE = 'todo-v4';
const SHELL = ['./', './index.html', './board.html', './photos.html', './tv.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // four pages: the list, the Whiteboard, Photos and TV Ratings, each cached under its own name
    const page = url.pathname.endsWith('/board.html') ? './board.html' : url.pathname.endsWith('/photos.html') ? './photos.html'
      : url.pathname.endsWith('/tv.html') ? './tv.html' : './index.html';
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then(c => c.put(page, copy));
      return res;
    }).catch(() => caches.match(page)));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
