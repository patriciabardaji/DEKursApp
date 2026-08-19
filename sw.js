const CACHE = "dekurs-v27";
const CORE  = ["./", "./index.html"];                       // must be cached
const EXTRA = ["./manifest.webmanifest", "./icon-192.png",  // nice to have
               "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);                                   // app itself, must succeed
    // cache the rest one by one so a single missing file can't break offline mode
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// cache first: once installed the app never needs the network again
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, {ignoreSearch:true});
    if(hit) return hit;
    try {
      const res = await fetch(e.request);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    } catch {
      return (await caches.match("./index.html")) || Response.error();
    }
  })());
});
