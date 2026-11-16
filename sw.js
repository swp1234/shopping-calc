const CACHE_PREFIX = 'shopping-calc-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SCOPE = '/shopping-calc/';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/exchange-api.js',
    './js/i18n.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './js/locales/ko.json',
    './js/locales/en.json',
    './js/locales/zh.json',
    './js/locales/hi.json',
    './js/locales/ru.json',
    './js/locales/ja.json',
    './js/locales/es.json',
    './js/locales/pt.json',
    './js/locales/id.json',
    './js/locales/tr.json',
    './js/locales/de.json',
    './js/locales/fr.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) return;

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                fetch(event.request).then(fetchResponse => {
                    if (fetchResponse && fetchResponse.ok) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchResponse));
                    }
                }).catch(() => {});
                return response;
            }
            return fetch(event.request).then(fetchResponse => {
                if (fetchResponse && fetchResponse.ok) {
                    const clone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return fetchResponse;
            });
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});
