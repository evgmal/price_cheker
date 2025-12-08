// Mock API сервер для тестирования Прайс Чекера
// Запуск: node mock-api.js

const http = require('http');
const url = require('url');

const PORT = 3000;

// Функция генерации SVG изображения для товара
function generateProductImage(name, color = '#2196F3') {
    const svg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="${color}"/>
            <text x="100" y="100" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">
                ${name}
            </text>
            <circle cx="100" cy="150" r="20" fill="white" opacity="0.3"/>
        </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// База данных товаров (для примера)
const products = {
    '4607034378486': {
        barcode: '4607034378486',
        name: 'Молоко 3.2% 1л',
        price: 89.90,
        image: generateProductImage('Молоко', '#64B5F6')
    },
    '4601879008609': {
        barcode: '4601879008609',
        name: 'Хлеб белый 500г',
        price: 45.50,
        image: generateProductImage('Хлеб', '#FFB74D')
    },
    '4690302932947': {
        barcode: '4690302932947',
        name: 'Масло сливочное 82.5% 200г',
        price: 189.00,
        image: generateProductImage('Масло', '#FFD54F')
    },
    '1234567890123': {
        barcode: '1234567890123',
        name: 'Тестовый товар',
        price: 99.99,
        image: generateProductImage('Тестовый товар', '#81C784')
    }
};

const server = http.createServer((req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Обработка OPTIONS запроса (preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Обработка запроса цены
    if (pathname === '/price' && req.method === 'GET') {
        const barcode = parsedUrl.query.barcode;

        console.log(`[${new Date().toISOString()}] Запрос цены для штрих-кода: ${barcode}`);

        // Симуляция задержки сети (для демонстрации анимации загрузки)
        setTimeout(() => {
            if (!barcode) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    error: 'Штрих-код не указан',
                    code: 400
                }));
                return;
            }

            const product = products[barcode];

            if (product) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(product));
                console.log(`  → Товар найден: ${product.name}, цена: ${product.price}`);
            } else {
                // Если товар не найден, генерируем случайную цену для демонстрации
                const randomPrice = Math.floor(Math.random() * 1000) + 50;
                const randomProduct = {
                    barcode: barcode,
                    name: `Товар ${barcode}`,
                    price: randomPrice,
                    image: generateProductImage(`Товар ${barcode}`, '#9575CD')
                };

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(randomProduct));
                console.log(`  → Товар не найден, сгенерирован: ${randomProduct.name}, цена: ${randomProduct.price}`);
            }
        }, 500); // 500мс задержка для имитации сети

    } else if (pathname === '/product' || pathname.startsWith('/product/')) {
        // Альтернативный формат URL: /product/{barcode}
        const barcode = pathname.split('/')[2];

        console.log(`[${new Date().toISOString()}] Запрос продукта: ${barcode}`);

        setTimeout(() => {
            if (!barcode) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    error: 'Штрих-код не указан',
                    code: 400
                }));
                return;
            }

            const product = products[barcode] || {
                barcode: barcode,
                name: `Товар ${barcode}`,
                price: Math.floor(Math.random() * 1000) + 50,
                image: generateProductImage(`Товар ${barcode}`, '#9575CD')
            };

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(product));
            console.log(`  → ${product.name}, цена: ${product.price}`);
        }, 500);

    } else if (pathname === '/') {
        // Главная страница API (информация)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Mock API - Прайс Чекер</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                    h1 { color: #2196F3; }
                    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
                    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
                    .endpoint { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; background: #f9f9f9; }
                </style>
            </head>
            <body>
                <h1>Mock API сервер для Прайс Чекер</h1>
                <p>API работает на <code>http://localhost:${PORT}</code></p>

                <h2>Доступные endpoints:</h2>

                <div class="endpoint">
                    <h3>GET /price?barcode={barcode}</h3>
                    <p>Получить цену товара по штрих-коду</p>
                    <p>Пример: <a href="/price?barcode=1234567890123">/price?barcode=1234567890123</a></p>
                </div>

                <div class="endpoint">
                    <h3>GET /product/{barcode}</h3>
                    <p>Альтернативный формат запроса</p>
                    <p>Пример: <a href="/product/1234567890123">/product/1234567890123</a></p>
                </div>

                <h2>Формат успешного ответа:</h2>
                <pre>{
  "barcode": "1234567890123",
  "name": "Тестовый товар",
  "price": 99.99,
  "image": "data:image/svg+xml;base64,..."
}</pre>

                <h2>Формат ответа с ошибкой:</h2>
                <pre>{
  "error": "Товар не найден",
  "code": 404
}</pre>

                <h2>Тестовые штрих-коды:</h2>
                <ul>
                    ${Object.keys(products).map(barcode =>
                        `<li><code>${barcode}</code> - ${products[barcode].name} (${products[barcode].price} ₽)</li>`
                    ).join('')}
                </ul>

                <h2>Настройка в приложении:</h2>
                <p>Используйте один из следующих URL:</p>
                <ul>
                    <li><code>http://localhost:${PORT}/price?barcode={barcode}</code></li>
                    <li><code>http://localhost:${PORT}/product/{barcode}</code></li>
                </ul>
            </body>
            </html>
        `);

    } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            error: 'Endpoint не найден'
        }));
    }
});

server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        Mock API сервер для Прайс Чекер запущен!           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🌐 Сервер доступен по адресу: http://localhost:${PORT}`);
    console.log(`📝 Информация об API: http://localhost:${PORT}/`);
    console.log('');
    console.log('Используйте следующий URL в настройках приложения:');
    console.log(`   http://localhost:${PORT}/price?barcode={barcode}`);
    console.log('');
    console.log('Тестовые штрих-коды:');
    Object.keys(products).forEach(barcode => {
        console.log(`   ${barcode} - ${products[barcode].name}`);
    });
    console.log('');
    console.log('Для остановки сервера нажмите Ctrl+C');
    console.log('════════════════════════════════════════════════════════════');
});
