const CACHE = "focus-hub-static-v3";
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

function isPublicStaticAsset(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.mode === "navigate" || request.destination === "document") return false;
  if (request.headers.has("range")) return false;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return false;
  return url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/assets/")
    || url.pathname.startsWith("/icons/")
    || url.pathname === "/manifest.webmanifest"
    || url.pathname === "/apple-touch-icon.png";
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !isPublicStaticAsset(event.request)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (!response.ok || response.type !== "basic") return response;
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    return response;
  })));
});
