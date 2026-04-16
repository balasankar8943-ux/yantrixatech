/* ============================================
   YANTRIXIA CLIENTPULSE — Service Worker
   PWA Offline Capability
   ============================================ */

const CACHE_NAME = 'clientpulse-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './scoring.js',
    './charts.js',
    './manifest.json',
    '../assets/logo.jpg'
];

// Install — Cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate — Clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — Cache-first for assets, network-first for API
self.addEventListener('fetch', event => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Razorpay and external API calls
    if (request.url.includes('razorpay.com') || request.url.includes('api.')) return;

    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) return cached;

                return fetch(request)
                    .then(response => {
                        // Cache successful responses
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, responseClone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML pages
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});
