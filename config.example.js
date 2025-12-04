// Пример конфигурации API
// Скопируйте этот файл в config.js и настройте под ваш сервер

const CONFIG = {
    // Базовый URL вашего API
    // Пример 1: https://api.example.com/price?barcode={barcode}
    // Пример 2: https://api.example.com/product/{barcode}
    apiUrl: 'https://your-api.example.com/price?barcode={barcode}',

    // Таймаут запроса (в миллисекундах)
    timeout: 5000,

    // Дополнительные заголовки (если требуются)
    headers: {
        // 'Authorization': 'Bearer YOUR_TOKEN',
        // 'X-API-Key': 'YOUR_API_KEY'
    }
};

// Формат ожидаемого ответа от сервера:
// {
//     "barcode": "1234567890123",
//     "name": "Название товара",
//     "price": 199.99,
//     "currency": "RUB"
// }
