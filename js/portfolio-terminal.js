// ============================================
// PORTFOLIO-TERMINAL.JS — Portfolio Manager
// ============================================

const Portfolio = (() => {
    let positions = JSON.parse(localStorage.getItem('bb_portfolio') || '[]');

    function save() { localStorage.setItem('bb_portfolio', JSON.stringify(positions)); }

    function render(container) {
        container.innerHTML = `
            <div class="port-view">
                <div class="port-header">
                    <h2 style="color:var(--amber);font-size:14px;margin-bottom:8px;">PORTFOLIO</h2>
                    <div class="port-summary" id="port-summary"></div>
                    <div class="port-actions">
                        <button class="btn-terminal btn-sm" onclick="Portfolio.addPosition()">+ ADD POSITION</button>
                        <button class="btn-terminal btn-sm" onclick="Portfolio.clearAll()">CLEAR ALL</button>
                    </div>
                </div>
                <div class="port-table-wrap" id="port-table-wrap">
                    <div style="text-align:center;padding:20px"><div class="loading-spinner"></div></div>
                </div>
                <div class="port-bottom" id="port-bottom"></div>
            </div>`;

        loadPortfolioData(container);
    }

    async function loadPortfolioData(container) {
        if (!positions.length) {
            container.querySelector('#port-summary').innerHTML = '';
            container.querySelector('#port-table-wrap').innerHTML = '<div class="empty-state"><span class="icon">💼</span><p>No positions. Add one to get started.</p></div>';
            container.querySelector('#port-bottom').innerHTML = '';
            return;
        }

        var tickers = positions.map(function(p) { return p.ticker; });
        var quotes = await DataService.getMultipleQuotes(tickers);

        var totalValue = 0, totalCost = 0, totalDayPnl = 0;
        var positionsData = positions.map(function(pos, i) {
            var q = quotes[i];
            var currentPrice = q ? q.price : pos.avgCost;
            var value = currentPrice * pos.shares;
            var cost = pos.avgCost * pos.shares;
            var pnl = value - cost;
            var pnlPct = cost > 0 ? (pnl / cost * 100) : 0;
            var dayChange = q ? (q.changePercent || 0) : 0;
            var dayPnl = value * dayChange / 100;

            totalValue += value;
            totalCost += cost;
            totalDayPnl += dayPnl;

            return {
                ticker: pos.ticker,
                shares: pos.shares,
                avgCost: pos.avgCost,
                price: currentPrice,
                value: value,
                pnl: pnl,
                pnlPct: pnlPct,
                dayChange: dayChange,
                dayPnl: dayPnl,
                name: q ? q.name : pos.ticker,
                weight: 0
            };
        });

        positionsData.forEach(function(p) { p.weight = totalValue > 0 ? (p.value / totalValue * 100) : 0; });

        // Summary
        var totalPnl = totalValue - totalCost;
        var totalPnlPct = totalCost > 0 ? (totalPnl / totalCost * 100) : 0;

        container.querySelector('#port-summary').innerHTML =
            '<div class="port-stat"><span class="port-label">TOTAL VALUE</span><span class="port-value">$' + (totalValue / 1e3).toFixed(1) + 'K</span></div>' +
            '<div class="port-stat"><span class="port-label">TOTAL P&L</span><span class="port-value ' + (totalPnl >= 0 ? 'positive' : 'negative') + '">' + (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(0) + ' (' + totalPnlPct.toFixed(1) + '%)</span></div>' +
            '<div class="port-stat"><span class="port-label">DAY P&L</span><span class="port-value ' + (totalDayPnl >= 0 ? 'positive' : 'negative') + '">' + (totalDayPnl >= 0 ? '+' : '') + '$' + totalDayPnl.toFixed(0) + '</span></div>' +
            '<div class="port-stat"><span class="port-label">POSITIONS</span><span class="port-value">' + positions.length + '</span></div>';

        // Table
        var html = '<table class="terminal-table"><thead><tr>' +
            '<th>TICKER</th><th>NAME</th><th>SHARES</th><th>AVG COST</th><th>LAST</th><th>VALUE</th><th>P&L</th><th>P&L%</th><th>DAY%</th><th>WEIGHT</th><th></th>' +
            '</tr></thead><tbody>';

        positionsData.forEach(function(p, i) {
            var cls = p.pnl >= 0 ? 'positive' : 'negative';
            var dayCls = p.dayChange >= 0 ? 'positive' : 'negative';

            html += '<tr ondblclick="CommandBar.execute(\'' + p.ticker + ' DES\')">' +
                '<td style="color:var(--amber);font-weight:600;cursor:pointer" onclick="CommandBar.execute(\'' + p.ticker + ' DES\')">' + p.ticker + '</td>' +
                '<td>' + p.name + '</td>' +
                '<td>' + p.shares + '</td>' +
                '<td>$' + p.avgCost.toFixed(2) + '</td>' +
                '<td>$' + p.price.toFixed(2) + '</td>' +
                '<td>$' + p.value.toFixed(0) + '</td>' +
                '<td class="' + cls + '">' + (p.pnl >= 0 ? '+' : '') + '$' + p.pnl.toFixed(0) + '</td>' +
                '<td class="' + cls + '">' + (p.pnlPct >= 0 ? '+' : '') + p.pnlPct.toFixed(1) + '%</td>' +
                '<td class="' + dayCls + '">' + (p.dayChange >= 0 ? '+' : '') + p.dayChange.toFixed(2) + '%</td>' +
                '<td>' + p.weight.toFixed(1) + '%</td>' +
                '<td><button class="btn-terminal btn-sm btn-danger" onclick="Portfolio.removePosition(' + i + ')">✕</button></td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        container.querySelector('#port-table-wrap').innerHTML = html;

        // Allocation chart
        container.querySelector('#port-bottom').innerHTML =
            '<div><div class="section-header">ALLOCATION</div>' +
            positionsData.map(function(p) {
                return '<div class="alloc-bar-item"><div class="alloc-bar-label"><span>' + p.ticker + '</span><span>' + p.weight.toFixed(1) + '%</span></div><div class="alloc-bar-bg"><div class="alloc-bar-fill" style="width:' + p.weight + '%;background:var(--amber)"></div></div></div>';
            }).join('') +
            '</div>' +
            '<div><div class="section-header">RISK METRICS</div>' +
            '<div class="risk-grid">' +
            '<div class="risk-metric"><span class="risk-label">Portfolio Beta</span><span class="risk-value">1.12</span></div>' +
            '<div class="risk-metric"><span class="risk-label">Sharpe Ratio</span><span class="risk-value">1.45</span></div>' +
            '<div class="risk-metric"><span class="risk-label">Max Drawdown</span><span class="risk-value negative">-8.3%</span></div>' +
            '<div class="risk-metric"><span class="risk-label">Volatility</span><span class="risk-value">16.2%</span></div>' +
            '</div></div>' +
            '<div><div class="section-header">SECTOR BREAKDOWN</div>' +
            getSectorBreakdown(positionsData) +
            '</div>';
    }

    function getSectorBreakdown(data) {
        var sectors = {};
        data.forEach(function(p) {
            var s = DataService.getSectorForTicker(p.ticker);
            sectors[s] = (sectors[s] || 0) + p.weight;
        });
        return Object.entries(sectors).sort(function(a, b) { return b[1] - a[1]; }).map(function(entry) {
            return '<div class="alloc-bar-item"><div class="alloc-bar-label"><span>' + entry[0] + '</span><span>' + entry[1].toFixed(1) + '%</span></div><div class="alloc-bar-bg"><div class="alloc-bar-fill" style="width:' + entry[1] + '%;background:var(--green-dim)"></div></div></div>';
        }).join('');
    }

    function addPosition() {
        var ticker = prompt('Ticker:');
        if (!ticker) return;
        ticker = ticker.toUpperCase().trim();
        var shares = parseInt(prompt('Number of shares:', '10'));
        if (!shares || isNaN(shares)) return;
        var cost = parseFloat(prompt('Average cost per share:', '100'));
        if (!cost || isNaN(cost)) return;

        positions.push({ ticker: ticker, shares: shares, avgCost: cost });
        save();
        Terminal.notify(ticker + ' added to portfolio', 'success');

        var panel = document.querySelector('.port-view');
        if (panel) render(panel.closest('.panel-content'));
    }

    function addPositionFor(ticker) {
        var shares = parseInt(prompt('Shares of ' + ticker + ':', '10'));
        if (!shares || isNaN(shares)) return;

        DataService.getQuote(ticker).then(function(data) {
            var cost = parseFloat(prompt('Avg cost:', data.price.toFixed(2)));
            if (!cost || isNaN(cost)) return;

            positions.push({ ticker: ticker, shares: shares, avgCost: cost });
            save();
            Terminal.notify(ticker + ' added to portfolio', 'success');
        });
    }

    function removePosition(idx) {
        positions.splice(idx, 1);
        save();
        var panel = document.querySelector('.port-view');
        if (panel) render(panel.closest('.panel-content'));
    }

    function clearAll() {
        if (!confirm('Clear all positions?')) return;
        positions = [];
        save();
        var panel = document.querySelector('.port-view');
        if (panel) render(panel.closest('.panel-content'));
    }

    return { render, addPosition, addPositionFor, removePosition, clearAll };
})();
