// ============================================
// ALERTS.JS — Price & Technical Alert System
// ============================================

const Alerts = (() => {
    let alerts = JSON.parse(localStorage.getItem('bb_alerts') || '[]');
    let history = JSON.parse(localStorage.getItem('bb_alerts_history') || '[]');
    let checkInterval = null;

    function save() {
        localStorage.setItem('bb_alerts', JSON.stringify(alerts));
        localStorage.setItem('bb_alerts_history', JSON.stringify(history));
    }

    function render(container) {
        container.innerHTML = `
            <div class="alerts-view">
                <div class="alerts-header">
                    <h2>ALERTS MANAGER</h2>
                    <span style="color:var(--gray-light);font-size:11px;">${alerts.length} active</span>
                </div>
                <div class="alerts-form-row">
                    <input type="text" class="alert-ticker" id="alert-ticker" placeholder="TICKER">
                    <select id="alert-type">
                        <option value="above">Price Above</option>
                        <option value="below">Price Below</option>
                        <option value="rsi-high">RSI > 70 (Overbought)</option>
                        <option value="rsi-low">RSI < 30 (Oversold)</option>
                        <option value="change-up">Daily Change > %</option>
                        <option value="change-down">Daily Change < -%</option>
                    </select>
                    <input type="number" class="alert-value" id="alert-value" placeholder="Value" step="0.01">
                    <button class="btn-terminal" onclick="Alerts.add()">+ ADD ALERT</button>
                </div>
                <div class="section-header">ACTIVE ALERTS</div>
                <div id="alerts-active-list"></div>
                <div class="section-header" style="margin-top:12px;">TRIGGERED HISTORY</div>
                <div id="alerts-history-list"></div>
            </div>`;

        renderAlertsList(container);
        renderHistoryList(container);

        // Start checking
        if (!checkInterval) {
            checkInterval = setInterval(checkAlerts, 30000);
        }
    }

    function renderAlertsList(container) {
        const el = container.querySelector('#alerts-active-list');
        if (!el) return;

        if (!alerts.length) {
            el.innerHTML = '<div class="empty-state" style="padding:12px"><p>No active alerts. Add one above.</p></div>';
            return;
        }

        el.innerHTML = alerts.map(function(a, i) {
            var typeLabel = { above: '>', below: '<', 'rsi-high': 'RSI >', 'rsi-low': 'RSI <', 'change-up': 'Chg% >', 'change-down': 'Chg% <' }[a.type] || a.type;
            return '<div class="alert-item">' +
                '<div class="alert-info">' +
                '<span class="alert-ticker-label">' + a.ticker + '</span>' +
                '<span class="alert-type-label">' + typeLabel + '</span>' +
                '<span class="alert-value-label">' + a.value + '</span>' +
                '</div>' +
                '<div>' +
                '<span style="color:var(--gray);font-size:10px;margin-right:8px;">' + new Date(a.created).toLocaleDateString() + '</span>' +
                '<button class="btn-terminal btn-sm btn-danger" onclick="Alerts.remove(' + i + ')">✕</button>' +
                '</div></div>';
        }).join('');
    }

    function renderHistoryList(container) {
        const el = container.querySelector('#alerts-history-list');
        if (!el) return;

        if (!history.length) {
            el.innerHTML = '<div style="padding:8px;color:var(--gray);font-size:11px;">No triggered alerts yet.</div>';
            return;
        }

        el.innerHTML = history.slice(0, 20).map(function(h) {
            return '<div class="alert-item alert-triggered">' +
                '<div class="alert-info">' +
                '<span class="alert-ticker-label">' + h.ticker + '</span>' +
                '<span class="alert-type-label">' + h.type + '</span>' +
                '<span class="alert-value-label">Target: ' + h.value + ' → Actual: ' + (h.actual || '--') + '</span>' +
                '</div>' +
                '<span style="color:var(--amber);font-size:10px;">' + new Date(h.triggered).toLocaleString() + '</span>' +
                '</div>';
        }).join('');
    }

    function add() {
        var ticker = (document.getElementById('alert-ticker').value || '').toUpperCase().trim();
        var type = document.getElementById('alert-type').value;
        var value = parseFloat(document.getElementById('alert-value').value);

        if (!ticker) { Terminal.notify('Enter a ticker', 'error'); return; }
        if (isNaN(value) && !type.startsWith('rsi')) { Terminal.notify('Enter a value', 'error'); return; }

        // Default RSI values
        if (type === 'rsi-high' && isNaN(value)) value = 70;
        if (type === 'rsi-low' && isNaN(value)) value = 30;

        alerts.push({
            ticker: ticker,
            type: type,
            value: value,
            created: Date.now(),
            id: Date.now().toString(36)
        });
        save();
        Terminal.notify('Alert added: ' + ticker + ' ' + type + ' ' + value, 'success');

        // Re-render if panel is open
        var view = document.querySelector('.alerts-view');
        if (view) {
            renderAlertsList(view.closest('.panel-content') || view.parentElement);
        }
    }

    function remove(idx) {
        alerts.splice(idx, 1);
        save();
        var view = document.querySelector('.alerts-view');
        if (view) {
            renderAlertsList(view.closest('.panel-content') || view.parentElement);
        }
    }

    function quickAdd(ticker) {
        var value = prompt('Alert price for ' + ticker + ':');
        if (!value) return;
        var price = parseFloat(value);
        if (isNaN(price)) return;

        DataService.getQuote(ticker).then(function(data) {
            var type = price > data.price ? 'above' : 'below';
            alerts.push({
                ticker: ticker,
                type: type,
                value: price,
                created: Date.now(),
                id: Date.now().toString(36)
            });
            save();
            Terminal.notify('Alert: ' + ticker + ' ' + type + ' $' + price, 'success');
        });
    }

    async function checkAlerts() {
        var triggered = [];
        var remaining = [];

        for (var i = 0; i < alerts.length; i++) {
            var a = alerts[i];
            try {
                var data = await DataService.getQuote(a.ticker);
                if (!data) { remaining.push(a); continue; }

                var fire = false;
                var actual = data.price;

                if (a.type === 'above' && data.price >= a.value) fire = true;
                if (a.type === 'below' && data.price <= a.value) fire = true;
                if (a.type === 'change-up' && (data.changePercent || 0) >= a.value) { fire = true; actual = data.changePercent; }
                if (a.type === 'change-down' && (data.changePercent || 0) <= -a.value) { fire = true; actual = data.changePercent; }

                if (fire) {
                    triggered.push({ ticker: a.ticker, type: a.type, value: a.value, actual: actual, triggered: Date.now() });
                    sendDesktopNotification(a.ticker + ' Alert', a.type + ' ' + a.value + ' (current: ' + actual + ')');
                } else {
                    remaining.push(a);
                }
            } catch(e) {
                remaining.push(a);
            }
        }

        if (triggered.length > 0) {
            history = triggered.concat(history).slice(0, 100);
            alerts = remaining;
            save();
        }
    }

    function sendDesktopNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: body, icon: '📊' });
        }
        Terminal.notify('🔔 ' + title + ': ' + body, 'info');
    }

    function getActiveCount() {
        return alerts.length;
    }

    return { render, add, remove, quickAdd, checkAlerts, getActiveCount };
})();
