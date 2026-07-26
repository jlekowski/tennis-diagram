import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Must match CACHE in public/sw.js — the worker can't be imported from the
// bundle, so bump both together.
const CACHE = "tennis-diagram-v1";

/**
 * Cache the bundle Vite actually loaded for this page.
 *
 * The service worker only sees requests made after it takes control, so on a
 * first visit the hashed JS/CSS would otherwise miss the cache entirely and the
 * app would break if the user installed it and immediately went offline. Their
 * filenames are unknowable at build time, but the browser knows what it just
 * fetched — so read it back off the resource timeline and warm the same cache
 * the worker uses.
 */
async function warmCache() {
  try {
    const urls = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => url.startsWith(location.origin) && /\.(js|css)$/.test(new URL(url).pathname));
    if (urls.length) await (await caches.open(CACHE)).addAll(urls);
  } catch {
    // Offline-readiness is best-effort; never let it break startup.
  }
}

// Register the service worker in production only — during `vite dev` it would
// cache module URLs and fight HMR. "./sw.js" resolves against the document, so
// the scope is whatever subpath the app is deployed under.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(warmCache).catch(() => {});
  });
}
