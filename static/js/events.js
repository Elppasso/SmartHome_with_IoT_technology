// static/js/events.js
let updateInterval = null;

async function loadEvents() {
    try {
        const response = await fetch('/api/all-events');
        const events = await response.json();
        const tbody = document.getElementById('events-body');

        if (!events || events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Немає подій</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        events.forEach(event => {
            const row = document.createElement('tr');
            row.className = 'event-row';
            row.innerHTML = `
                <td class="event-time">${escapeHtml(event['Час'] || event['time'] || '-')}</td>
                <td><strong>${escapeHtml(event['Пристрій'] || event['device'] || '-')}</strong></td>
                <td>${escapeHtml(event['Подія'] || event['description'] || '-')}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Помилка:', error);
        document.getElementById('events-body').innerHTML = 
            '<tr><td colspan="3" class="text-danger text-center py-4">Помилка завантаження подій</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    updateInterval = setInterval(loadEvents, 10000);
});

window.addEventListener('beforeunload', function() {
    if (updateInterval) clearInterval(updateInterval);
});