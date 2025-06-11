const RATES = {
    BASE: 100,
    BONUS_60: 120,
    BONUS_100: 150
}

let state = {
    isShiftActive: false,
    startTime: null,
    selectedParking: null,
    parkingData: {},
    shiftHistory: [],
    repairs: {
        yandex: [],
        sunrent: []
    },
    repairStatuses: {
        yandex: {},
        sunrent: {}
    }
}

function initializeParkingData() {
    const parkings = ['beta', 'gum', 'vefa', 'medical', 'polytech', 'yuzhka']
    state.parkingData = {}
    parkings.forEach(parking => {
        state.parkingData[parking] = {
            yandex: 0,
            sunrent: 0
        }
    })
    state.repairs = {
        yandex: [],
        sunrent: []
    }
    state.repairStatuses = {
        yandex: {},
        sunrent: {}
    }
}

function loadState() {
    const savedState = localStorage.getItem('scooterAppState')
    if (savedState) {
        const parsedState = JSON.parse(savedState)
        state = { ...state, ...parsedState }
        
        if (state.isShiftActive && state.startTime) {
            state.startTime = new Date(state.startTime)
            
            const now = new Date()
            const diff = now - state.startTime
            const hoursPassed = diff / (1000 * 60 * 60)
            
            if (hoursPassed > 24) {
                state.isShiftActive = false
                state.startTime = null
                state.selectedParking = null
                initializeParkingData()
            }
        }
        
        updateUI()
        updateTotalStats()
    }
}

function saveState() {
    localStorage.setItem('scooterAppState', JSON.stringify(state))
}

function updateUI() {
    const startBtn = document.getElementById('startShift')
    const endBtn = document.getElementById('endShift')
    const shiftSummary = document.getElementById('shiftSummary')
    const activeShiftEarnings = document.getElementById('activeShiftEarnings')
    
    if (startBtn && endBtn) {
        startBtn.disabled = state.isShiftActive
        endBtn.disabled = !state.isShiftActive
    }
    
    if (shiftSummary) {
        shiftSummary.style.display = state.isShiftActive ? 'none' : 'block'
    }
    
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = state.isShiftActive ? 'block' : 'none'
    }
    
    if (state.timerInterval) {
        clearInterval(state.timerInterval)
        state.timerInterval = null
    }
    if (state.earningsInterval) {
        clearInterval(state.earningsInterval)
        state.earningsInterval = null
    }
    
    updateTimer()
    updateCurrentEarnings()
    updateParkingCounters()
    updateParkingSelector()
    updateHistoryDisplay()
    updateRepairsList()
    initializeInputHandlers()
}

function updateTimer() {
    const timerElement = document.getElementById('shiftTimer')
    if (!timerElement) return
    
    if (state.isShiftActive && state.startTime) {
        const updateTimerDisplay = () => {
            const now = new Date()
            const diff = now - state.startTime
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            
            timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        
        updateTimerDisplay()
        
        if (!state.timerInterval) {
            state.timerInterval = setInterval(updateTimerDisplay, 1000)
        }
    } else {
        timerElement.textContent = '00:00:00'
        if (state.timerInterval) {
            clearInterval(state.timerInterval)
            state.timerInterval = null
        }
    }
}

function updateCurrentEarnings() {
    const earningsElement = document.getElementById('activeEarnings')
    if (!earningsElement || !state.isShiftActive || !state.startTime) return

    const updateEarnings = () => {
        const now = new Date()
        const diff = now - state.startTime
        const durationHours = diff / (1000 * 60 * 60)
        
        const totalScooters = Object.values(state.parkingData).reduce((sum, parking) => {
            return sum + parking.yandex + parking.sunrent
        }, 0)
        
        let rate = 100
        if (totalScooters >= 100) rate = 150
        else if (totalScooters >= 60) rate = 120
        
        const rateElement = document.getElementById('currentRate')
        if (rateElement) {
            rateElement.textContent = rate
        }
        
        const currentEarnings = (durationHours * rate).toFixed(2)
        earningsElement.textContent = currentEarnings
    }
    
    updateEarnings()
    
    if (!state.earningsInterval) {
        state.earningsInterval = setInterval(updateEarnings, 100)
    }
}

function updateParkingCounters() {
    Object.entries(state.parkingData).forEach(([parking, data]) => {
        const yandexCount = document.querySelector(`#${parking} .yandex-count`)
        const sunrentCount = document.querySelector(`#${parking} .sunrent-count`)
        
        if (yandexCount) yandexCount.textContent = data.yandex
        if (sunrentCount) sunrentCount.textContent = data.sunrent
    })
    
    updateTotalScooters()
}

function updateTotalScooters() {
    const totalElement = document.getElementById('totalScooters')
    if (!totalElement) return
    
    const total = Object.values(state.parkingData).reduce((sum, parking) => {
        return sum + parking.yandex + parking.sunrent
    }, 0)
    
    totalElement.textContent = total
    
    const rateElement = document.getElementById('currentRate')
    if (rateElement) {
        let rate = 100
        if (total >= 100) rate = 150
        else if (total >= 60) rate = 120
        rateElement.textContent = rate
    }
}

function updateParkingSelector() {
    const tabs = document.querySelectorAll('.parking-tab')
    const cards = document.querySelectorAll('.parking-card')
    
    tabs.forEach(tab => {
        const parkingId = tab.dataset.parking
        tab.classList.toggle('active', parkingId === state.selectedParking)
    })
    
    cards.forEach(card => {
        const parkingId = card.id
        card.classList.toggle('active', parkingId === state.selectedParking)
    })
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyList')
    if (!historyContainer) return

    historyContainer.innerHTML = ''
    
    if (state.shiftHistory.length === 0) {
        historyContainer.innerHTML = '<div class="no-shifts">Нет завершенных смен</div>'
        return
    }

    state.shiftHistory.forEach((shift, index) => {
        const historyContent = document.createElement('div')
        historyContent.className = 'history-item'
        
        const shiftHeader = document.createElement('div')
        shiftHeader.className = 'shift-header'
        
        const shiftTitle = document.createElement('h4')
        shiftTitle.textContent = `${new Date(shift.startTime).toLocaleString()} - ${new Date(shift.endTime).toLocaleString()}`
        
        const shiftRate = document.createElement('span')
        shiftRate.className = 'shift-rate'
        shiftRate.textContent = `Ставка: ${shift.rate || 100} с. /ч`
        
        const shiftDuration = document.createElement('div')
        shiftDuration.className = 'shift-duration'
        shiftDuration.innerHTML = `<i class="fas fa-clock"></i> ${shift.duration}`
        
        const shiftScooters = document.createElement('div')
        shiftScooters.className = 'shift-scooters'
        shiftScooters.innerHTML = `<i class="fas fa-scooter"></i> Всего самокатов: ${shift.totalScooters}`
        
        const shiftEarnings = document.createElement('div')
        shiftEarnings.className = 'shift-earnings'
        shiftEarnings.innerHTML = `<i class="fas fa-money-bill-wave"></i> Заработок: ${Number(shift.earnings).toFixed(2)} <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Flag_of_Kyrgyzstan.svg" alt="KGS" class="currency-flag">`
        
        const parkingDetails = shift.parkingDetails || {}
        const repairs = shift.repairs || { yandex: [], sunrent: [] }
        
        const parkingDetailsHtml = Object.entries(parkingDetails).length > 0 
            ? Object.entries(parkingDetails)
                .map(([parking, data]) => `
                    <div class="parking-detail">
                        <strong>${formatParkingName(parking)}:</strong>
                        ${data.yandex > 0 ? `<span class="yandex-count">Yandex: ${data.yandex}</span>` : ''}
                        ${data.sunrent > 0 ? `<span class="sunrent-count">SunRent: ${data.sunrent}</span>` : ''}
                    </div>
                `).join('')
            : '<div class="parking-detail">Нет данных о парковках</div>'
        
        const repairsHtml = createRepairHistoryHtml(
            repairs,
            shift.repairStatuses || { yandex: {}, sunrent: {} },
            index
        )
        
        historyContent.innerHTML = `
            <div class="history-content">
                <div class="shift-header">
                    <h4>${shiftTitle.textContent}</h4>
                    <span class="shift-rate">${shiftRate.innerHTML}</span>
                </div>
                <div class="shift-duration">
                    ${shiftDuration.innerHTML}
                </div>
                <div class="shift-scooters">
                    ${shiftScooters.innerHTML}
                </div>
                <div class="shift-earnings">
                    ${shiftEarnings.innerHTML}
                </div>
                <div class="parking-details">
                    <h5>Детали по парковкам:</h5>
                    ${parkingDetailsHtml}
                </div>
                ${repairsHtml}
            </div>
            <button class="delete-shift" data-index="${index}" onclick="deleteShift(${index})">
                <i class="fas fa-trash"></i> Удалить
            </button>
        `
        
        historyContainer.appendChild(historyContent)
    })
    
    document.querySelectorAll('.delete-shift').forEach(button => {
        button.removeEventListener('click', deleteShift)
    })

    document.querySelectorAll('.toggle-repairs').forEach(button => {
        button.addEventListener('click', (e) => {
            const details = e.target.closest('.repairs-section').querySelector('.repairs-details')
            const icon = button.querySelector('i')
            
            if (details.style.display === 'none') {
                details.style.display = 'block'
                icon.classList.remove('fa-chevron-down')
                icon.classList.add('fa-chevron-up')
            } else {
                details.style.display = 'none'
                icon.classList.remove('fa-chevron-up')
                icon.classList.add('fa-chevron-down')
            }
        })
    })

    document.addEventListener('click', (e) => {
        const markWarehouseBtn = e.target.closest('.mark-warehouse-btn')
        if (markWarehouseBtn) {
            e.preventDefault()
            e.stopPropagation()
            
            const type = markWarehouseBtn.dataset.type
            const number = markWarehouseBtn.dataset.number
            if (state.repairStatuses[type][number]?.status === 'warehouse') {
                return
            }
            
            const comment = prompt('Укажите причину отправки на склад:')
            if (comment !== null) { 
                markRepairToWarehouse(type, number, comment)
            }
        }
    })

    initializeHistoryTabs()
}

function startShift() {
    if (state.isShiftActive) return
    
    state.isShiftActive = true
    state.startTime = new Date()
    state.selectedParking = null
    initializeParkingData()
    
    const activeShiftEarnings = document.getElementById('activeShiftEarnings')
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = 'block'
    }
    
    updateUI()
    saveState()
}

function updateTotalStats() {
    const totalShiftsElement = document.getElementById('totalShifts')
    const totalEarningsElement = document.getElementById('totalEarnings')
    
    if (!totalShiftsElement || !totalEarningsElement) return
    
    const totalShifts = state.shiftHistory.length
    const totalEarnings = state.shiftHistory.reduce((sum, shift) => sum + shift.earnings, 0)
    
    totalShiftsElement.textContent = totalShifts
    totalEarningsElement.textContent = totalEarnings.toFixed(2)
}

function endShift() {
    if (!state.isShiftActive) return
    
    if (state.earningsInterval) {
        clearInterval(state.earningsInterval)
        state.earningsInterval = null
    }
    
    const activeShiftEarnings = document.getElementById('activeShiftEarnings')
    if (activeShiftEarnings) {
        activeShiftEarnings.style.display = 'none'
    }
    
    const endTime = new Date()
    const diff = endTime - state.startTime
    const durationHours = diff / (1000 * 60 * 60)
    const duration = durationHours
    
    const totalScooters = Object.values(state.parkingData).reduce((sum, parking) => {
        return sum + parking.yandex + parking.sunrent
    }, 0)
    
    let rate = 100
    if (totalScooters >= 100) rate = 150
    else if (totalScooters >= 60) rate = 120
    
    const earnings = duration * rate
    
    const parkingDetails = {}
    Object.entries(state.parkingData).forEach(([parking, data]) => {
        if (data.yandex > 0 || data.sunrent > 0) {
            parkingDetails[parking] = {
                yandex: data.yandex,
                sunrent: data.sunrent
            }
        }
    })
    
    state.shiftHistory.push({
        startTime: state.startTime,
        endTime: endTime,
        duration: `${duration.toFixed(2)} ч`,
        totalScooters,
        earnings,
        parkingDetails,
        repairs: { ...state.repairs },
        repairStatuses: { ...state.repairStatuses },
        rate
    })
    
    state.isShiftActive = false
    state.startTime = null
    state.selectedParking = null
    initializeParkingData()
    
    updateUI()
    updateTotalStats()
    saveState()
}

function selectParking(parkingId) {
    state.selectedParking = parkingId
    updateParkingSelector()
    saveState()
}

function updateScooterCount(parkingId, type, delta) {
    if (!state.isShiftActive) return
    
    const parking = state.parkingData[parkingId]
    if (!parking) return
    
    const newCount = Math.max(0, parking[type] + delta)
    parking[type] = newCount
    
    updateParkingCounters()
    saveState()
}

function addRepair(type, scooterNumber) {
    if (!state.isShiftActive) return
    
    if (!state.repairs[type].includes(scooterNumber)) {
        state.repairs[type].push(scooterNumber)
        state.repairStatuses[type][scooterNumber] = {
            status: 'repairing',
            comment: '',
            timestamp: new Date().toISOString()
        }
        updateTotalScooters()
        saveState()
    }
}

function markRepairFixed(type, scooterNumber) {
    if (!state.isShiftActive) return
    
    const index = state.repairs[type].indexOf(scooterNumber)
    if (index > -1) {
        state.repairStatuses[type][scooterNumber] = {
            status: 'fixed',
            timestamp: new Date().toISOString()
        }
                const parkings = Object.keys(state.parkingData)
        if (parkings.length > 0) {
            const targetParking = state.selectedParking || parkings[0]
            if (!state.parkingData[targetParking]) {
                state.parkingData[targetParking] = {
                    yandex: 0,
                    sunrent: 0
                }
            }
            state.parkingData[targetParking][type] = (state.parkingData[targetParking][type] || 0) + 1
        }
        
        updateParkingCounters()
        updateTotalScooters()
        updateRepairsList()
        saveState()
    }
}

function markRepairToWarehouse(type, scooterNumber, comment) {
    if (!state.isShiftActive) return
    
    const index = state.repairs[type].indexOf(scooterNumber)
    if (index > -1) {
        state.repairStatuses[type][scooterNumber] = {
            status: 'warehouse',
            comment: comment || '',
            timestamp: new Date().toISOString()
        }
        
        const parkings = Object.keys(state.parkingData)
        if (parkings.length > 0) {
            const targetParking = state.selectedParking || parkings[0]
            if (!state.parkingData[targetParking]) {
                state.parkingData[targetParking] = {
                    yandex: 0,
                    sunrent: 0
                }
            }
            state.parkingData[targetParking][type] = (state.parkingData[targetParking][type] || 0) + 1
        }
        
        updateParkingCounters()
        updateTotalScooters()
        updateRepairsList()
        saveState()
    }
}

function createRepairHistoryHtml(repairs, repairStatuses, index) {
    const hasRepairs = repairs.yandex.length > 0 || repairs.sunrent.length > 0
    if (!hasRepairs) return ''

    const countByStatusAndType = (type) => {
        const counts = {
            repairing: 0,
            fixed: 0,
            warehouse: 0
        }
        repairs[type].forEach(num => {
            const status = repairStatuses[type][num]?.status || 'repairing'
            counts[status]++
        })
        return counts
    }

    const yandexCounts = countByStatusAndType('yandex')
    const sunrentCounts = countByStatusAndType('sunrent')

    const createScootersList = (type) => {
        const scooters = repairs[type]
        if (scooters.length === 0) return ''

        // Используем правильные counts для каждого типа
        const counts = type === 'yandex' ? yandexCounts : sunrentCounts

        return `
            <div class="repair-group">
                <div class="repair-type-header">
                    <span class="repair-type">${type === 'yandex' ? 'Yandex' : 'SunRent'}</span>
                    <div class="repair-type-counts">
                        <span class="repairing-count">
                            <i class="fas fa-tools"></i> В ремонте: ${counts.repairing}
                        </span>
                        <span class="fixed-count">
                            <i class="fas fa-check"></i> Исправлено: ${counts.fixed}
                        </span>
                        <span class="warehouse-count">
                            <i class="fas fa-warehouse"></i> На замену: ${counts.warehouse}
                        </span>
                    </div>
                </div>
                <div class="repair-numbers-list">
                    ${scooters.map(num => {
                        const status = repairStatuses[type][num] || { status: 'repairing' }
                        const statusText = status.status === 'fixed' ? 'Исправлено' : 
                                         status.status === 'warehouse' ? 'На склад' : 'В ремонте'
                        const statusClass = status.status
                        return `
                            <div class="repair-number ${statusClass}">
                                <div class="repair-info">
                                    <span class="repair-number-text">${num}</span>
                                    <span class="repair-status">${statusText}</span>
                                    ${status.comment ? `<span class="repair-comment">${status.comment}</span>` : ''}
                                </div>
                            </div>
                        `
                    }).join('')}
                </div>
            </div>
        `
    }

    return `
        <div class="repairs-section">
            <div class="repairs-header">
                <h5>Исправления и замены:</h5>
                <div class="repairs-summary">
                    <div class="repair-counts">
                        <span class="repairing-count">
                            <i class="fas fa-tools"></i> В ремонте: 
                            ${yandexCounts.repairing + sunrentCounts.repairing}
                        </span>
                        <span class="fixed-count">
                            <i class="fas fa-check"></i> Исправлено: 
                            ${yandexCounts.fixed + sunrentCounts.fixed}
                        </span>
                        <span class="warehouse-count">
                            <i class="fas fa-warehouse"></i> На замену: 
                            ${yandexCounts.warehouse + sunrentCounts.warehouse}
                        </span>
                    </div>
                </div>
                <button class="toggle-repairs" data-index="${index}">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="repairs-details" style="display: none">
                <div class="repairs-content">
                    ${createScootersList('yandex')}
                    ${createScootersList('sunrent')}
                </div>
            </div>
        </div>
    `
}

function initializeHistoryTabs() {
    document.querySelectorAll('.repair-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.closest('.repair-tab').dataset.tab
            const repairsSection = e.target.closest('.repairs-section')
            
            repairsSection.querySelectorAll('.repair-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabName)
            })
            
            repairsSection.querySelectorAll('.repair-tab-content').forEach(content => {
                content.classList.toggle('active', content.dataset.tabContent === tabName)
            })
        })
    })
}

function updateRepairsList() {
    const yandexList = document.getElementById('yandexRepairsList')
    const sunrentList = document.getElementById('sunrentRepairsList')
    
    const createRepairElement = (type, number) => {
        const status = state.repairStatuses[type][number] || { status: 'repairing' }
        const statusClass = status.status
        const statusText = status.status === 'fixed' ? 'Исправлено' : 
                          status.status === 'warehouse' ? 'На склад' : 'В ремонте'
        
        return `
            <div class="repair-number ${statusClass}">
                <div class="repair-info">
                    <span class="repair-number-text">${number}</span>
                    <span class="repair-status">${statusText}</span>
                    ${status.comment ? `<span class="repair-comment">${status.comment}</span>` : ''}
                </div>
                ${status.status === 'repairing' ? `
                    <div class="repair-actions">
                        <button class="mark-fixed-btn" data-type="${type}" data-number="${number}">
                            <i class="fas fa-check"></i> Исправлено
                        </button>
                        <button class="mark-warehouse-btn" data-type="${type}" data-number="${number}">
                            <i class="fas fa-warehouse"></i> Замена
                        </button>
                        <button class="cancel-repair-btn" data-type="${type}" data-number="${number}">
                            <i class="fas fa-times"></i> Отменить
                        </button>
                    </div>
                ` : `
                    <div class="repair-actions">
                        <button class="remove-repair-btn" data-type="${type}" data-number="${number}">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                `}
            </div>
        `
    }
    
    if (yandexList) {
        yandexList.innerHTML = state.repairs.yandex.map(number => createRepairElement('yandex', number)).join('')
    }
    
    if (sunrentList) {
        sunrentList.innerHTML = state.repairs.sunrent.map(number => createRepairElement('sunrent', number)).join('')
    }

    document.querySelectorAll('.mark-fixed-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const type = button.dataset.type
            const number = button.dataset.number
            markRepairFixed(type, number)
        })
    })

    document.querySelectorAll('.mark-warehouse-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const type = button.dataset.type
            const number = button.dataset.number
            const comment = prompt('Укажите причину замены:')
            if (comment !== null) {
                markRepairToWarehouse(type, number, comment)
            }
        })
    })

    document.querySelectorAll('.cancel-repair-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (confirm('Вы уверены, что хотите отменить добавление этого самоката на исправление?')) {
                const type = button.dataset.type
                const number = button.dataset.number
                removeRepair(type, number)
            }
        })
    })

    document.querySelectorAll('.remove-repair-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (confirm('Вы уверены, что хотите удалить этот самокат из списка исправлений?')) {
                const type = button.dataset.type
                const number = button.dataset.number
                removeRepair(type, number)
            }
        })
    })
}

function initializeInputHandlers() {
    document.querySelectorAll('.add-repair-btn').forEach(button => {
        button.removeEventListener('click', handleAddRepair)
        button.addEventListener('click', handleAddRepair)
    })
    
    document.querySelectorAll('.repair-input').forEach(input => {
        input.removeEventListener('keypress', handleRepairInput)
        input.addEventListener('keypress', handleRepairInput)
    })
}

function handleAddRepair(e) {
    const type = e.target.closest('.add-repair-btn').dataset.type
    const input = document.getElementById(`${type}RepairInput`)
    const number = input.value.trim()
    
    if (number) {
        addRepair(type, number)
        input.value = ''
        updateRepairsList()
    }
}

function handleRepairInput(e) {
    if (e.key === 'Enter') {
        const type = e.target.id.replace('RepairInput', '')
        const number = e.target.value.trim()
        
        if (number) {
            addRepair(type, number)
            e.target.value = ''
            updateRepairsList()
        }
    }
}

function initializeEventListeners() {
    const startBtn = document.getElementById('startShift')
    const endBtn = document.getElementById('endShift')
    
    if (startBtn) {
        startBtn.addEventListener('click', startShift)
    }
    
    if (endBtn) {
        endBtn.addEventListener('click', endShift)
    }
    
    document.querySelectorAll('.parking-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            selectParking(tab.dataset.parking)
        })
    })
    
    document.querySelectorAll('.select-parking').forEach(button => {
        button.addEventListener('click', (e) => {
            const parkingId = e.target.closest('.parking-card').id
            selectParking(parkingId)
        })
    })
    
    document.querySelectorAll('.counter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const counter = e.target.closest('.counter-group')
            const parkingId = counter.closest('.parking-card').id
            const type = counter.classList.contains('yandex') ? 'yandex' : 'sunrent'
            const delta = button.classList.contains('plus') ? 1 : -1
            
            updateScooterCount(parkingId, type, delta)
        })
    })
    
    initializeInputHandlers()
    
    document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-replacement')
        if (removeBtn) {
            const type = removeBtn.dataset.type
            const number = removeBtn.dataset.number
            removeRepair(type, number)
            updateRepairsList()
        }
    })
    
    document.addEventListener('click', (e) => {
        const markFixedBtn = e.target.closest('.mark-fixed-btn')
        if (markFixedBtn) {
            const type = markFixedBtn.dataset.type
            const number = markFixedBtn.dataset.number
            markRepairFixed(type, number)
            updateRepairsList()
        }
    })
}

// --- Переключение темы ---
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    document.getElementById('toggleThemeBtn').textContent = theme === 'dark' ? '☀️' : '🌙'
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light'
    setTheme(current === 'dark' ? 'light' : 'dark')
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const requiredElements = [
            'startShift',
            'endShift',
            'shiftTimer',
            'totalScooters',
            'currentRate',
            'activeEarnings',
            'historyList',
            'totalShifts',
            'totalEarnings'
        ]

        const missingElements = requiredElements.filter(id => !document.getElementById(id))
        if (missingElements.length > 0) {
            throw new Error(`Отсутствуют необходимые элементы: ${missingElements.join(', ')}`)
        }

        if (window.Telegram && window.Telegram.WebApp) {
            try {
                const tg = window.Telegram.WebApp
                tg.expand()
                tg.enableClosingConfirmation()
                
                const themeParams = tg.themeParams || {}
                document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#ffffff')
                document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000')
                document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#999999')
                document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#2481cc')
                document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#2481cc')
                document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff')
            } catch (tgError) {
                console.warn('Ошибка инициализации Telegram WebApp:', tgError)
            }
        }
        
        initializeParkingData()
        
        try {
            loadState()
        } catch (loadError) {
            console.error('Ошибка загрузки состояния:', loadError)
            state = {
                isShiftActive: false,
                startTime: null,
                selectedParking: null,
                parkingData: {},
                shiftHistory: [],
                repairs: { yandex: [], sunrent: [] },
                repairStatuses: { yandex: {}, sunrent: {} }
            }
            initializeParkingData()
        }
        
        try {
            initializeEventListeners()
        } catch (eventError) {
            console.error('Ошибка инициализации обработчиков событий:', eventError)
            throw new Error('Не удалось инициализировать обработчики событий')
        }
        
        try {
            updateUI()
        } catch (uiError) {
            console.error('Ошибка обновления интерфейса:', uiError)
            throw new Error('Не удалось обновить интерфейс')
        }
        
        setInterval(saveState, 5000)
        
        const splashScreen = document.querySelector('.splash-screen')
        if (splashScreen) {
            setTimeout(() => {
                splashScreen.style.display = 'none'
            }, 1000)
        }
    } catch (error) {
        console.error('Критическая ошибка при инициализации приложения:', error)
        // Показываем более информативное сообщение об ошибке
        const errorMessage = `Произошла ошибка при инициализации приложения: ${error.message}. Пожалуйста, перезагрузите страницу.`
        alert(errorMessage)
        
        // Пытаемся показать базовый интерфейс даже при ошибке
        const splashScreen = document.querySelector('.splash-screen')
        if (splashScreen) {
            splashScreen.style.display = 'none'
        }
    }
})

function deleteShift(index) {
    if (confirm('Вы уверены, что хотите удалить эту смену?')) {
        // Удаляем смену из массива истории
        state.shiftHistory.splice(index, 1)
        
        // Сохраняем обновленное состояние
        saveState()
        
        // Обновляем отображение истории и общей статистики
        updateHistoryDisplay()
        updateTotalStats()
        
        // Принудительно обновляем localStorage
        localStorage.setItem('scooterAppState', JSON.stringify(state))
    }
}

function formatParkingName(parkingId) {
    const parkingNames = {
        'beta': 'Бета',
        'gum': 'ГУМ',
        'vefa': 'Вефа',
        'medical': 'Медицинский',
        'polytech': 'Политех',
        'yuzhka': 'Южка',
        'repairs': 'Исправления и замены'
    }
    
    return parkingNames[parkingId] || parkingId
}

function removeRepair(type, scooterNumber) {
    if (!state.isShiftActive) return

    const index = state.repairs[type].indexOf(scooterNumber)
    if (index > -1) {
        // Сохраняем статус перед удалением
        const status = state.repairStatuses[type][scooterNumber]?.status

        // Удаляем из списка исправлений
        state.repairs[type].splice(index, 1)
        // Удаляем статус
        delete state.repairStatuses[type][scooterNumber]

        if (status === 'fixed') {
            // Если самокат был исправлен, убираем его из парковки
            const parkings = Object.keys(state.parkingData)
            if (parkings.length > 0) {
                const targetParking = state.selectedParking || parkings[0]
                if (state.parkingData[targetParking] && state.parkingData[targetParking][type] > 0) {
                    state.parkingData[targetParking][type]--
                }
            }
        }
        // Не нужно повторно удалять для warehouse!

        updateParkingCounters()
        updateTotalScooters()
        updateRepairsList()
        saveState()
    }
}