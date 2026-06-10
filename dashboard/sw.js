// ─── Mission Control Service Worker ──────────────────────────────────────────
// Caches the shell (HTML/CSS/JS) for offline use.
// API calls are network-first with graceful fallback.
// ──────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'mission-control-v3';

const SHELL_ASSETS = [
  '/',
  '/dashboard/index.html',
  '/dashboard/styles.css',
  '/dashboard/styles-premium.css',
  '/dashboard/styles-v2.css',
  '/dashboard/utils.js',
  '/dashboard/api.js',
  '/dashboard/app.js',
  '/dashboard/gateway.js',
  '/dashboard/command-palette.js',
  '/dashboard/notification-center.js',
  '/dashboard/favicon.svg',
  '/dashboard/manifest.json',
  '/dashboard/chart.umd.min.js',
  '/dashboard/pages/hermes-workspace.js',
  '/dashboard/pages/command-room.js',
  '/dashboard/pages/dashboard.js',
  '/dashboard/pages/chat.js',
];

// Install: cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: shell = cache-first, API = network-first
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first, no caching
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    return; // Let browser handle normally
  }

  // WebSocket: skip
  if (request.url.startsWith('ws')) return;

  // Shell assets: cache-first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
