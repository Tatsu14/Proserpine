/**
 * sw.js - Service Worker minimal (repris de la version en ligne).
 * Requis pour l'installation PWA sur Chrome/Edge.
 * Stratégie : network-first pour les ressources locales, pas de mise en cache des API externes.
 */

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Ne pas intercepter les requêtes vers des APIs externes (Firebase, OpenFoodFacts, etc.)
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Network-first : réseau en priorité, fallback cache si hors-ligne
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
