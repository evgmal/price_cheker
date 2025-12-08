// Прайс Чекер - Основное приложение

class PriceChecker {
    constructor() {
        this.apiUrl = this.loadApiUrl();
        this.apiUsername = this.loadUsername();
        this.apiPassword = this.loadPassword();
        this.clickCount = 0;
        this.clickTimer = null;
        this.settingsUnlocked = false;
        this.lastKeyTime = 0;

        // Новые свойства для редизайна
        this.autoResetTimer = null;           // Таймер автоочистки (60 сек)
        this.barcodeBuffer = '';              // Буфер для накопления штрих-кода
        this.barcodeTimeout = null;           // Таймер очистки буфера
        this.audioContext = null;             // Web Audio API для звукового сигнала
        this.speechSynthesis = window.speechSynthesis; // Web Speech API

        this.init();
    }

    init() {
        // Получаем элементы
        this.idleScreen = document.getElementById('idle-screen');
        this.loadingEl = document.getElementById('loading');
        this.resultEl = document.getElementById('result');
        this.errorEl = document.getElementById('error');
        this.productImageContainer = document.getElementById('product-image-container');
        this.productImage = document.getElementById('product-image');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.settingsPanel = document.getElementById('settings-panel');
        this.apiUrlInput = document.getElementById('api-url');
        this.apiUsernameInput = document.getElementById('api-username');
        this.apiPasswordInput = document.getElementById('api-password');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.appTitle = document.getElementById('app-title');

        // Устанавливаем обработчики событий
        this.setupEventListeners();

        // Загружаем настройки в UI
        this.apiUrlInput.value = this.apiUrl;
        this.apiUsernameInput.value = this.apiUsername;
        this.apiPasswordInput.value = this.apiPassword;

        // Показываем экран ожидания
        this.showIdleScreen();

        // Инициализируем AudioContext для звуковых сигналов
        this.initAudio();

        // Регистрируем Service Worker для PWA
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Глобальный перехват клавиатуры для сканирования штрих-кодов
        document.addEventListener('keypress', (e) => {
            // Игнорируем ввод в поля настроек
            if (e.target.tagName === 'INPUT' && !this.settingsPanel.classList.contains('hidden')) {
                return;
            }

            this.handleBarcodeInput(e);
        });

        // Скрытый доступ к настройкам (7 кликов по заголовку)
        this.appTitle.addEventListener('click', () => {
            this.handleSecretClick();
        });

        // Настройки
        this.settingsToggle.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
        });

        this.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });
    }

    handleBarcodeInput(e) {
        const currentTime = Date.now();

        // Enter завершает ввод штрих-кода
        if (e.key === 'Enter') {
            e.preventDefault();

            if (this.barcodeBuffer.trim().length > 0) {
                const barcode = this.barcodeBuffer.trim();
                this.barcodeBuffer = '';
                clearTimeout(this.barcodeTimeout);
                this.checkPrice(barcode);
            }
            return;
        }

        // Игнорируем специальные клавиши
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }

        // Если прошло больше 100мс с последнего символа - начинаем новый штрих-код
        if (currentTime - this.lastKeyTime > 100) {
            this.barcodeBuffer = '';
        }

        // Добавляем символ в буфер
        this.barcodeBuffer += e.key;
        this.lastKeyTime = currentTime;

        // Таймаут автоочистки буфера (на случай неполного сканирования)
        clearTimeout(this.barcodeTimeout);
        this.barcodeTimeout = setTimeout(() => {
            this.barcodeBuffer = '';
        }, 200);
    }

    showIdleScreen() {
        this.idleScreen.classList.remove('hidden');
        this.hideResult();
        this.hideError();
        this.hideLoading();
    }

    startAutoResetTimer() {
        // Очищаем предыдущий таймер если был
        this.clearAutoResetTimer();

        // Запускаем новый таймер на 60 секунд
        this.autoResetTimer = setTimeout(() => {
            this.resetToIdleScreen();
        }, 60000); // 60 секунд
    }

    clearAutoResetTimer() {
        if (this.autoResetTimer) {
            clearTimeout(this.autoResetTimer);
            this.autoResetTimer = null;
        }
    }

    resetToIdleScreen() {
        this.clearAutoResetTimer();
        this.hideResult();
        this.hideError();
        this.showIdleScreen();
    }

    initAudio() {
        try {
            // Создаем AudioContext при первом взаимодействии
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (error) {
            console.warn('AudioContext не поддерживается:', error);
        }
    }

    playBeep() {
        if (!this.audioContext) {
            return;
        }

        try {
            // Возобновляем AudioContext если он был приостановлен
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Создаем осциллятор для звукового сигнала
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Настройки звука: короткий биип на частоте 800 Hz
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            // Огибающая громкости для плавного затухания
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            // Воспроизводим звук длительностью 100мс
            oscillator.start(now);
            oscillator.stop(now + 0.1);
        } catch (error) {
            console.warn('Ошибка воспроизведения звука:', error);
        }
    }

    speakPrice(price) {
        if (!this.speechSynthesis) {
            console.warn('Web Speech API не поддерживается');
            return;
        }

        // Парсим цену на рубли и копейки
        const priceNum = parseFloat(price);
        const rubles = Math.floor(priceNum);
        const kopeks = Math.round((priceNum - rubles) * 100);

        // Формируем текст с правильным склонением
        let text = '';

        if (rubles > 0) {
            text += `${rubles} ${this.getRubleWord(rubles)}`;
        }

        if (kopeks > 0) {
            if (rubles > 0) {
                text += ' ';
            }
            text += `${kopeks} ${this.getKopekWord(kopeks)}`;
        }

        if (text === '') {
            text = '0 рублей';
        }

        // Создаем и настраиваем синтез речи
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9; // Немного медленнее для четкости
        utterance.pitch = 1.0;

        // Озвучиваем с небольшой задержкой после биипа
        setTimeout(() => {
            this.speechSynthesis.speak(utterance);
        }, 200);
    }

    getRubleWord(number) {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['рубль', 'рубля', 'рублей'];

        if (number % 100 > 4 && number % 100 < 20) {
            return titles[2];
        } else {
            return titles[cases[(number % 10 < 5) ? number % 10 : 5]];
        }
    }

    getKopekWord(number) {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['копейка', 'копейки', 'копеек'];

        if (number % 100 > 4 && number % 100 < 20) {
            return titles[2];
        } else {
            return titles[cases[(number % 10 < 5) ? number % 10 : 5]];
        }
    }

    async checkPrice(barcode) {
        if (!barcode) {
            this.showError('Пожалуйста, отсканируйте штрих-код');
            return;
        }

        if (!this.apiUrl) {
            this.showError('Пожалуйста, настройте URL API в настройках');
            return;
        }

        try {
            // Останавливаем таймер автоочистки
            this.clearAutoResetTimer();

            // Скрываем idle screen и показываем загрузку
            this.idleScreen.classList.add('hidden');
            this.showLoading();
            this.hideResult();
            this.hideError();

            // Воспроизводим звуковой сигнал
            this.playBeep();

            // Отправляем запрос
            const response = await this.fetchPrice(barcode);

            // Отображаем результат
            this.showResult(response, barcode);

            // Озвучиваем цену
            this.speakPrice(response.price);

            // Запускаем таймер автоочистки (60 секунд)
            this.startAutoResetTimer();

        } catch (error) {
            this.showError(error.message);
            // При ошибке возвращаемся к idle screen через 5 секунд
            setTimeout(() => {
                this.resetToIdleScreen();
            }, 5000);
        } finally {
            this.hideLoading();
        }
    }

    async fetchPrice(barcode) {
        const url = this.buildApiUrl(barcode);

        // Подготовка заголовков с Basic Authentication
        const headers = {
            'Content-Type': 'application/json',
        };

        // Добавляем Basic Auth если указаны логин и пароль
        if (this.apiUsername) {
            const credentials = `${this.apiUsername}:${this.apiPassword}`;

            // Кодируем в UTF-8 и затем в base64 для поддержки кириллицы
            // Используем безопасный метод с apply для больших строк
            const utf8Bytes = new TextEncoder().encode(credentials);
            const base64Credentials = btoa(String.fromCharCode.apply(null, utf8Bytes));
            headers['Authorization'] = `Basic ${base64Credentials}`;
		
            // Отладочная информация
            console.log('Отправка запроса с авторизацией:');
            console.log('  Логин:', this.apiUsername);
            console.log('  URL:', url);
            console.log('  Authorization:', `Basic ${base64Credentials}`);
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
            });

            // Проверяем статус авторизации
            if (response.status === 401) {
                console.error('Ошибка 401: Неверный логин или пароль');
                console.log('  Текущий логин:', this.apiUsername);
                console.log('  Пароль установлен:', this.apiPassword ? 'Да' : 'Нет');
                throw new Error('Ошибка авторизации: неверный логин или пароль');
            }

            // Парсим JSON ответ
            const data = await response.json();

            // Проверяем наличие ошибки в ответе
            if (data.error) {
                throw new Error(data.error);
            }

            // Проверяем формат успешного ответа
            if (data.name === undefined || data.price === undefined) {
                throw new Error('Некорректный формат ответа от сервера');
            }

            return data;

        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Ошибка подключения к серверу');
            }
            if (error.name === 'SyntaxError') {
                throw new Error('Ошибка парсинга ответа от сервера');
            }
            throw error;
        }
    }

    buildApiUrl(barcode) {
        // Если URL содержит параметр {barcode}, заменяем его
        if (this.apiUrl.includes('{barcode}')) {
            return this.apiUrl.replace('{barcode}', encodeURIComponent(barcode));
        }

        // Иначе добавляем как query параметр
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        return `${this.apiUrl}${separator}barcode=${encodeURIComponent(barcode)}`;
    }

    showLoading() {
        this.loadingEl.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingEl.classList.add('hidden');
    }

    showResult(data, barcode) {
        const productName = data.name || data.productName || 'Товар найден';
        const price = parseFloat(data.price).toFixed(2);

        document.getElementById('product-name').textContent = productName;
        document.getElementById('price-value').textContent = price;
        document.getElementById('barcode-display').textContent = barcode;

        // Отображаем изображение товара если есть
        if (data.image) {
            this.productImage.src = data.image;
            this.productImageContainer.classList.remove('hidden');
        } else {
            this.productImageContainer.classList.add('hidden');
        }

        this.resultEl.classList.remove('hidden');
    }

    hideResult() {
        this.resultEl.classList.add('hidden');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.errorEl.classList.remove('hidden');

        // Автоматически скрываем ошибку через 5 секунд
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.errorEl.classList.add('hidden');
    }

    // Скрытая разблокировка настроек
    handleSecretClick() {
        this.clickCount++;

        // Сбрасываем счетчик через 2 секунды
        clearTimeout(this.clickTimer);
        this.clickTimer = setTimeout(() => {
            this.clickCount = 0;
        }, 2000);

        // Показываем прогресс (опционально)
        if (this.clickCount >= 3 && this.clickCount < 7) {
            console.log(`Осталось кликов: ${7 - this.clickCount}`);
        }

        // После 7 кликов разблокируем настройки
        if (this.clickCount >= 7 && !this.settingsUnlocked) {
            this.unlockSettings();
        }
    }

    unlockSettings() {
        this.settingsUnlocked = true;
        this.settingsToggle.classList.remove('hidden');

        // Визуальная обратная связь
        this.appTitle.style.animation = 'pulse 0.5s';
        setTimeout(() => {
            this.appTitle.style.animation = '';
        }, 500);

        // Опционально: показать уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            font-weight: bold;
        `;
        notification.textContent = '🔓 Настройки разблокированы';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 2000);

        // Сбрасываем счетчик
        this.clickCount = 0;
    }

    // Настройки
    saveSettings() {
        this.apiUrl = this.apiUrlInput.value.trim();
        this.apiUsername = this.apiUsernameInput.value.trim();
        this.apiPassword = this.apiPasswordInput.value;

        localStorage.setItem('apiUrl', this.apiUrl);
        localStorage.setItem('apiUsername', this.apiUsername);
        localStorage.setItem('apiPassword', this.apiPassword);

        this.settingsPanel.classList.add('hidden');
        alert('Настройки сохранены!');
    }

    loadApiUrl() {
        return localStorage.getItem('apiUrl') || 'http://192.168.0.200/SmallBusiness/hs/products/get_product?barcode={barcode}';
    }

    loadUsername() {
        return localStorage.getItem('apiUsername') || 'Администратор';
    }

    loadPassword() {
        return localStorage.getItem('apiPassword') || '';
    }

    // Service Worker для PWA
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker зарегистрирован:', registration);
            } catch (error) {
                console.log('Ошибка регистрации Service Worker:', error);
            }
        }
    }
}

// Инициализация приложения
let priceChecker; // Глобальная переменная для отладки
document.addEventListener('DOMContentLoaded', () => {
    priceChecker = new PriceChecker();

    // Делаем доступным из консоли для отладки
    window.priceChecker = priceChecker;
    console.log('💡 Для отладки используйте: priceChecker.fetchPrice("1234567890123")');
});
