// ============================================
// HEATMAP.JS — S&P 500 Market Heatmap (Treemap)
// ============================================

const Heatmap = (() => {
    function render(container) {
        container.innerHTML = `
            <div class="hmap-view">
                <div class="hmap-header">
                    <h2>S&P 500 MARKET HEATMAP</h2>
                    <div class="hmap-controls">
                        <button class="btn-terminal btn-sm active" data-mode="change">% CHANGE</button>
                        <button class="btn-terminal btn-sm" data-mode="volume">VOLUME</button>
                    </div>
                </div>
                <div class="hmap-container" id="hmap-container"></div>
            </div>`;

        buildTreemap(container.querySelector('#hmap-container'));

        container.querySelectorAll('.hmap-controls .btn-terminal').forEach(btn => {
            btn.addEventListener('click', function() {
                container.querySelectorAll('.hmap-controls .btn-terminal').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                buildTreemap(container.querySelector('#hmap-container'));
            });
        });
    }

    function buildTreemap(el) {
        const sectors = DataService.SP500_TOP;
        el.innerHTML = '';

        // Calculate total market cap for sizing
        let totalMcap = 0;
        const sectorData = {};

        for (const [sector, tickers] of Object.entries(sectors)) {
            sectorData[sector] = tickers.map(t => {
                const db = typeof STOCK_DATABASE !== 'undefined' ? STOCK_DATABASE[t] : null;
                const mcap = db ? db.marketCap : (50 + Math.random() * 500) * 1e9;
                const change = db ? ((Math.random() - 0.45) * 6) : ((Math.random() - 0.45) * 6);
                totalMcap += mcap;
                return { ticker: t, mcap: mcap, change: change.toFixed(2) };
            });
        }

        const containerWidth = el.clientWidth || 800;
        const containerHeight = el.clientHeight || 500;

        for (const [sector, stocks] of Object.entries(sectorData)) {
            const sectorMcap = stocks.reduce((s, st) => s + st.mcap, 0);
            const sectorPct = sectorMcap / totalMcap;
            const sectorWidth = Math.floor(containerWidth * sectorPct);

            // Sector wrapper
            const sectorEl = document.createElement('div');
            sectorEl.style.cssText = 'display:inline-flex;flex-wrap:wrap;align-content:flex-start;vertical-align:top;border:1px solid #333;position:relative;';
            sectorEl.style.width = Math.max(sectorWidth, 60) + 'px';
            sectorEl.style.height = containerHeight + 'px';

            // Sector label
            const label = document.createElement('div');
            label.style.cssText = 'position:absolute;top:2px;left:4px;font-size:9px;color:rgba(255,255,255,0.6);font-family:var(--font-ui);z-index:1;pointer-events:none;letter-spacing:0.5px;';
            label.textContent = sector.toUpperCase();
            sectorEl.appendChild(label);

            // Stock items
            stocks.sort((a, b) => b.mcap - a.mcap);
            stocks.forEach(stock => {
                const pct = stock.mcap / sectorMcap;
                const itemW = Math.max(Math.floor(sectorWidth * 0.5) - 2, 40);
                const itemH = Math.max(Math.floor(containerHeight * pct * 0.9), 20);

                const item = document.createElement('div');
                item.className = 'hmap-item';
                item.style.width = itemW + 'px';
                item.style.height = itemH + 'px';
                item.style.backgroundColor = getHeatColor(parseFloat(stock.change));
                item.innerHTML = '<span class="hmap-ticker">' + stock.ticker + '</span>' +
                    (itemH > 25 ? '<span class="hmap-chg">' + (stock.change >= 0 ? '+' : '') + stock.change + '%</span>' : '');
                item.onclick = function() { CommandBar.execute(stock.ticker + ' DES'); };
                item.title = stock.ticker + ': ' + (stock.change >= 0 ? '+' : '') + stock.change + '%';
                sectorEl.appendChild(item);
            });

            el.appendChild(sectorEl);
        }
    }

    function getHeatColor(change) {
        // Deep red (-5%) → dark → bright green (+5%)
        const clamped = Math.max(-5, Math.min(5, change));
        const ratio = (clamped + 5) / 10; // 0 to 1

        if (ratio < 0.5) {
            // Red side
            const intensity = Math.floor(60 + (1 - ratio * 2) * 140);
            return 'rgb(' + intensity + ',' + Math.floor(intensity * 0.15) + ',' + Math.floor(intensity * 0.15) + ')';
        } else {
            // Green side
            const intensity = Math.floor(60 + (ratio - 0.5) * 2 * 140);
            return 'rgb(' + Math.floor(intensity * 0.15) + ',' + intensity + ',' + Math.floor(intensity * 0.15) + ')';
        }
    }

    return { render };
})();
