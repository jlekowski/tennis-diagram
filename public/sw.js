/*
 * Tennis Diagram service worker — network-first with runtime caching.
 *
 * Vite emits content-hashed bundle filenames, so precaching a fixed list of
 * them is impossible; only the stable shell paths are precached here and the
 * hashed assets land in the cache the first time they are fetched. After one
 * online visit the app works fully offline.
 *
 * Network-first (rather than Workbox-style cache-first precaching) means the
 * newest build always wins while online, so there is no "update available,
 * reload?" flow to maintain. The cost is a network round-trip when online.
 *
 * Every path is relative so the same dist/ works both at the GitHub Pages
 * project subpath and at lekowski.tennis/tennis-diagram/ — the scope is
 * whatever folder this file is served from.
 *
 * Bump CACHE when the shell changes, to evict stale hashed assets.
 */
const CACHE = "tennis-diagram-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./presets.jsonl",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((hit) => hit || caches.match("./index.html")),
      ),
  );
});
