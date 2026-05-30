// static/js/dashboard.js
let allSensorsCache = [];
let roomsDataCache = new Map();

async function fetchAllData() {
    try {
        const sensorsRes = await fetch('/api/sensors');
        allSensorsCache = await sensorsRes.json();
        let lastValues = {};
        for (let sensor of allSensorsCache) {
            try {
                const resp = await fetch(`/api/sensor/${sensor.id_sensor}/data?period=1h`);
                const result = await resp.json();
                let data = result.data || result;
                if (data && data.length) {
                    lastValues[sensor.id_sensor] = { value: data[0]['Значення'] || data[0].value, time: data[0]['Час'] || data[0].time };
                } else lastValues[sensor.id_sensor] = null;
            } catch(e) { console.warn(e); }
        }
        let roomsMap = new Map();
        for (let sensor of allSensorsCache) {
            const room = sensor.room_name;
            if (!roomsMap.has(room)) roomsMap.set(room, { roomName: room, sensors: [], address: sensor.home_address || '' });
            roomsMap.get(room).sensors.push({
                type: sensor.type, id: sensor.id_sensor, device: sensor.device_name,
                lastValue: lastValues[sensor.id_sensor]?.value ?? null,
                lastTime: lastValues[sensor.id_sensor]?.time ?? null
            });
        }
        roomsDataCache = roomsMap;
        renderRoomsGrid(roomsMap);
        document.getElementById('lastUpdateTime').innerText = new Date().toLocaleTimeString('uk-UA');
        await loadRecentEvents();
    } catch(err) {
        console.error(err);
        document.getElementById('roomsGrid').innerHTML = `<div class="col-12 alert alert-danger">Помилка завантаження даних</div>`;
    }
}

function renderRoomsGrid(roomsMap) {
    const container = document.getElementById('roomsGrid');
    if (!roomsMap.size) { container.innerHTML = `<div class="col-12 text-center text-muted py-5">🚫 Немає кімнат з сенсорами</div>`; return; }
    let html = '';
    for (let [roomName, roomData] of roomsMap) {
        let temp = null, hum = null, motion = null, water = null, power = null, contact = null, light = null, air = null;
        for (let s of roomData.sensors) {
            if (s.type === 'Temperature') temp = s.lastValue;
            else if (s.type === 'Humidity') hum = s.lastValue;
            else if (s.type === 'Motion') motion = s.lastValue;
            else if (s.type === 'WaterLeak') water = s.lastValue;
            else if (s.type === 'PowerMeter') power = s.lastValue;
            else if (s.type === 'Contact') contact = s.lastValue;
            else if (s.type === 'Light') light = s.lastValue;
            else if (s.type === 'AirQuality') air = s.lastValue;
        }
        let tempClass = 'temp-normal';
        if (temp !== null) { if (temp > 27) tempClass = 'temp-high'; else if (temp < 18) tempClass = 'temp-low'; }
        let sensorsHtml = '';
        if (temp !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">🌡️</span><div class="sensor-label">Температура</div><div class="sensor-value ${tempClass}">${temp}<span class="sensor-unit">°C</span></div></div>`;
        if (hum !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">💧</span><div class="sensor-label">Вологість</div><div class="sensor-value">${hum}<span class="sensor-unit">%</span></div></div>`;
        if (motion !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">🏃</span><div class="sensor-label">Рух</div><div class="sensor-value">${motion == 1 ? 'Виявлено' : 'Спокій'}</div></div>`;
        if (water !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">💦</span><div class="sensor-label">Витік</div><div class="sensor-value ${water == 1 ? 'text-danger' : ''}">${water == 1 ? '⚠️ ВИТІК' : 'Сухо'}</div></div>`;
        if (power !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">⚡</span><div class="sensor-label">Потужність</div><div class="sensor-value">${power}<span class="sensor-unit">W</span></div></div>`;
        if (contact !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">🚪</span><div class="sensor-label">Контакт</div><div class="sensor-value">${contact == 1 ? 'Відкрито' : 'Закрито'}</div></div>`;
        if (light !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">💡</span><div class="sensor-label">Освітлення</div><div class="sensor-value">${light}<span class="sensor-unit">lux</span></div></div>`;
        if (air !== null) sensorsHtml += `<div class="sensor-tile"><span class="sensor-icon">🌬️</span><div class="sensor-label">CO₂</div><div class="sensor-value">${air}<span class="sensor-unit">ppm</span></div></div>`;
        if (!sensorsHtml) sensorsHtml = '<div class="text-muted small w-100 text-center p-2">Немає даних сенсорів</div>';

        html += `<div class="col-md-6 col-xl-4"><div class="room-card" data-room-name="${escapeHtml(roomName)}"><div class="card-header-custom"><div class="room-name"><span class="room-icon">🏠</span> ${escapeHtml(roomName)}${roomData.address ? `<span class="badge bg-light text-dark ms-2">${escapeHtml(roomData.address.split(',')[0])}</span>` : ''}</div></div><div class="sensor-grid">${sensorsHtml}</div></div></div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll('.room-card').forEach(card => card.addEventListener('click', () => showRoomDetails(card.getAttribute('data-room-name'))));
}

function showRoomDetails(roomName) {
    const data = roomsDataCache.get(roomName);
    if (!data) return;
    let details = '<div class="detail-sensor-list">';
    for (let s of data.sensors) {
        let value = s.lastValue !== null ? s.lastValue : '—';
        let unit = '';
        if (s.type === 'Temperature') unit = '°C';
        else if (s.type === 'Humidity') unit = '%';
        else if (s.type === 'PowerMeter') unit = 'W';
        else if (s.type === 'Light') unit = 'lux';
        else if (s.type === 'AirQuality') unit = 'ppm';
        let display = '';
        if (s.type === 'Motion') display = s.lastValue == 1 ? 'Виявлено' : 'Спокій';
        else if (s.type === 'WaterLeak') display = s.lastValue == 1 ? 'ВИТІК' : 'Сухо';
        else if (s.type === 'Contact') display = s.lastValue == 1 ? 'Відкрито' : 'Закрито';
        else display = value + (unit ? ' ' + unit : '');
        details += `<div class="detail-item"><div><span style="font-size:1.5rem">${getSensorIcon(s.type)}</span> <strong>${s.type}</strong><br><small class="text-muted">${s.device}</small></div><div class="text-end"><span class="fw-bold fs-5">${display}</span><br><small>${s.lastTime || 'н/д'}</small></div></div>`;
    }
    details += '</div>';
    document.getElementById('modalRoomName').innerHTML = `📋 ${escapeHtml(roomName)}`;
    document.getElementById('modalRoomBody').innerHTML = details;
    new bootstrap.Modal(document.getElementById('roomDetailModal')).show();
}

async function loadRecentEvents() {
    try {
        const res = await fetch('/api/events');
        const events = await res.json();
        const container = document.getElementById('eventsList');
        if (!events.length) { container.innerHTML = '<div class="text-muted text-center py-2">Немає подій</div>'; return; }
        let list = '';
        events.slice(0,5).forEach(ev => {
            list += `<div class="list-group-item d-flex justify-content-between align-items-start border-0 ps-0"><div><i class="fas fa-clock me-2 text-secondary"></i> ${escapeHtml(ev['Час'] || ev.time || '')}</div><div class="fw-semibold">${escapeHtml(ev['Пристрій'] || ev.device || '')}</div><div class="text-muted small">${escapeHtml(ev['Подія'] || ev.description || '')}</div></div>`;
        });
        container.innerHTML = list;
    } catch(e) { console.warn(e); }
}

setInterval(fetchAllData, 30000);
document.addEventListener('DOMContentLoaded', fetchAllData);