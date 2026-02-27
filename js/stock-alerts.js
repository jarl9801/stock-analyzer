// ============================================
// ALERTS SYSTEM — Price Alerts for Stock Analyzer
// ============================================

class StockAlerts {
    constructor() {
        this.alerts = JSON.parse(localStorage.getItem('stock_alerts') || '[]');
        this.checkedPrices = {};
        this.init();
    }

    init() {
        // Verificar alertas cada 5 minutos
        setInterval(() => this.checkAllAlerts(), 5 * 60 * 1000);
        
        // Verificar inmediatamente al cargar
        this.checkAllAlerts();
        
        console.log('✅ StockAlerts initialized:', this.alerts.length, 'alerts');
    }

    // Agregar nueva alerta
    addAlert(ticker, targetPrice, type = 'above', note = '') {
        const alert = {
            id: Date.now().toString(),
            ticker: ticker.toUpperCase(),
            targetPrice: parseFloat(targetPrice),
            type, // 'above' o 'below'
            note,
            createdAt: new Date().toISOString(),
            triggered: false,
            triggeredAt: null
        };

        this.alerts.push(alert);
        this.saveAlerts();
        
        this.showNotification('Alerta creada', {
            body: `${ticker.toUpperCase()} a ${type === 'above' ? '$' + targetPrice : '$' + targetPrice}`,
            icon: '📈'
        });

        return alert;
    }

    // Eliminar alerta
    removeAlert(alertId) {
        this.alerts = this.alerts.filter(a => a.id !== alertId);
        this.saveAlerts();
    }

    // Verificar todas las alertas
    async checkAllAlerts() {
        const uniqueTickers = [...new Set(this.alerts.map(a => a.ticker))];
        
        for (const ticker of uniqueTickers) {
            try {
                const price = await this.fetchCurrentPrice(ticker);
                if (price) {
                    this.checkAlertsForTicker(ticker, price);
                }
            } catch (err) {
                console.error(`Error checking ${ticker}:`, err);
            }
        }
    }

    // Verificar alertas para un ticker específico
    checkAlertsForTicker(ticker, currentPrice) {
        const alertsForTicker = this.alerts.filter(a => 
            a.ticker === ticker && !a.triggered
        );

        alertsForTicker.forEach(alert => {
            const shouldTrigger = alert.type === 'above' 
                ? currentPrice >= alert.targetPrice
                : currentPrice <= alert.targetPrice;

            if (shouldTrigger) {
                this.triggerAlert(alert, currentPrice);
            }
        });
    }

    // Disparar alerta
    triggerAlert(alert, currentPrice) {
        alert.triggered = true;
        alert.triggeredAt = new Date().toISOString();
        alert.triggeredPrice = currentPrice;
        this.saveAlerts();

        // Notificación push
        this.showNotification('🎯 Alerta de Precio!', {
            body: `${alert.ticker} ${alert.type === 'above' ? 'subió' : 'bajó'} a $${currentPrice.toFixed(2)}`,
            tag: `alert-${alert.id}`,
            requireInteraction: true,
            data: { alert, currentPrice }
        });

        // Sonido de alerta
        this.playAlertSound();

        // Mostrar en UI
        this.showAlertInUI(alert, currentPrice);
    }

    // Obtener precio actual
    async fetchCurrentPrice(ticker) {
        // Usar la API existente del Stock Analyzer
        if (typeof fetchStockData === 'function') {
            try {
                const data = await fetchStockData(ticker);
                return data.price || data.currentPrice;
            } catch (e) {
                console.error('Error fetching price:', e);
            }
        }
        return null;
    }

    // Mostrar notificación
    showNotification(title, options = {}) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                ...options
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, options);
                }
            });
        }
    }

    // Sonido de alerta
    playAlertSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }

    // Mostrar alerta en UI
    showAlertInUI(alert, currentPrice) {
        const container = document.getElementById('alerts-container') || document.body;
        
        const alertEl = document.createElement('div');
        alertEl.className = 'stock-alert-toast';
        alertEl.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">🎯</div>
                <div class="alert-text">
                    <strong>${alert.ticker}</strong>
                    <span>${alert.type === 'above' ? 'subió' : 'bajó'} a $${currentPrice.toFixed(2)}</span>
                    ${alert.note ? `<small>${alert.note}</small>` : ''}
                </div>
                <button onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        container.appendChild(alertEl);
        
        setTimeout(() => {
            alertEl.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            alertEl.classList.remove('show');
            setTimeout(() => alertEl.remove(), 300);
        }, 5000);
    }

    // Guardar alertas
    saveAlerts() {
        localStorage.setItem('stock_alerts', JSON.stringify(this.alerts));
    }

    // Obtener alertas activas
    getActiveAlerts() {
        return this.alerts.filter(a => !a.triggered);
    }

    // Obtener alertas históricas
    getTriggeredAlerts() {
        return this.alerts.filter(a => a.triggered).sort((a, b) => 
            new Date(b.triggeredAt) - new Date(a.triggeredAt)
        );
    }

    // Limpiar alertas antiguas
    cleanOldAlerts(days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        this.alerts = this.alerts.filter(a => {
            if (!a.triggered) return true;
            return new Date(a.triggeredAt) > cutoff;
        });
        this.saveAlerts();
    }

    // Renderizar panel de alertas
    renderAlertsPanel() {
        const active = this.getActiveAlerts();
        const triggered = this.getTriggeredAlerts().slice(0, 10);
        
        return `
            <div class="alerts-panel">
                <div class="alerts-header">
                    <h3>🎯 Alertas de Precio</h3>
                    <button onclick="stockAlerts.cleanOldAlerts()">Limpiar</button>
                </div>
                
                <div class="alerts-section">
                    <h4>Activas (${active.length})</h4>
                    ${active.length === 0 ? '<p class="no-alerts">Sin alertas activas</p>' : 
                        active.map(a => `
                            <div class="alert-item" data-id="${a.id}">
                                <span class="alert-ticker">${a.ticker}</span>
                                <span class="alert-condition">
                                    ${a.type === 'above' ? '≥' : '≤'} $${a.targetPrice}
                                </span>
                                <button onclick="stockAlerts.removeAlert('${a.id}')">×</button>
                            </div>
                        `).join('')
                    }
                </div>
                
                ${triggered.length > 0 ? `
                <div class="alerts-section triggered">
                    <h4>Disparadas recientemente</h4>
                    ${triggered.map(a => `
                        <div class="alert-item triggered">
                            <span class="alert-ticker">${a.ticker}</span>
                            <span class="alert-price">$${a.triggeredPrice?.toFixed(2)}</span>
                            <span class="alert-date">${new Date(a.triggeredAt).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    }
}

// Instancia global
const stockAlerts = new StockAlerts();

// Exponer globalmente
window.stockAlerts = stockAlerts;

// Función helper para agregar alerta rápida
window.addPriceAlert = (ticker, price, type = 'above') => {
    return stockAlerts.addAlert(ticker, price, type);
};
