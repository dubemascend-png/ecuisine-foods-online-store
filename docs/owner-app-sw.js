const CACHE_NAME = "ecuisine-owner-shell-v2";
const SHELL = [
  "./admin.html",
  "./admin.js",
  "./owner-app.webmanifest",
  "./owner-app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("ecuisine-owner-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache authenticated API responses or user/order data. Cache only the app shell.
  if (request.mode === "navigate" || /\/admin\.js$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok && url.pathname.endsWith("/admin.js")) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached || (request.mode === "navigate" ? caches.match("./admin.html") : Response.error());
    }));
  } else if (/\/(owner-app\.webmanifest|owner-app-icon\.svg)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});