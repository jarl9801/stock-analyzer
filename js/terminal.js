// ============================================
// TERMINAL.JS — Main terminal controller
// ============================================

const Terminal = (() => {
    function init() {
        DataService;
        TickerBar.init();
        CommandBar.init();
        Panels.init();
        ContextMenu.init();
        initKeyboard();
        initStatusBar();
        renderHome(document.getElementById('panel-1-content'));
        requestNotificationPermission();
    }

    function renderHome(container) {
        const indices = DataService.getMarketIndices();
        const mkt = DataService.getMarketStatus();

        // Top movers (simulated)
        const gainers = [
            {sym:'NVDA',chg:4.2},{sym:'TSLA',chg:3.8},{sym:'AMD',chg:2.9}
        ];
        const losers = [
            {sym:'BA',chg:-3.1},{sym:'INTC',chg:-2.5},{sym:'PFE',chg:-1.9}
        ];

        // Upcoming earnings
        const earnDates = [];
        for(let i=1;i<=5;i++){
            const d=new Date();d.setDate(d.getDate()+i);
            const tks=['AAPL','MSFT','GOOGL','AMZN','META'];
            earnDates.push({ticker:tks[i-1],date:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})});
        }

        // Watchlist mini
        const wlTickers = JSON.parse(localStorage.getItem('bb_watchlist_default') || '["AAPL","MSFT","GOOGL","AMZN","NVDA"]');

        container.innerHTML = `
            <div class="home-grid-v2">
                <div class="home-section home-market-overview">
                    <div class="section-header">MARKET OVERVIEW</div>
                    <div class="home-indices">${indices.map(idx => {
                        const cls = idx.change >= 0 ? 'positive' : 'negative';
                        const arrow = idx.change >= 0 ? '▲' : '▼';
                        return '<div class="market-index-item" onclick="CommandBar.execute(\''+idx.symbol+' DES\')" style="cursor:pointer"><span class="idx-name">'+idx.symbol+'</span><span style="color:var(--gray-light);font-size:10px;">'+idx.name+'</span><span class="idx-price">'+idx.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span><span class="'+cls+'">'+arrow+' '+Math.abs(idx.change).toFixed(2)+' ('+Math.abs(idx.pct).toFixed(2)+'%)</span></div>';
                    }).join('')}</div>
                </div>
                <div class="home-section">
                    <div class="section-header">TOP MOVERS</div>
                    <div style="margin-top:4px;">
                        <div style="color:var(--gray-light);font-size:10px;margin-bottom:4px;">▲ GAINERS</div>
                        ${gainers.map(g => '<div class="mover-item" onclick="CommandBar.execute(\''+g.sym+' GP\')"><span style="color:var(--amber)">'+g.sym+'</span><span class="positive">+'+g.chg.toFixed(1)+'%</span></div>').join('')}
                        <div style="color:var(--gray-light);font-size:10px;margin:6px 0 4px;">▼ LOSERS</div>
                        ${losers.map(l => '<div class="mover-item" onclick="CommandBar.execute(\''+l.sym+' GP\')"><span style="color:var(--amber)">'+l.sym+'</span><span class="negative">'+l.chg.toFixed(1)+'%</span></div>').join('')}
                    </div>
                </div>
                <div class="home-section">
                    <div class="section-header">EARNINGS THIS WEEK</div>
                    <div style="margin-top:4px;">${earnDates.map(e =>
                        '<div class="mover-item" onclick="CommandBar.execute(\''+e.ticker+' ERN\')"><span style="color:var(--amber)">'+e.ticker+'</span><span style="color:var(--gray-light)">'+e.date+'</span></div>'
                    ).join('')}</div>
                </div>
                <div class="home-section">
                    <div class="section-header">WATCHLIST</div>
                    <div style="margin-top:4px;" id="home-wl-mini">${wlTickers.map(t =>
                        '<div class="mover-item" onclick="CommandBar.execute(\''+t+' GP\')"><span style="color:var(--amber)">'+t+'</span><span style="color:var(--gray-light)">--</span></div>'
                    ).join('')}</div>
                </div>
                <div class="home-section" style="grid-column:1/-1;">
                    <div class="section-header">QUICK ACCESS</div>
                    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                        <button class="btn-terminal" onclick="CommandBar.execute('PORT')">💼 Portfolio</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('WL')">⭐ Watchlist</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('HMAP')">🗺 Heatmap</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('MOST')">🔥 Most Active</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('NEWS')">📰 News</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('ALERTS')">🔔 Alerts</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('SCAN')">🔍 Screener</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('COMP')">📊 Compare</button>
                        <button class="btn-terminal" onclick="CommandBar.execute('HELP')">❓ Help</button>
                    </div>
                </div>
                <div class="home-section" style="grid-column:1/-1;">
                    <div style="display:flex;gap:24px;font-size:10px;">
                        <span>Market: <span style="color:var(--amber)">${mkt.label}</span></span>
                        <span>Terminal: <span style="color:var(--green)">CONNECTED</span></span>
                        <span>Version: <span style="color:var(--gray-light)">SAP v3.0</span></span>
                    </div>
                </div>
            </div>`;

        // Load watchlist prices async
        Promise.all(wlTickers.map(t => DataService.getQuote(t).catch(()=>null))).then(quotes => {
            const wlEl = container.querySelector('#home-wl-mini');
            if (!wlEl) return;
            wlEl.innerHTML = wlTickers.map((t,i) => {
                const q = quotes[i];
                const price = q ? '$'+q.price.toFixed(2) : '--';
                const chg = q ? ((q.changePercent||0)>=0?'+':'')+(q.changePercent||0).toFixed(2)+'%' : '';
                const cls = q && (q.changePercent||0)>=0 ? 'positive' : 'negative';
                return '<div class="mover-item" onclick="CommandBar.execute(\''+t+' GP\')"><span style="color:var(--amber)">'+t+'</span><span>'+price+'</span><span class="'+cls+'">'+chg+'</span></div>';
            }).join('');
        });
    }

    function initStatusBar() { updateStatus(); setInterval(updateStatus, 5000); }

    function updateStatus() {
        const mkt = DataService.getMarketStatus();
        const el = document.getElementById('status-market-state'); if(el) el.textContent = mkt.label;
        const clock = document.getElementById('status-clock'); if(clock) clock.textContent = new Date().toLocaleTimeString('en-US',{hour12:false});
        const bbClock = document.getElementById('bb-clock'); if(bbClock) bbClock.textContent = new Date().toLocaleTimeString('en-US',{hour12:false});
        const bbDate = document.getElementById('bb-date'); if(bbDate) bbDate.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        const lastUpdate = document.getElementById('status-last-update'); if(lastUpdate) lastUpdate.textContent = 'UPD: '+new Date().toLocaleTimeString('en-US',{hour12:false});
        const alertsEl = document.getElementById('status-alerts-count');
        if(alertsEl && typeof Alerts!=='undefined' && Alerts.getActiveCount) { const c=Alerts.getActiveCount(); alertsEl.textContent=c+' ALERT'+(c!==1?'S':''); }
    }

    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !isInputFocused()) { e.preventDefault(); document.getElementById('command-input').focus(); return; }
            if (e.key === 'Escape') {
                document.querySelectorAll('.bb-context-menu').forEach(m=>m.remove());
                const dd=document.getElementById('autocomplete-dropdown'); if(dd)dd.classList.remove('show');
                document.getElementById('command-input').blur(); return;
            }
            if (e.ctrlKey && e.key >= '1' && e.key <= '4') { e.preventDefault(); Panels.setActive(parseInt(e.key)); return; }
            if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) {
                const fnBtns = document.querySelectorAll('.fn-key[data-cmd]');
                const idx = parseInt(e.key.slice(1))-1;
                if(idx>=0&&idx<fnBtns.length){e.preventDefault();fnBtns[idx].click();}
            }
        });
    }

    function isInputFocused() { const ae=document.activeElement; return ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable); }

    function notify(msg, type) {
        type = type || 'info';
        const el = document.createElement('div');
        el.className = 'terminal-notification ' + type;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    }

    return { init, renderHome, notify };
})();

document.addEventListener('DOMContentLoaded', () => Terminal.init());
