// static/js/devices.js
let currentRoomId = null, currentRoomName = null;

async function loadHomes() {
    const res = await fetch('/api/homes');
    const homes = await res.json();
    const container = document.getElementById('homes-list');
    container.innerHTML = '';
    if (!homes.length) { container.innerHTML = '<div class="text-muted p-3">Немає будинків</div>'; return; }
    homes.forEach(h => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-menu btn w-100 text-start';
        btn.innerHTML = `<i class="fas fa-building me-2"></i> ${escapeHtml(h.address)}`;
        btn.onclick = () => {
            document.querySelectorAll('#homes-list .sidebar-menu').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadRooms(h.id_home);
        };
        container.appendChild(btn);
    });
    const select = document.getElementById('roomHomeSelect');
    select.innerHTML = '';
    homes.forEach(h => { const opt = document.createElement('option'); opt.value = h.id_home; opt.textContent = h.address; select.appendChild(opt); });
}

async function loadRooms(homeId) {
    const res = await fetch(`/api/rooms/${homeId}`);
    const rooms = await res.json();
    const container = document.getElementById('rooms-list');
    container.innerHTML = '';
    if (!rooms.length) { container.innerHTML = '<div class="text-muted p-3">Немає кімнат</div>'; return; }
    rooms.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-menu btn w-100 text-start';
        btn.innerHTML = `<i class="fas fa-door-closed me-2"></i> ${escapeHtml(r.name)}`;
        btn.onclick = () => {
            document.querySelectorAll('#rooms-list .sidebar-menu').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadDevices(r.id_room, r.name);
        };
        container.appendChild(btn);
    });
}

async function loadDevices(roomId, roomName) {
    currentRoomId = roomId;
    currentRoomName = roomName;
    const res = await fetch(`/api/devices/${roomId}`);
    const devices = await res.json();
    const container = document.getElementById('devices-list');
    container.innerHTML = '';
    if (!devices.length) {
        container.innerHTML = `<div class="text-muted text-center p-3">📭 Немає пристроїв у кімнаті "${escapeHtml(roomName)}"</div>`;
        return;
    }
    for (let dev of devices) {
        const sensorsRes = await fetch(`/api/device/${dev.id_device}/sensors`);
        let sensors = await sensorsRes.json();
        let sensorsHtml = '';
        if (sensors.length) {
            sensors.forEach(s => {
                let cls = '';
                if (s.type === 'Temperature') cls = 'sensor-temperature';
                else if (s.type === 'Humidity') cls = 'sensor-humidity';
                else if (s.type === 'Motion') cls = 'sensor-motion';
                else if (s.type === 'WaterLeak') cls = 'sensor-water';
                else cls = 'sensor-temperature';
                sensorsHtml += `<span class="sensor-badge ${cls} me-1">${getSensorIcon(s.type)} ${s.type}</span>`;
            });
        } else {
            sensorsHtml = '<small class="text-muted">📡 Немає сенсорів</small>';
        }
        const statusClass = dev.status ? 'status-on' : 'status-off';
        const statusText = dev.status ? 'Увімкнено' : 'Вимкнено';
        const div = document.createElement('div');
        div.className = 'device-card card p-3';
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div><strong><i class="fas fa-microchip"></i> ${escapeHtml(dev.name)}</strong><br>
                <span class="status-badge ${statusClass}">${statusText}</span>
                <div class="mt-1">${sensorsHtml}</div></div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="toggleDevice(${dev.id_device}, ${dev.status})"><i class="fas fa-power-off"></i> Змінити</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDevice(${dev.id_device}, '${escapeHtml(dev.name)}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
        container.appendChild(div);
    }
}

async function toggleDevice(deviceId, currentStatus) {
    const newStatus = currentStatus ? 0 : 1;
    const res = await fetch('/api/device/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, current_status: currentStatus })
    });
    if (res.ok) { loadDevices(currentRoomId, currentRoomName); showToast('Статус змінено'); }
    else showToast('Помилка', 'danger');
}

async function deleteDevice(deviceId, name) {
    if (confirm(`Видалити пристрій "${name}"?`)) {
        const res = await fetch(`/api/device/delete/${deviceId}`, { method: 'DELETE' });
        if (res.ok) { loadDevices(currentRoomId, currentRoomName); showToast('Пристрій видалено'); }
        else showToast('Помилка', 'danger');
    }
}

async function addDevice() {
    const name = document.getElementById('device-name').value.trim();
    const status = parseInt(document.getElementById('device-status').value);
    const sensorType = document.getElementById('sensor-type').value;
    if (!name || !currentRoomId) { showToast('Заповніть назву і виберіть кімнату', 'warning'); return; }
    const res = await fetch('/api/device/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: currentRoomId, name, status, sensor_type: sensorType })
    });
    if (res.ok) {
        document.getElementById('device-name').value = '';
        document.getElementById('sensor-type').value = '';
        loadDevices(currentRoomId, currentRoomName);
        showToast('Пристрій додано');
    } else showToast('Помилка', 'danger');
}

async function createHome() {
    const address = document.getElementById('newHomeAddress').value.trim();
    if (!address) { showToast('Введіть адресу', 'warning'); return; }
    const res = await fetch('/api/home/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
    if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('addHomeModal')).hide(); loadHomes(); showToast('Будинок додано'); }
    else showToast('Помилка', 'danger');
}

async function createRoom() {
    const homeId = document.getElementById('roomHomeSelect').value;
    const name = document.getElementById('newRoomName').value.trim();
    if (!name) { showToast('Введіть назву кімнати', 'warning'); return; }
    const res = await fetch('/api/room/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ home_id: parseInt(homeId), name }) });
    if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide(); document.getElementById('newRoomName').value = ''; loadHomes(); showToast('Кімнату додано'); }
    else showToast('Помилка', 'danger');
}

document.addEventListener('DOMContentLoaded', loadHomes);