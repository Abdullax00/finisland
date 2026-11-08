const CACHE_NAME = 'finisland-calc-v1.0.0';
const FONT_CACHE = 'finisland-fonts-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.svg',
    './favicon.ico',
    './favicon-32x32.png',
    './icon-192.png',
    './icon-512.png',
    './logo.svg',
    './apple-touch-icon.png',
    './apple-touch-icon-180x180.png',
    './apple-touch-icon-167x167.png',
    './apple-touch-icon-152x152.png',
    './apple-touch-icon-120x120.png',
    './apple-touch-icon-precomposed.png',
    './apple-splash-universal.png',
    './apple-splash-1290x2796.png',
    './apple-splash-1179x2556.png',
    './apple-splash-1170x2532.png',
    './apple-splash-750x1334.png'
];

// Install: precache all core static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: cleanup outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== FONT_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: serve from cache, update in background, cache external fonts/icons
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Google Fonts & Material Symbols (Cache First / Stale While Revalidate)
    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
        event.respondWith(
            caches.open(FONT_CACHE).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // 2. Same-origin or local relative requests: Stale-While-Revalidate
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Offline fallback: if navigation fails, return cached index.html
                        if (event.request.mode === 'navigate') {
                            return cache.match('./index.html') || cache.match('./');
                        }
                        return cachedResponse;
                    });

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // 3. Fallback for any other request
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch(() => null);
        })
    );
});
