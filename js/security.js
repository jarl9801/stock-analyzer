// ============================================
// SECURITY.JS — DES (Security Description)
// ============================================

const Security = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><span class="icon">🔍</span><p>Enter a ticker</p></div>'; return; }

        container.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading-spinner"></div><p style="margin-top:8px;color:var(--gray)">Loading ' + ticker + '...</p></div>';

        const data = await DataService.getQuote(ticker);
        const sector = data.sector || DataService.getSectorForTicker(ticker);
        const chgCls = (data.change || 0) >= 0 ? 'positive' : 'negative';
        const arrow = (data.change || 0) >= 0 ? '▲' : '▼';
        const divYield = data.dividend > 0 ? ((data.dividend / data.price) * 100).toFixed(2) : '0.00';
        const ev = ((data.marketCap + (data.debt||0) - (data.cash||0)) / 1e9).toFixed(1);
        const roe = data.bookValue > 0 ? ((data.eps / data.bookValue) * 100).toFixed(1) : 'N/A';
        const fcfYield = data.fcf > 0 ? ((data.fcf / data.marketCap) * 100).toFixed(2) : 'N/A';

        // Find similar companies
        const sectorTickers = DataService.SP500_TOP[sector] || DataService.SP500_TOP['Technology'];
        const similar = sectorTickers.filter(t => t !== ticker).slice(0, 6);

        container.innerHTML = `
            <div class="des-view">
                <div class="des-header">
                    <div class="des-title">
                        <h2 class="des-name">${data.name || ticker}</h2>
                        <span class="des-ticker-info">${ticker} • ${sector} • ${data.currency || 'USD'} • Beta: ${(data.beta||1).toFixed(2)}</span>
                    </div>
                    <div class="des-price-box">
                        <span class="des-price">$${data.price.toFixed(2)}</span>
                        <span class="des-change ${chgCls}">${arrow} ${Math.abs(data.change||0).toFixed(2)} (${Math.abs(data.changePercent||0).toFixed(2)}%)</span>
                    </div>
                </div>
                <div class="des-grid">
                    <div class="des-section">
                        <div class="section-header">KEY STATISTICS</div>
                        <div class="des-stats-grid">
                            <div class="stat-item"><span class="stat-label">Market Cap</span><span class="stat-value">$${(data.marketCap/1e9).toFixed(1)}B</span></div>
                            <div class="stat-item"><span class="stat-label">Enterprise Value</span><span class="stat-value">$${ev}B</span></div>
                            <div class="stat-item"><span class="stat-label">P/E Ratio</span><span class="stat-value">${data.pe ? data.pe.toFixed(1) : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">P/B Ratio</span><span class="stat-value">${data.pb ? data.pb.toFixed(1) : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">EPS (TTM)</span><span class="stat-value">$${data.eps ? data.eps.toFixed(2) : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">Book Value</span><span class="stat-value">$${data.bookValue ? data.bookValue.toFixed(2) : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">Dividend</span><span class="stat-value">$${data.dividend ? data.dividend.toFixed(2) : '0.00'}</span></div>
                            <div class="stat-item"><span class="stat-label">Div Yield</span><span class="stat-value">${divYield}%</span></div>
                            <div class="stat-item"><span class="stat-label">Beta</span><span class="stat-value">${(data.beta||1).toFixed(2)}</span></div>
                            <div class="stat-item"><span class="stat-label">ROE</span><span class="stat-value">${roe}${roe!=='N/A'?'%':''}</span></div>
                            <div class="stat-item"><span class="stat-label">FCF</span><span class="stat-value">$${data.fcf ? (data.fcf/1e9).toFixed(1)+'B' : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">FCF Yield</span><span class="stat-value">${fcfYield}${fcfYield!=='N/A'?'%':''}</span></div>
                            <div class="stat-item"><span class="stat-label">Revenue</span><span class="stat-value">$${data.revenue ? (data.revenue/1e9).toFixed(1)+'B' : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">Shares Out</span><span class="stat-value">${data.shares ? (data.shares/1e9).toFixed(2)+'B' : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">Debt</span><span class="stat-value">$${data.debt ? (data.debt/1e9).toFixed(1)+'B' : 'N/A'}</span></div>
                            <div class="stat-item"><span class="stat-label">Cash</span><span class="stat-value">$${data.cash ? (data.cash/1e9).toFixed(1)+'B' : 'N/A'}</span></div>
                        </div>
                    </div>
                    <div class="des-section">
                        <div class="section-header">PRICE CHART — 1Y</div>
                        <div id="des-chart" style="height:250px;"></div>
                    </div>
                    <div class="des-section">
                        <div class="section-header">QUICK ACTIONS</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                            <button class="btn-terminal btn-sm" onclick="CommandBar.execute('${ticker} GP')">📈 Chart</button>
                            <button class="btn-terminal btn-sm" onclick="CommandBar.execute('${ticker} FA')">📊 Financials</button>
                            <button class="btn-terminal btn-sm" onclick="CommandBar.execute('${ticker} DVD')">💰 Dividends</button>
                            <button class="btn-terminal btn-sm" onclick="CommandBar.execute('${ticker} ERN')">📅 Earnings</button>
                            <button class="btn-terminal btn-sm" onclick="CommandBar.execute('${ticker} NEWS')">📰 News</button>
                            <button class="btn-terminal btn-sm" onclick="Watchlist.addTickerDirect('${ticker}')">⭐ Watchlist</button>
                            <button class="btn-terminal btn-sm" onclick="Portfolio.addPositionFor('${ticker}')">💼 Portfolio</button>
                            <button class="btn-terminal btn-sm" onclick="Alerts.quickAdd('${ticker}')">🔔 Alert</button>
                        </div>
                    </div>
                    <div class="des-section">
                        <div class="section-header">SIMILAR COMPANIES</div>
                        ${similar.map(t => `<div class="des-similar-item" onclick="CommandBar.execute('${t} DES')">
                            <span class="sim-ticker">${t}</span>
                            <span style="color:var(--gray-light)">${typeof STOCK_DATABASE !== 'undefined' && STOCK_DATABASE[t] ? STOCK_DATABASE[t].name : t+' Corp'}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>`;

        // Mini chart
        if (typeof LightweightCharts !== 'undefined') {
            const chartEl = container.querySelector('#des-chart');
            if (chartEl) {
                const ohlcv = DataService.generateOHLCV(ticker, 252);
                const chart = LightweightCharts.createChart(chartEl, {
                    width: chartEl.clientWidth, height: 250,
                    layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                    grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
                    rightPriceScale: { borderColor: '#333' },
                    timeScale: { borderColor: '#333' },
                });
                const s = chart.addAreaSeries({
                    topColor: (data.change||0) >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,68,68,0.3)',
                    bottomColor: 'transparent',
                    lineColor: (data.change||0) >= 0 ? '#22c55e' : '#ff4444',
                    lineWidth: 2,
                });
                s.setData(ohlcv.map(d => ({ time: d.time, value: d.close })));
                chart.timeScale().fitContent();
                new ResizeObserver(() => chart.applyOptions({ width: chartEl.clientWidth })).observe(chartEl);
            }
        }
    }

    return { render };
})();
