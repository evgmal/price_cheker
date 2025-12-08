// Service Worker для Прайс Чекер PWA

const CACHE_NAME = 'price-checker-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Установка Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Кэширование файлов приложения');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[SW] Ошибка при кэшировании:', error);
            })
    );

    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Активация Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Проверяем URL только для действительных запросов
    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        // Если URL невалидный, пропускаем
        return;
    }

    // Кешируем только HTTP/HTTPS GET запросы от нашего домена
    if (request.method !== 'GET' ||
        url.pathname.includes('/api/') ||
        url.protocol !== 'http:' && url.protocol !== 'https:') {
        return; // Браузер обработает запрос самостоятельно
    }

    // Стратегия: Network First, затем Cache
    // Это важно для получения актуальных данных
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Проверяем что ответ валидный перед кешированием
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Клонируем ответ для кэширования
                const responseClone = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });

                return response;
            })
            .catch(() => {
                // Если сеть недоступна, используем кэш
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Возвращаем offline страницу, если ресурс не найден
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }

                    // Возвращаем пустой ответ для других типов ресурсов
                    return new Response('', {
                        status: 404,
                        statusText: 'Not Found'
                    });
                });
            })
    );
});

// Обработка сообщений от приложения
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
