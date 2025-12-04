// Прайс Чекер - Основное приложение

class PriceChecker {
    constructor() {
        this.apiUrl = this.loadApiUrl();
        this.history = this.loadHistory();
        this.clickCount = 0;
        this.clickTimer = null;
        this.settingsUnlocked = false;
        this.init();
    }

    init() {
        // Получаем элементы
        this.barcodeInput = document.getElementById('barcode-input');
        this.manualCheckBtn = document.getElementById('manual-check');
        this.loadingEl = document.getElementById('loading');
        this.resultEl = document.getElementById('result');
        this.errorEl = document.getElementById('error');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.settingsPanel = document.getElementById('settings-panel');
        this.apiUrlInput = document.getElementById('api-url');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.clearHistoryBtn = document.getElementById('clear-history');
        this.appTitle = document.getElementById('app-title');

        // Устанавливаем обработчики событий
        this.setupEventListeners();

        // Загружаем настройки в UI
        this.apiUrlInput.value = this.apiUrl;

        // Отображаем историю
        this.renderHistory();

        // Регистрируем Service Worker для PWA
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Автоматическая проверка при вводе (для сканеров, которые добавляют Enter)
        this.barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkPrice();
            }
        });

        // Ручная проверка по кнопке
        this.manualCheckBtn.addEventListener('click', () => {
            this.checkPrice();
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

        // Очистка истории
        this.clearHistoryBtn.addEventListener('click', () => {
            this.clearHistory();
        });
    }

    async checkPrice() {
        const barcode = this.barcodeInput.value.trim();

        if (!barcode) {
            this.showError('Пожалуйста, введите штрих-код');
            return;
        }

        if (!this.apiUrl) {
            this.showError('Пожалуйста, настройте URL API в настройках');
            return;
        }

        try {
            // Показываем анимацию загрузки
            this.showLoading();
            this.hideResult();
            this.hideError();

            // Отправляем запрос
            const response = await this.fetchPrice(barcode);

            // Отображаем результат
            this.showResult(response, barcode);

            // Добавляем в историю
            this.addToHistory(barcode, response);

            // Очищаем поле ввода
            this.barcodeInput.value = '';
            this.barcodeInput.focus();

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async fetchPrice(barcode) {
        const url = this.buildApiUrl(barcode);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const data = await response.json();

            // Проверяем формат ответа
            if (!data.price && data.price !== 0) {
                throw new Error('Некорректный формат ответа от сервера');
            }

            return data;

        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Ошибка подключения к серверу');
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

    // История проверок
    addToHistory(barcode, data) {
        const item = {
            barcode,
            name: data.name || data.productName || 'Товар',
            price: data.price,
            timestamp: new Date().toLocaleString('ru-RU')
        };

        this.history.unshift(item);

        // Ограничиваем историю 20 записями
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }

        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('history-list');

        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">История пуста</p>';
            return;
        }

        historyList.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div class="history-name">${item.name}</div>
                <div class="history-price">${parseFloat(item.price).toFixed(2)} ₽</div>
                <div class="history-barcode">${item.barcode}</div>
                <div class="history-time">${item.timestamp}</div>
            </div>
        `).join('');
    }

    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить историю?')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
        }
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
        localStorage.setItem('apiUrl', this.apiUrl);
        this.settingsPanel.classList.add('hidden');
        alert('Настройки сохранены!');
    }

    loadApiUrl() {
        return localStorage.getItem('apiUrl') || '';
    }

    // LocalStorage для истории
    saveHistory() {
        localStorage.setItem('priceHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const stored = localStorage.getItem('priceHistory');
        return stored ? JSON.parse(stored) : [];
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
document.addEventListener('DOMContentLoaded', () => {
    new PriceChecker();
});
