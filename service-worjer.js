// Nombre del caché y lista de archivos a precachear
const CACHE_NAME = 'avisos-pwa-cache-v1';
const urlsToCache = [
    './', // Ruta principal
    './index.html', // Archivo HTML principal
    './manifest.json', // Manifiesto
    // No cacheamos firebase ni tailwind CDN para evitar problemas de versión
];

// 1. Instalar el Service Worker y pre-cachear los recursos estáticos
self.addEventListener('install', (event) => {
    console.log('Service Worker: Evento de instalación.');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Precaching completo.');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Service Worker: Fallo al precachear recursos', err);
            })
    );
});

// 2. Activar el Service Worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Evento de activación.');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Eliminar cachés no deseadas
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Asegurar que el Service Worker tome el control de las páginas inmediatamente
    self.clients.claim();
});

// 3. Estrategia de Cache-First con Fallback de Red para la navegación
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones a la API de Firebase/Firestore y otros orígenes externos
    if (event.request.url.includes('firebase') || event.request.url.includes('googleapis') || event.request.url.includes('cdn.tailwindcss.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si encontramos una respuesta en el caché, la devolvemos inmediatamente
                if (response) {
                    return response;
                }

                // Si no, intentamos obtener el recurso de la red
                return fetch(event.request).catch(() => {
                    // Si falla la red, no podemos devolver nada. Para PWAs más robustas, 
                    // aquí se devolvería una página offline genérica (offline.html)
                    console.error('Service Worker: Error de red y recurso no cacheado.', event.request.url);
                });
            })
    );
});
