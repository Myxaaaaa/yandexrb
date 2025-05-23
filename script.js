// Константы для расчета зарплаты
const RATES = {
    BASE: 100,    // Базовая ставка
    BONUS_60: 120, // Ставка при 60+ самокатах
    BONUS_100: 150 // Ставка при 100+ самокатах
};

// Состояние приложения
let state = {
    isShiftActive: false,
    shiftStartTime: null,
    shiftTimer: null,
    parkingData: {},
    shiftHistory: JSON.parse(localStorage.getItem('shiftHistory')) || []
};

// Инициализация данных парковок
function initializeParkingData() {
    const parkings = ['beta', 'gum', 'vefa', 'med', 'polytech', 'yuzhka'];
    parkings.forEach(parking => {
        state.parkingData[parking] = {
            yandex: 0,
            sunrent: 0
        };
    });
}

// Форматирование времени
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Обновление таймера
function updateTimer() {
    if (!state.isShiftActive) return;
    
    const now = Date.now();
    const elapsed = now - state.shiftStartTime;
    document.getElementById('shiftTime').textContent = formatTime(elapsed);
}

// Подсчет общего количества самокатов
function updateTotalScooters() {
    let total = 0;
    Object.values(state.parkingData).forEach(parking => {
        total += parking.yandex + parking.sunrent;
    });
    document.getElementById('totalScooters').textContent = total;
    return total;
}

// Расчет ставки на основе количества самокатов
function calculateRate(totalScooters) {
    if (totalScooters >= 100) return RATES.BONUS_100;
    if (totalScooters >= 60) return RATES.BONUS_60;
    return RATES.BASE;
}

// Начало смены
function startShift() {
    console.log('Попытка начать смену');
    console.log('Текущее состояние:', state.isShiftActive);
    
    if (state.isShiftActive) {
        console.log('Смена уже активна');
        return;
    }
    
    try {
        state.isShiftActive = true;
        state.shiftStartTime = Date.now();
        initializeParkingData();
        
        const startButton = document.getElementById('startShift');
        const endButton = document.getElementById('endShift');
        const summary = document.getElementById('shiftSummary');
        
        if (!startButton || !endButton || !summary) {
            console.error('Не найдены необходимые элементы на странице');
            return;
        }
        
        startButton.disabled = true;
        endButton.disabled = false;
        summary.style.display = 'none';
        
        state.shiftTimer = setInterval(updateTimer, 1000);
        updateTimer();
        
        console.log('Смена успешно начата');
    } catch (error) {
        console.error('Ошибка при начале смены:', error);
    }
}

// Завершение смены
function endShift() {
    if (!state.isShiftActive) return;
    
    state.isShiftActive = false;
    clearInterval(state.shiftTimer);
    
    const totalScooters = updateTotalScooters();
    const hoursWorked = (Date.now() - state.shiftStartTime) / (1000 * 60 * 60);
    const rate = calculateRate(totalScooters);
    const earnings = Math.round(hoursWorked * rate);
    
    // Сохранение смены в историю
    const shiftRecord = {
        date: new Date().toLocaleString(),
        duration: formatTime(Date.now() - state.shiftStartTime),
        totalScooters,
        rate,
        earnings
    };
    
    state.shiftHistory.unshift(shiftRecord);
    localStorage.setItem('shiftHistory', JSON.stringify(state.shiftHistory));
    
    // Удаляем активную смену из localStorage
    localStorage.removeItem('activeShift');
    
    // Сбрасываем счетчики парковок
    initializeParkingData();
    
    // Обновляем отображение счетчиков
    document.querySelectorAll('.parking-card').forEach(card => {
        card.querySelectorAll('.counter-group').forEach(group => {
            const countDisplay = group.querySelector('.count');
            if (countDisplay) {
                countDisplay.textContent = '0';
            }
        });
    });
    
    // Обновление итогов
    document.getElementById('summaryTime').textContent = hoursWorked.toFixed(1);
    document.getElementById('summaryTotal').textContent = totalScooters;
    document.getElementById('summaryRate').textContent = rate;
    document.getElementById('summaryEarnings').textContent = earnings;
    
    document.getElementById('shiftSummary').style.display = 'block';
    document.getElementById('startShift').disabled = false;
    document.getElementById('endShift').disabled = true;
    
    updateHistoryDisplay();
    updateTotalScooters(); // Обновляем общее количество самокатов
}

// Обновление счетчика самокатов
function updateScooterCount(parking, type, delta) {
    if (!state.isShiftActive) return;
    
    const newCount = state.parkingData[parking][type] + delta;
    if (newCount >= 0) {
        state.parkingData[parking][type] = newCount;
        updateTotalScooters();
        saveState(); // Сохраняем состояние после каждого изменения
    }
}

// Обновление отображения истории
function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    const totalEarnings = state.shiftHistory.reduce((sum, shift) => sum + shift.earnings, 0);
    
    // Добавляем общий итог
    const totalSummary = `
        <div class="history-total">
            <h3>Общий итог</h3>
            <p>Всего заработано: <strong>${totalEarnings} сом</strong></p>
            <p>Количество смен: <strong>${state.shiftHistory.length}</strong></p>
        </div>
    `;
    
    // Обновляем историю с кнопками удаления
    const historyItems = state.shiftHistory.map((shift, index) => `
        <div class="history-item">
            <div class="history-content">
                <p>Дата: ${shift.date}</p>
                <p>Длительность: ${shift.duration}</p>
                <p>Самокатов: ${shift.totalScooters}</p>
                <p>Ставка: ${shift.rate} сом/час</p>
                <p>Заработок: ${shift.earnings} сом</p>
            </div>
            <button class="delete-shift" data-index="${index}">Удалить смену</button>
        </div>
    `).join('');
    
    historyList.innerHTML = totalSummary + historyItems;
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-shift').forEach(button => {
        button.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить эту смену?')) {
                const index = parseInt(button.dataset.index);
                state.shiftHistory.splice(index, 1);
                localStorage.setItem('shiftHistory', JSON.stringify(state.shiftHistory));
                updateHistoryDisplay();
            }
        });
    });
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    console.log('Инициализация обработчиков событий');
    
    const startButton = document.getElementById('startShift');
    const endButton = document.getElementById('endShift');
    
    if (!startButton || !endButton) {
        console.error('Кнопки управления сменой не найдены');
        return;
    }
    
    console.log('Кнопки найдены, добавляем обработчики');
    
    // Кнопки начала и завершения смены
    startButton.addEventListener('click', () => {
        console.log('Нажата кнопка начала смены');
        startShift();
    });
    
    endButton.addEventListener('click', () => {
        console.log('Нажата кнопка завершения смены');
        endShift();
    });
    
    // Обработчики для счетчиков самокатов
    document.querySelectorAll('.parking-card').forEach(card => {
        const parking = card.dataset.parking;
        
        card.querySelectorAll('.counter-group').forEach(group => {
            const type = group.querySelector('span').textContent.toLowerCase().replace(':', '');
            const minusBtn = group.querySelector('.minus');
            const plusBtn = group.querySelector('.plus');
            const countDisplay = group.querySelector('.count');
            
            minusBtn.addEventListener('click', () => {
                updateScooterCount(parking, type, -1);
                countDisplay.textContent = state.parkingData[parking][type];
            });
            
            plusBtn.addEventListener('click', () => {
                updateScooterCount(parking, type, 1);
                countDisplay.textContent = state.parkingData[parking][type];
            });
        });
    });
}

// Восстановление состояния при загрузке страницы
function restoreState() {
    // Пытаемся восстановить активную смену
    const savedShift = localStorage.getItem('activeShift');
    if (savedShift) {
        const savedState = JSON.parse(savedShift);
        state.isShiftActive = true;
        state.shiftStartTime = savedState.startTime;
        state.parkingData = savedState.parkingData;
        
        // Восстанавливаем счетчики
        Object.entries(state.parkingData).forEach(([parking, data]) => {
            const card = document.querySelector(`[data-parking="${parking}"]`);
            if (card) {
                card.querySelectorAll('.counter-group').forEach(group => {
                    const type = group.querySelector('span').textContent.toLowerCase().replace(':', '');
                    const countDisplay = group.querySelector('.count');
                    if (countDisplay) {
                        countDisplay.textContent = data[type];
                    }
                });
            }
        });

        // Обновляем UI
        document.getElementById('startShift').disabled = true;
        document.getElementById('endShift').disabled = false;
        document.getElementById('shiftSummary').style.display = 'none';
        
        // Запускаем таймер
        state.shiftTimer = setInterval(updateTimer, 1000);
        updateTimer();
        updateTotalScooters();
    } else {
        // Если нет сохраненной смены, сбрасываем состояние
        state = {
            isShiftActive: false,
            shiftStartTime: null,
            shiftTimer: null,
            parkingData: {},
            shiftHistory: JSON.parse(localStorage.getItem('shiftHistory')) || []
        };
        initializeParkingData();
        document.getElementById('startShift').disabled = false;
        document.getElementById('endShift').disabled = true;
        document.getElementById('shiftSummary').style.display = 'none';
    }
    
    updateHistoryDisplay();
}

// Сохранение состояния каждые 5 секунд
function saveState() {
    if (state.isShiftActive) {
        localStorage.setItem('activeShift', JSON.stringify({
            startTime: state.shiftStartTime,
            parkingData: state.parkingData
        }));
    }
}

// Инициализация приложения
initializeParkingData();
initializeEventListeners();
restoreState();

// Сохраняем состояние каждые 5 секунд
setInterval(saveState, 5000);

// Сохраняем состояние при закрытии страницы
window.addEventListener('beforeunload', () => {
    saveState();
}); 