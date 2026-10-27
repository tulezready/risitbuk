// Risit Buk service worker: keeps the app working with no data.
// Bump VERSION whenever you upload changed files so phones pick up the update.
const VERSION = "risitbuk-v1";
const FILES = [
  "./", "index.html", "app.css", "app.js", "manifest.webmanifest",
  "vendor/html2canvas.min.js", "vendor/jspdf.umd.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "fonts/figtree-latin-400-normal.woff2", "fonts/figtree-latin-500-normal.woff2",
  "fonts/figtree-latin-600-normal.woff2", "fonts/figtree-latin-700-normal.woff2",
  "fonts/bricolage-grotesque-latin-600-normal.woff2", "fonts/bricolage-grotesque-latin-800-normal.woff2"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Page: try network first so updates arrive, fall back to the saved copy offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
