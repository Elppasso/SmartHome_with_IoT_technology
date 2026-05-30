// static/js/common.js
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, type = 'success') {
    const toastDiv = document.createElement('div');
    toastDiv.className = `toast-message toast-${type}`;
    toastDiv.innerText = message;
    document.body.appendChild(toastDiv);
    setTimeout(() => toastDiv.remove(), 3000);
}

function getSensorIcon(type) {
    const icons = {
        'Temperature': '🌡️', 'Humidity': '💧', 'Motion': '🏃',
        'WaterLeak': '💦', 'PowerMeter': '⚡', 'Contact': '🚪',
        'Light': '💡', 'AirQuality': '🌬️'
    };
    return icons[type] || '📡';
}

function formatStatus(status) {
    if (status === 1 || status === '1' || status === true) {
        return '<span class="status-badge status-on">🟢 Увімкнено</span>';
    }
    return '<span class="status-badge status-off">🔴 Вимкнено</span>';
}