const CACHE = "ecuisine-owner-shell-v1";
const BASE = "/ecuisine-foods-online-store/modern/";
const SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "assets/index-14qjia0-.css",
  BASE + "assets/index-OjdTYCih.js",
  BASE + "owner-app-icon.svg",
  BASE + "manifest.webmanifest"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ecuisine-owner-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/functions/") || url.pathname.includes("/rest/")) return;
  if (request.mode === "navigate" && url.pathname.startsWith(BASE)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(BASE + "index.html", response.clone()));
      return response;
    }).catch(() => caches.match(BASE + "index.html")));
    return;
  }
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});