// ============================================
// WATCHLIST.JS — Enhanced multi-tab watchlist
// ============================================

const Watchlist = (() => {
    let tabs = JSON.parse(localStorage.getItem('bb_wl_tabs') || '{"Main":["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","JPM"]}');
    let activeTab = Object.keys(tabs)[0] || 'Main';

    function save() { localStorage.setItem('bb_wl_tabs', JSON.stringify(tabs)); }

    function render(container) {
        const tabNames = Object.keys(tabs);
        container.innerHTML = `
            <div class="wl-view">
                <div class="wl-header">
                    <h2 style="color:var(--amber);font-size:14px;margin-bottom:6px;">WATCHLIST</h2>
                    <div class="wl-controls">
                        <div class="wl-tabs" id="wl-tab-bar">
                            ${tabNames.map(t => `<span class="wl-tab${t===activeTab?' active':''}" onclick="Watchlist.switchTab('${t}')">${t}</span>`).join('')}
                        </div>
                        <button class="btn-terminal btn-sm" onclick="Watchlist.addTab()">+ TAB</button>
                        <input type="text" class="wl-add-input" id="wl-add-input" placeholder="Add ticker...">
                        <button class="btn-terminal btn-sm" onclick="Watchlist.addTicker()">ADD</button>
                    </div>
                </div>
                <div class="wl-table-wrap" id="wl-table-wrap">
                    <div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>
                </div>
            </div>`;

        loadWatchlistData(container);

        // Enter key to add
        container.querySelector('#wl-add-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') Watchlist.addTicker();
        });
    }

    async function loadWatchlistData(container) {
        const tickers = tabs[activeTab] || [];
        if (!tickers.length) {
            container.querySelector('#wl-table-wrap').innerHTML = '<div class="empty-state"><span class="icon">⭐</span><p>Empty watchlist</p></div>';
            return;
        }

        const quotes = await DataService.getMultipleQuotes(tickers);

        let html = `<table class="terminal-table wl-table">
            <thead><tr>
                <th>TICKER</th><th>NAME</th><th>LAST</th><th>CHG</th><th>CHG%</th>
                <th>VOLUME</th><th>MKT CAP</th><th>P/E</th><th>DIV%</th><th>CHART</th><th></th>
            </tr></thead><tbody>`;

        quotes.forEach((q, i) => {
            if (!q) return;
            const chg = q.change || 0;
            const chgPct = q.changePercent || 0;
            const cls = chg >= 0 ? 'positive' : 'negative';
            const divYield = q.dividend > 0 ? ((q.dividend/q.price)*100).toFixed(2) : '0.00';
            const vol = q.marketCap > 1e9 ? (q.marketCap * 0.002 / 1e6).toFixed(1) + 'M' : '--';

            html += `<tr oncontextmenu="Watchlist.contextMenu(event, '${q.ticker || tickers[i]}')" ondblclick="CommandBar.execute('${q.ticker || tickers[i]} DES')">
                <td style="color:var(--amber);font-weight:600;cursor:pointer" onclick="CommandBar.execute('${q.ticker || tickers[i]} DES')">${q.ticker || tickers[i]}</td>
                <td>${q.name || '--'}</td>
                <td>$${q.price.toFixed(2)}</td>
                <td class="${cls}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}</td>
                <td class="${cls}">${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%</td>
                <td>${vol}</td>
                <td>${q.marketCap ? '$'+(q.marketCap/1e9).toFixed(1)+'B' : '--'}</td>
                <td>${q.pe ? q.pe.toFixed(1) : '--'}</td>
                <td>${divYield}%</td>
                <td><canvas class="sparkline" data-ticker="${q.ticker || tickers[i]}" width="60" height="20"></canvas></td>
                <td><button class="btn-terminal btn-sm btn-danger" onclick="Watchlist.removeTicker('${q.ticker || tickers[i]}')">✕</button></td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.querySelector('#wl-table-wrap').innerHTML = html;

        // Draw sparklines
        container.querySelectorAll('.sparkline').forEach(canvas => {
            drawSparkline(canvas, canvas.dataset.ticker);
        });
    }

    function drawSparkline(canvas, ticker) {
        const ctx = canvas.getContext('2d');
        const data = DataService.generateOHLCV(ticker, 30).map(d => d.close);
        const min = Math.min(...data), max = Math.max(...data);
        const range = max - min || 1;
        const w = canvas.width, h = canvas.height;
        const isUp = data[data.length-1] >= data[0];

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = isUp ? '#22c55e' : '#ff4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = (i / (data.length-1)) * w;
            const y = h - ((v - min) / range) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function switchTab(name) {
        activeTab = name;
        const container = document.querySelector('.wl-view');
        if (container) {
            container.querySelectorAll('.wl-tab').forEach(t => t.classList.toggle('active', t.textContent === name));
            loadWatchlistData(container.closest('.panel-content') || container.parentElement);
        }
    }

    function addTab() {
        const name = prompt('Tab name:');
        if (!name) return;
        tabs[name] = [];
        activeTab = name;
        save();
        const panel = document.querySelector('.wl-view')?.closest('.panel-content');
        if (panel) render(panel);
    }

    function addTicker() {
        const input = document.getElementById('wl-add-input');
        const ticker = (input?.value || '').toUpperCase().trim();
        if (!ticker) return;
        if (!tabs[activeTab]) tabs[activeTab] = [];
        if (tabs[activeTab].includes(ticker)) { Terminal.notify(`${ticker} already in watchlist`, 'info'); return; }
        tabs[activeTab].push(ticker);
        save();
        input.value = '';
        Terminal.notify(`${ticker} added to watchlist`, 'success');
        const panel = document.querySelector('.wl-view')?.closest('.panel-content');
        if (panel) render(panel);
    }

    function addTickerDirect(ticker) {
        if (!tabs[activeTab]) tabs[activeTab] = [];
        if (tabs[activeTab].includes(ticker)) { Terminal.notify(`${ticker} already in watchlist`, 'info'); return; }
        tabs[activeTab].push(ticker);
        save();
        Terminal.notify(`${ticker} added to watchlist`, 'success');
    }

    function removeTicker(ticker) {
        if (!tabs[activeTab]) return;
        tabs[activeTab] = tabs[activeTab].filter(t => t !== ticker);
        save();
        const panel = document.querySelector('.wl-view')?.closest('.panel-content');
        if (panel) render(panel);
    }

    function contextMenu(e, ticker) {
        e.preventDefault();
        // Remove existing
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.innerHTML = `
            <div class="context-menu-item" onclick="CommandBar.execute('${ticker} GP')">📈 Chart</div>
            <div class="context-menu-item" onclick="CommandBar.execute('${ticker} FA')">📊 Financials</div>
            <div class="context-menu-item" onclick="CommandBar.execute('${ticker} NEWS')">📰 News</div>
            <div class="context-menu-sep"></div>
            <div class="context-menu-item" onclick="Portfolio.addPositionFor('${ticker}')">💼 Add to Portfolio</div>
            <div class="context-menu-item" onclick="Alerts.quickAdd('${ticker}')">🔔 Set Alert</div>
            <div class="context-menu-sep"></div>
            <div class="context-menu-item" onclick="Watchlist.removeTicker('${ticker}')">✕ Remove</div>
        `;
        document.body.appendChild(menu);
        document.addEventListener('click', () => menu.remove(), { once: true });
    }

    return { render, addTicker, addTickerDirect, removeTicker, addTab, switchTab, contextMenu };
})();
