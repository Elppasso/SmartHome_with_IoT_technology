// static/js/sensors.js
// Повністю функціональний код для сторінки моніторингу сенсорів

let currentSensorId = null;
let currentChart = null;
let currentPeriod = '24h';
let allSensors = [];
let chartData = [];

const sensorConfig = {
    'Temperature': { icon: '🌡️', unit: '°C', name: 'Температура', color: '#dc3545', bg: 'rgba(220,53,69,0.1)' },
    'Humidity':    { icon: '💧', unit: '%',   name: 'Вологість',    color: '#0dcaf0', bg: 'rgba(13,202,240,0.1)' },
    'Motion':      { icon: '🏃', unit: '',    name: 'Рух',          color: '#ffc107', bg: 'rgba(255,193,7,0.1)' },
    'WaterLeak':   { icon: '💦', unit: '',    name: 'Витік води',   color: '#0d6efd', bg: 'rgba(13,110,253,0.1)' },
    'PowerMeter':  { icon: '⚡', unit: 'W',   name: 'Енергія',      color: '#198754', bg: 'rgba(25,135,84,0.1)' },
    'Contact':     { icon: '🚪', unit: '',    name: 'Контакт',      color: '#fd7e14', bg: 'rgba(253,126,20,0.1)' },
    'Light':       { icon: '💡', unit: 'lux', name: 'Освітлення',   color: '#ffc107', bg: 'rgba(255,193,7,0.1)' },
    'AirQuality':  { icon: '🌬️', unit: 'ppm', name: 'Якість повітря', color: '#20c997', bg: 'rgba(32,201,151,0.1)' },
    'Smoke':       { icon: '🔥', unit: '',    name: 'Дим',          color: '#fd7e14', bg: 'rgba(253,126,20,0.1)' },
    'Pressure':    { icon: '📊', unit: 'hPa', name: 'Тиск',         color: '#6c757d', bg: 'rgba(108,117,125,0.1)' }
};

function getConfig(type) { return sensorConfig[type] || { icon: '📡', unit: '', name: type, color: '#6c757d', bg: 'rgba(108,117,125,0.1)' }; }
function getUnit(type) { return getConfig(type).unit; }
function getSensorColor(type) { return getConfig(type).color; }

function getBadgeClass(type) {
    const map = {
        'Temperature': 'badge-temp',
        'Humidity': 'badge-humidity',
        'Motion': 'badge-motion',
        'WaterLeak': 'badge-water',
        'PowerMeter': 'badge-power'
    };
    return map[type] || 'badge-secondary';
}

function getCardClass(type) {
    const map = {
        'Temperature': 'sensor-temperature',
        'Humidity': 'sensor-humidity',
        'Motion': 'sensor-motion',
        'WaterLeak': 'sensor-waterleak',
        'PowerMeter': 'sensor-powermeter',
        'Contact': 'sensor-contact',
        'Light': 'sensor-light',
        'AirQuality': 'sensor-airquality'
    };
    return map[type] || '';
}

function getStatusText(type, value) {
    if (type === 'Temperature') {
        if (value > 28) return 'Висока';
        if (value < 18) return 'Низька';
        return 'Норма';
    }
    if (type === 'Humidity') {
        if (value > 70) return 'Висока';
        if (value < 30) return 'Низька';
        return 'Норма';
    }
    if (type === 'Motion') return value > 0.5 ? 'Виявлено рух' : 'Спокій';
    if (type === 'WaterLeak') return value > 0.5 ? 'ВИТІК!' : 'Сухо';
    if (type === 'Contact') return value > 0.5 ? 'Відкрито' : 'Закрито';
    if (type === 'Light') return value > 50 ? 'Світло' : 'Темно';
    return '';
}

function getStatusClass(type, value) {
    if (type === 'Temperature') {
        if (value > 28) return 'text-danger';
        if (value < 18) return 'text-primary';
        return 'text-success';
    }
    if (type === 'WaterLeak' && value > 0.5) return 'text-danger fw-bold';
    return '';
}

// ========== ЗАВАНТАЖЕННЯ ТА ФІЛЬТРАЦІЯ ==========
async function loadSensors() {
    try {
        const res = await fetch('/api/sensors');
        allSensors = await res.json();
        document.getElementById('sensor-count').innerText = allSensors.length;
        updateFilterButtons();
        applyFilter();
    } catch (e) {
        console.error(e);
        document.getElementById('sensors-list').innerHTML = '<div class="text-danger text-center p-3">Помилка завантаження</div>';
    }
}

function updateFilterButtons() {
    const types = [...new Set(allSensors.map(s => s.type))];
    const container = document.getElementById('filter-buttons');
    container.innerHTML = `<button class="btn btn-sm btn-outline-secondary filter-btn active" data-type="all">Всі (${allSensors.length})</button>`;
    types.forEach(type => {
        const cnt = allSensors.filter(s => s.type === type).length;
        const cfg = getConfig(type);
        const btn = document.createElement('button');
        btn.textContent = `${cfg.icon} ${cfg.name} (${cnt})`;
        btn.className = 'btn btn-sm btn-outline-secondary filter-btn';
        btn.dataset.type = type;
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter();
        };
        container.appendChild(btn);
    });
}

function applyFilter() {
    const active = document.querySelector('.filter-btn.active')?.dataset.type || 'all';
    const filtered = active === 'all' ? allSensors : allSensors.filter(s => s.type === active);
    displaySensors(filtered);
}

function displaySensors(sensors) {
    const container = document.getElementById('sensors-list');
    container.innerHTML = '';
    if (!sensors.length) {
        container.innerHTML = '<div class="text-center p-4 text-muted">Немає сенсорів</div>';
        return;
    }
    sensors.forEach(s => {
        const cfg = getConfig(s.type);
        const cardClass = getCardClass(s.type);
        const div = document.createElement('div');
        div.className = `sensor-card card border-0 shadow-sm mb-2 ${cardClass}`;
        div.innerHTML = `
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="sensor-type-icon" style="font-size:24px">${cfg.icon}</span>
                        <strong>${cfg.name}</strong>
                        <br><small class="text-muted">${escapeHtml(s.device_name || '-')}</small>
                        <br><small class="text-muted">${escapeHtml(s.room_name || '-')}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${getBadgeClass(s.type)}">${s.type}</span>
                        <br><small class="text-muted">ID: ${s.id_sensor}</small>
                    </div>
                </div>
            </div>
        `;
        div.onclick = () => selectSensor(s.id_sensor, s.type, s.device_name);
        container.appendChild(div);
    });
}

// ========== ВИБІР СЕНСОРА ТА ЗАВАНТАЖЕННЯ ДАНИХ ==========
async function selectSensor(sensorId, sensorType, deviceName) {
    currentSensorId = sensorId;
    const cfg = getConfig(sensorType);
    document.getElementById('page-icon').innerText = cfg.icon;
    document.getElementById('selected-sensor-title').innerHTML = `${cfg.icon} ${cfg.name} - ${escapeHtml(deviceName)} (${cfg.unit})`;
    document.getElementById('sensor-info').style.display = 'none';
    document.getElementById('sensor-chart').style.display = 'block';
    
    // Скидаємо статистичні картки (вони будуть створені в loadSensorData)
    const statsRow = document.getElementById('stats-row');
    if (statsRow) statsRow.innerHTML = '';
    
    await loadSensorData(sensorId, sensorType);
}

async function loadSensorData(sensorId, sensorType) {
    try {
        const url = `/api/sensor/${sensorId}/data?period=${currentPeriod}`;
        const resp = await fetch(url);
        const result = await resp.json();
        let data = result.data || result;
        if (!Array.isArray(data)) data = [];
        const cfg = getConfig(sensorType);
        const unit = cfg.unit;

        if (!data.length) {
            document.getElementById('sensor-data-body').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Немає даних</td></tr>';
            if (currentChart) { currentChart.destroy(); currentChart = null; }
            return;
        }

        chartData = data;
        const values = data.map(d => parseFloat(d['Значення'] || d.value || 0)).filter(v => !isNaN(v));
        if (!values.length) return;

        const currentVal = values[0];
        const avgVal = values.reduce((a,b)=>a+b,0)/values.length;
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);

        // Додаємо статистичні картки, якщо вони ще не створені
        const statsRow = document.getElementById('stats-row');
        if (statsRow && statsRow.children.length === 0) {
            statsRow.innerHTML = `
                <div class="col-6 col-md-3"><div class="stat-card current"><div class="stat-label">ПОТОЧНЕ</div><div class="stat-value" id="current-value">--</div></div></div>
                <div class="col-6 col-md-3"><div class="stat-card avg"><div class="stat-label">СЕРЕДНЄ</div><div class="stat-value" id="avg-value">--</div></div></div>
                <div class="col-6 col-md-3"><div class="stat-card min"><div class="stat-label">МІНІМУМ</div><div class="stat-value" id="min-value">--</div></div></div>
                <div class="col-6 col-md-3"><div class="stat-card max"><div class="stat-label">МАКСИМУМ</div><div class="stat-value" id="max-value">--</div></div></div>
            `;
        }

        // Анімація
        const curEl = document.getElementById('current-value');
        if (curEl) {
            curEl.classList.add('value-up');
            setTimeout(() => curEl.classList.remove('value-up'), 500);
        }

        document.getElementById('current-value').innerHTML = `${currentVal}<span class="sensor-unit"> ${unit}</span>`;
        document.getElementById('avg-value').innerHTML = `${avgVal.toFixed(1)}<span class="sensor-unit"> ${unit}</span>`;
        document.getElementById('min-value').innerHTML = `${minVal.toFixed(1)}<span class="sensor-unit"> ${unit}</span>`;
        document.getElementById('max-value').innerHTML = `${maxVal.toFixed(1)}<span class="sensor-unit"> ${unit}</span>`;

        // Таблиця
        const tbody = document.getElementById('sensor-data-body');
        tbody.innerHTML = '';
        for (let i = 0; i < Math.min(data.length, 15); i++) {
            const item = data[i];
            const time = item['Час'] || item.time || '-';
            const val = parseFloat(item['Значення'] || item.value || 0);
            const statusText = getStatusText(sensorType, val);
            const statusClass = getStatusClass(sensorType, val);
            tbody.innerHTML += `<tr><td>${escapeHtml(time)}</td><td><strong>${val}</strong> ${unit}</td><td class="${statusClass}">${statusText}</td></tr>`;
        }

        // Графік
        const labels = [...data].reverse().map(d => { const t = d['Час'] || d.time || ''; return t.substring(11, 16); });
        const chartVals = [...data].reverse().map(d => parseFloat(d['Значення'] || d.value || 0));
        updateChart(labels, chartVals, sensorType, cfg);

        document.getElementById('last-update-time').innerHTML = `🕐 ${new Date().toLocaleTimeString('uk-UA')}`;
    } catch (err) {
        console.error('loadSensorData error:', err);
        document.getElementById('sensor-data-body').innerHTML = '<tr><td colspan="3" class="text-danger text-center">Помилка завантаження</td></tr>';
    }
}

function updateChart(labels, values, sensorType, cfg) {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    if (!labels.length) return;
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${cfg.name} (${cfg.unit})`,
                data: values,
                borderColor: cfg.color,
                backgroundColor: cfg.bg,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: cfg.color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} ${cfg.unit}` } }
            },
            scales: {
                y: { title: { display: true, text: `Значення (${cfg.unit})` } },
                x: { title: { display: true, text: 'Час' }, ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

// ========== ПЕРІОД, ЕКСПОРТ, ДРУК ==========
function changePeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) btn.classList.add('active');
    });
    if (currentSensorId) {
        const s = allSensors.find(s => s.id_sensor === currentSensorId);
        if (s) loadSensorData(currentSensorId, s.type);
    }
}

async function refreshData() {
    await loadSensors();
    if (currentSensorId) {
        const s = allSensors.find(s => s.id_sensor === currentSensorId);
        if (s) await loadSensorData(currentSensorId, s.type);
    }
    document.getElementById('countdown').innerText = '5';
}

function exportData() {
    if (!chartData.length) return;
    let csv = 'Час,Значення\n';
    chartData.forEach(d => {
        const time = d['Час'] || d.time || '';
        const val = d['Значення'] || d.value || '';
        csv += `"${time}",${val}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_${currentSensorId}_${new Date().toISOString().slice(0,19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function printChart() {
    const canvas = document.getElementById('sensorChart');
    if (!canvas) return;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Графік сенсора</title>
        <style>body{font-family:Arial;text-align:center;padding:20px} img{max-width:100%}</style>
        </head><body>
        <h3>${document.getElementById('selected-sensor-title').innerText}</h3>
        <img src="${canvas.toDataURL()}" style="max-width:100%">
        <p>${new Date().toLocaleString()}</p>
        </body></html>
    `);
    win.document.close();
    win.print();
}

// ========== АВТООНОВЛЕННЯ ТА ІНІЦІАЛІЗАЦІЯ ==========
let countdown = 5;
setInterval(() => {
    countdown--;
    if (countdown <= 0) {
        countdown = 5;
        refreshData();
    }
    document.getElementById('countdown').innerText = countdown;
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    loadSensors();
    const periodContainer = document.getElementById('period-buttons');
    if (periodContainer && periodContainer.children.length === 0) {
        periodContainer.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary period-btn" data-period="1h">1 година</button>
            <button class="btn btn-sm btn-outline-secondary period-btn active" data-period="24h">24 години</button>
            <button class="btn btn-sm btn-outline-secondary period-btn" data-period="7d">7 днів</button>
            <button class="btn btn-sm btn-outline-secondary period-btn" data-period="30d">30 днів</button>
        `;
    }
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.onclick = () => changePeriod(btn.dataset.period);
    });
});