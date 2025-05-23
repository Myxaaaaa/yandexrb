const RATES = {
    BASE: 100,
    BONUS_60: 120,
    BONUS_100: 150
};

let state = {
    isShiftActive: false,
    startTime: null,
    selectedParking: null,
    parkingData: {},
    shiftHistory: []
};

function initializeParkingData() {
    const parkings = ['beta', 'gum', 'vefa', 'medical', 'polytech', 'yuzhka'];
    state.parkingData = {};
    parkings.forEach(parking => {
        state.parkingData[parking] = {
            yandex: 0,
            sunrent: 0
        };
    });
}

function loadState() {
    const savedState = localStorage.getItem('scooterAppState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        state = { ...state, ...parsedState };
        
        if (state.isShiftActive && state.startTime) {
            state.startTime = new Date(state.startTime);
            
            const now = new Date();
            const diff = now - state.startTime;
            const hoursPassed = diff / (1000 * 60 * 60);
            
            if (hoursPassed > 24) {
                state.isShiftActive = false;
                state.startTime = null;
                state.selectedParking = null;
                initializeParkingData();
            }
        }
        
        updateUI();
    }
}

function saveState() {
    localStorage.setItem('scooterAppState', JSON.stringify(state));
}

function updateUI() {
    const startBtn = document.getElementById('startShift');
    const endBtn = document.getElementById('endShift');
    const shiftSummary = document.getElementById('shiftSummary');
    const activeShiftEarnings = document.getElementById('activeShiftEarnings');
    
    if (startBtn && endBtn) {
        startBtn.disabled = state.isShiftActive;
        endBtn.disabled = !state.isShiftActive;
    }
    
    if (shiftSummary) {
        shiftSummary.style.display = state.isShiftActive ? 'none' : 'block';
    }
    
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = state.isShiftActive ? 'block' : 'none';
    }
    
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (state.earningsInterval) {
        clearInterval(state.earningsInterval);
        state.earningsInterval = null;
    }
    
    updateTimer();
    updateCurrentEarnings();
    updateParkingCounters();
    updateParkingSelector();
    updateHistoryDisplay();
}

function updateTimer() {
    const timerElement = document.getElementById('shiftTimer');
    if (!timerElement) return;
    
    if (state.isShiftActive && state.startTime) {
        const updateTimerDisplay = () => {
            const now = new Date();
            const diff = now - state.startTime;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimerDisplay();
        
        if (!state.timerInterval) {
            state.timerInterval = setInterval(updateTimerDisplay, 1000);
        }
    } else {
        timerElement.textContent = '00:00:00';
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
    }
}

function updateCurrentEarnings() {
    const earningsElement = document.getElementById('activeEarnings');
    if (!earningsElement || !state.isShiftActive || !state.startTime) return;

    const updateEarnings = () => {
        const now = new Date();
        const diff = now - state.startTime;
        const durationHours = diff / (1000 * 60 * 60);
        
        const totalScooters = Object.values(state.parkingData).reduce((sum, parking) => {
            return sum + parking.yandex + parking.sunrent;
        }, 0);
        
        let rate = 100;
        if (totalScooters >= 100) rate = 150;
        else if (totalScooters >= 60) rate = 120;
        
        const rateElement = document.getElementById('currentRate');
        if (rateElement) {
            rateElement.textContent = rate;
        }
        
        const currentEarnings = (durationHours * rate).toFixed(2);
        earningsElement.textContent = currentEarnings;
    };
    
    updateEarnings();
    
    if (!state.earningsInterval) {
        state.earningsInterval = setInterval(updateEarnings, 100);
    }
}

function updateParkingCounters() {
    Object.entries(state.parkingData).forEach(([parking, data]) => {
        const yandexCount = document.querySelector(`#${parking} .yandex-count`);
        const sunrentCount = document.querySelector(`#${parking} .sunrent-count`);
        
        if (yandexCount) yandexCount.textContent = data.yandex;
        if (sunrentCount) sunrentCount.textContent = data.sunrent;
    });
    
    updateTotalScooters();
}

function updateTotalScooters() {
    const totalElement = document.getElementById('totalScooters');
    if (!totalElement) return;
    
    const total = Object.values(state.parkingData).reduce((sum, parking) => {
        return sum + parking.yandex + parking.sunrent;
    }, 0);
    
    totalElement.textContent = total;
    
    const rateElement = document.getElementById('currentRate');
    if (rateElement) {
        let rate = 100;
        if (total >= 100) rate = 150;
        else if (total >= 60) rate = 120;
        rateElement.textContent = rate;
    }
}

function updateParkingSelector() {
    const tabs = document.querySelectorAll('.parking-tab');
    const cards = document.querySelectorAll('.parking-card');
    
    tabs.forEach(tab => {
        const parkingId = tab.dataset.parking;
        tab.classList.toggle('active', parkingId === state.selectedParking);
    });
    
    cards.forEach(card => {
        const parkingId = card.id;
        card.classList.toggle('active', parkingId === state.selectedParking);
    });
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyList');
    if (!historyContainer) return;
    
    const totalEarnings = state.shiftHistory.reduce((sum, shift) => sum + Number(shift.earnings), 0);
    
    const totalElement = document.getElementById('historyTotal');
    const totalShiftsElement = document.getElementById('totalShifts');
    const totalEarningsElement = document.getElementById('totalEarnings');
    
    if (totalElement) {
        if (totalShiftsElement) {
            totalShiftsElement.textContent = state.shiftHistory.length;
        }
        if (totalEarningsElement) {
            totalEarningsElement.textContent = totalEarnings.toFixed(2);
        }
    }
    
    const formatDateTime = (date) => {
        return new Date(date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const formatParkingName = (parkingId) => {
        const names = {
            'beta': 'Бета',
            'gum': 'ГУМ',
            'vefa': 'Вефа',
            'medical': 'Медицинская Академия',
            'polytech': 'Политех',
            'yuzhka': 'Южка'
        };
        return names[parkingId] || parkingId;
    };
    
    historyContainer.innerHTML = state.shiftHistory.map((shift, index) => {
        const parkingDetails = shift.parkingDetails || {};
        
        const parkingDetailsHtml = Object.entries(parkingDetails).length > 0 
            ? Object.entries(parkingDetails)
                .map(([parking, data]) => `
                    <div class="parking-detail">
                        <strong>${formatParkingName(parking)}:</strong>
                        ${data.yandex > 0 ? `<span class="yandex-count">Yandex: ${data.yandex}</span>` : ''}
                        ${data.sunrent > 0 ? `<span class="sunrent-count">SunRent: ${data.sunrent}</span>` : ''}
                    </div>
                `).join('')
            : '<div class="parking-detail">Нет данных о парковках</div>';
        
        return `
            <div class="history-item">
                <div class="history-content">
                    <div class="shift-header">
                        <h4>${formatDateTime(shift.startTime)} - ${formatDateTime(shift.endTime)}</h4>
                        <span class="shift-rate">Ставка: ${shift.rate || 100} <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Flag_of_Kyrgyzstan.svg" alt="KGS" class="currency-flag">/ч</span>
                    </div>
                    <div class="shift-duration">
                        <i class="fas fa-clock"></i> ${shift.duration}
                    </div>
                    <div class="shift-scooters">
                        <i class="fas fa-scooter"></i> Всего самокатов: ${shift.totalScooters}
                    </div>
                    <div class="shift-earnings">
                        <i class="fas fa-money-bill-wave"></i> Заработок: ${Number(shift.earnings).toFixed(2)} <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Flag_of_Kyrgyzstan.svg" alt="KGS" class="currency-flag">
                    </div>
                    <div class="parking-details">
                        <h5>Детали по парковкам:</h5>
                        ${parkingDetailsHtml}
                    </div>
                </div>
                <button class="delete-shift" data-index="${index}">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.delete-shift').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.delete-shift').dataset.index);
            if (confirm('Вы уверены, что хотите удалить эту смену?')) {
                state.shiftHistory.splice(index, 1);
                saveState();
                updateHistoryDisplay();
            }
        });
    });
}

function startShift() {
    if (state.isShiftActive) return;
    
    state.isShiftActive = true;
    state.startTime = new Date();
    state.selectedParking = null;
    initializeParkingData();
    
    const activeShiftEarnings = document.getElementById('activeShiftEarnings');
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = 'block';
    }
    
    updateUI();
    saveState();
}

function endShift() {
    if (!state.isShiftActive) return;
    
    if (state.earningsInterval) {
        clearInterval(state.earningsInterval);
        state.earningsInterval = null;
    }
    
    const activeShiftEarnings = document.getElementById('activeShiftEarnings');
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = 'none';
    }
    
    const endTime = new Date();
    const diff = endTime - state.startTime;
    const durationHours = diff / (1000 * 60 * 60);
    const duration = durationHours;
    
    const totalScooters = Object.values(state.parkingData).reduce((sum, parking) => {
        return sum + parking.yandex + parking.sunrent;
    }, 0);
    
    let rate = 100;
    if (totalScooters >= 100) rate = 150;
    else if (totalScooters >= 60) rate = 120;
    
    const earnings = duration * rate;
    
    const parkingDetails = {};
    Object.entries(state.parkingData).forEach(([parking, data]) => {
        if (data.yandex > 0 || data.sunrent > 0) {
            parkingDetails[parking] = {
                yandex: data.yandex,
                sunrent: data.sunrent
            };
        }
    });
    
    state.shiftHistory.push({
        startTime: state.startTime,
        endTime: endTime,
        duration: `${duration.toFixed(2)} ч`,
        totalScooters,
        earnings,
        parkingDetails,
        rate
    });
    
    state.isShiftActive = false;
    state.startTime = null;
    state.selectedParking = null;
    initializeParkingData();
    
    updateUI();
    saveState();
}

function selectParking(parkingId) {
    state.selectedParking = parkingId;
    updateParkingSelector();
    saveState();
}

function updateScooterCount(parkingId, type, delta) {
    if (!state.isShiftActive) return;
    
    const parking = state.parkingData[parkingId];
    if (!parking) return;
    
    const newCount = Math.max(0, parking[type] + delta);
    parking[type] = newCount;
    
    updateParkingCounters();
    saveState();
}

function initializeEventListeners() {
    const startBtn = document.getElementById('startShift');
    const endBtn = document.getElementById('endShift');
    
    if (startBtn) {
        startBtn.addEventListener('click', startShift);
    }
    
    if (endBtn) {
        endBtn.addEventListener('click', endShift);
    }
    
    document.querySelectorAll('.parking-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            selectParking(tab.dataset.parking);
        });
    });
    
    document.querySelectorAll('.select-parking').forEach(button => {
        button.addEventListener('click', (e) => {
            const parkingId = e.target.closest('.parking-card').id;
            selectParking(parkingId);
        });
    });
    
    document.querySelectorAll('.counter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const counter = e.target.closest('.counter-group');
            const parkingId = counter.closest('.parking-card').id;
            const type = counter.classList.contains('yandex') ? 'yandex' : 'sunrent';
            const delta = button.classList.contains('plus') ? 1 : -1;
            
            updateScooterCount(parkingId, type, delta);
        });
    });
}

function initializeApp() {
    loadState();
    initializeEventListeners();
    updateUI();
    setInterval(saveState, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.querySelector('.splash-screen');
        if (splash) {
            splash.remove();
        }
    }, 2500);
    
    initializeApp();
}); 