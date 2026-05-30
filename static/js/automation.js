// static/js/automation.js
async function loadRules() {
    try {
        const response = await fetch('/api/automation-rules');
        const rules = await response.json();
        const container = document.getElementById('rules-list');
        const now = new Date();
        document.getElementById('last-update').innerText = now.toLocaleTimeString('uk-UA');

        if (!rules || rules.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <p>📭 Немає налаштованих правил автоматизації</p>
                    <small>Правила створюються через SQL запити до бази даних</small>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        rules.forEach((rule, index) => {
            const card = document.createElement('div');
            card.className = 'card rule-card';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">
                                <span class="badge bg-primary me-2">#${index + 1}</span>
                                ${escapeHtml(rule['Користувач'] || 'Невідомий')}
                            </h6>
                        </div>
                    </div>
                    <div class="mt-2">
                        <div class="condition-badge mb-2">
                            <strong>🎯 Умова:</strong> ${escapeHtml(rule['Умова'] || '-')}
                        </div>
                        <div class="action-badge">
                            <strong>⚡ Дія:</strong> ${escapeHtml(rule['Дія'] || '-')}
                            → <strong>${escapeHtml(rule['Пристрій'] || '-')}</strong>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Помилка:', error);
        document.getElementById('rules-list').innerHTML = 
            '<div class="text-danger text-center p-3">Помилка завантаження правил</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadRules);