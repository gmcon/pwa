// Nombre de la caché
const CACHE_NAME = 'avisos-pwa-cache-v1';

// Recursos esenciales que siempre deben estar en caché
const urlsToCache = [
    '/', // El archivo index.html (representado por la raíz)
    'index.html',
    'manifest.json',
    // No podemos cachear el CDN de Tailwind aquí,
    // ya que no está en el mismo origen. Usaremos Network-first.
];

// Evento: Instalación del Service Worker
self.addEventListener('install', (event) => {
    // Espera hasta que la caché se abra y los archivos se añadan
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker instalado. Abriendo caché e inicializando recursos.');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Fallo en cache.addAll:', err))
    );
});

// Evento: Activación del Service Worker
self.addEventListener('activate', (event) => {
    // Elimina cachés antiguas
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    return cacheName.startsWith('avisos-pwa-cache-') && cacheName !== CACHE_NAME;
                }).map((cacheName) => {
                    console.log('Eliminando caché antigua:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
    // Tomar control de todos los clientes de inmediato
    return self.clients.claim();
});

// Evento: Fetch (Manejo de Solicitudes)
self.addEventListener('fetch', (event) => {
    // Estrategia: Cache, then Network (para archivos locales)
    if (urlsToCache.some(url => event.request.url.includes(url))) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Devuelve la respuesta de la caché si existe
                    if (response) {
                        return response;
                    }
                    // Si no está en caché, va a la red
                    return fetch(event.request);
                })
        );
        return;
    }

    // Estrategia: Network-first (para recursos externos como Firebase o Tailwind CDN)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Verificar si recibimos una respuesta válida
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clonar la respuesta. Una respuesta es un stream y solo puede ser consumida una vez.
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Si la red falla, intenta obtener de la caché (útil para Firebase SDKs o CDN)
                return caches.match(event.request);
            })
    );
});
