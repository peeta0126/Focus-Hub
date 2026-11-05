const CACHE_PREFIX = "focus-hub-static-";
const CACHE = `${CACHE_PREFIX}v4`;
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isPublicStaticAsset(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.mode === "navigate" || request.destination === "document") return false;
  if (request.headers.has("range")) return false;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return false;
  // Next owns bundle caching. Development URLs can stay unchanged after edits,
  // so caching them here mixes new HTML with old CSS/JS across app versions.
  if (url.pathname.startsWith("/_next/")) return false;
  return url.pathname.startsWith("/assets/")
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
