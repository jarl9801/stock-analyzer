// ============================================
// TERMINAL.JS — Main terminal controller
// ============================================

const Terminal = (() => {
    function init() {
        DataService;
        TickerBar.init();
        CommandBar.init();
        Panels.init();
        initKeyboard();
        initStatusBar();
        renderHome(document.getElementById('panel-1-content'));
        requestNotificationPermission();
    }

    function renderHome(container) {
        const indices = DataService.getMarketIndices();
        const mkt = DataService.getMarketStatus();

        container.innerHTML = `
            <div class="home-grid">
                <div class="home-section home-market-overview">
                    <div class="section-header">MARKET OVERVIEW</div>
                    ${indices.map(idx => {
                        const cls = idx.change >= 0 ? 'positive' : 'negative';
                        const arrow = idx.change >= 0 ? '▲' : '▼';
                        return `<div class="market-index-item" onclick="CommandBar.execute('${idx.symbol} DES')" style="cursor:pointer">
                            <span class="idx-name">${idx.symbol}</span>
                            <span>${idx.name}</span>
                            <span class="idx-price">${idx.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                            <span class="${cls}">${arrow} ${Math.abs(idx.change).toFixed(2)} (${Math.abs(idx.pct).toFixed(2)}%)</span>
                        </div>`;
                    }).join('')}
                </div>
                <div class="home-section">
                    <div class="section-header">QUICK ACCESS</div>
                    <div style="display:flex;flex-direction:column;gap:4px;margin-top:6px;">
                        <button class="btn-terminal" onclick="CommandBar.execute('PORT')">💼 Portfolio</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('WL')">⭐ Watchlist</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('HMAP')">🗺 Heatmap</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('MOST')">🔥 Most Active</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('NEWS')">📰 News</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('ALERTS')">🔔 Alerts</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('SCAN')">🔍 Screener</button>
                    </div>
                </div>
                <div class="home-section" style="grid-column:1/-1;">
                    <div class="section-header">STATUS</div>
                    <div style="display:flex;gap:24px;margin-top:6px;font-size:11px;">
                        <span>Market: <span style="color:var(--amber)">${mkt.label}</span></span>
                        <span>Terminal: <span style="color:var(--green)">CONNECTED</span></span>
                        <span>Version: <span style="color:var(--gray-light)">SAP v3.0</span></span>
                    </div>
                </div>
            </div>`;
    }

    function initStatusBar() {
        updateStatus();
        setInterval(updateStatus, 5000);
    }

    function updateStatus() {
        const mkt = DataService.getMarketStatus();
        const el = document.getElementById('status-market-state');
        if (el) el.textContent = mkt.label;

        const clock = document.getElementById('status-clock');
        if (clock) clock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

        const bbClock = document.getElementById('bb-clock');
        if (bbClock) bbClock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

        const bbDate = document.getElementById('bb-date');
        if (bbDate) bbDate.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

        const lastUpdate = document.getElementById('status-last-update');
        if (lastUpdate) lastUpdate.textContent = 'UPD: ' + new Date().toLocaleTimeString('en-US', { hour12: false });

        const alertsEl = document.getElementById('status-alerts-count');
        if (alertsEl && typeof Alerts !== 'undefined' && Alerts.getActiveCount) {
            const count = Alerts.getActiveCount();
            alertsEl.textContent = count + ' ALERT' + (count !== 1 ? 'S' : '');
        }
    }

    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !isInputFocused()) {
                e.preventDefault();
                document.getElementById('command-input').focus();
                return;
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.context-menu').forEach(m => m.remove());
                const dd = document.getElementById('autocomplete-dropdown');
                if (dd) dd.classList.remove('show');
                document.getElementById('command-input').blur();
                return;
            }
            if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                Panels.setActive(parseInt(e.key));
                return;
            }
            if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) {
                const fnBtns = document.querySelectorAll('.fn-key[data-cmd]');
                const idx = parseInt(e.key.slice(1)) - 1;
                if (idx >= 0 && idx < fnBtns.length) {
                    e.preventDefault();
                    fnBtns[idx].click();
                }
            }
        });
    }

    function isInputFocused() {
        const ae = document.activeElement;
        return ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    }

    function notify(msg, type) {
        type = type || 'info';
        const el = document.createElement('div');
        el.className = 'terminal-notification ' + type;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3000);
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    return { init, renderHome, notify };
})();

document.addEventListener('DOMContentLoaded', function() { Terminal.init(); });
