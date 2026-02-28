// ============================================
// CHARTS.JS — Advanced charting with lightweight-charts
// ============================================

const Charts = (() => {
    const instances = new Map();

    function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><span class="icon">📈</span><p>Enter a ticker to view chart</p></div>'; return; }

        container.innerHTML = `
            <div class="gp-view">
                <div class="gp-header">
                    <div>
                        <h2 class="gp-ticker-name" style="display:inline">${ticker}</h2>
                        <span class="gp-price-info">Loading...</span>
                    </div>
                    <div class="gp-controls">
                        <div class="gp-timeframes">
                            ${['1D','5D','1M','3M','6M','1Y','5Y','MAX'].map(tf =>
                                `<button class="tf-btn${tf==='1Y'?' active':''}" data-tf="${tf}">${tf}</button>`
                            ).join('')}
                        </div>
                        <div class="gp-chart-type">
                            <button class="ct-btn active" data-type="candlestick" title="Candlestick">🕯</button>
                            <button class="ct-btn" data-type="line" title="Line">📈</button>
                            <button class="ct-btn" data-type="area" title="Area">▦</button>
                        </div>
                    </div>
                </div>
                <div class="gp-overlays">
                    <label><input type="checkbox" data-overlay="sma20"> SMA20</label>
                    <label><input type="checkbox" data-overlay="sma50"> SMA50</label>
                    <label><input type="checkbox" data-overlay="sma200"> SMA200</label>
                    <label><input type="checkbox" data-overlay="ema20"> EMA20</label>
                    <label><input type="checkbox" data-overlay="bb"> Bollinger</label>
                </div>
                <div class="gp-chart-wrap">
                    <div class="gp-chart" id="gp-main-chart"></div>
                </div>
                <div class="gp-indicators">
                    <div class="gp-indicator-controls">
                        <label><input type="checkbox" data-ind="volume" checked> Volume</label>
                        <label><input type="checkbox" data-ind="rsi"> RSI</label>
                        <label><input type="checkbox" data-ind="macd"> MACD</label>
                    </div>
                    <div class="gp-indicator-charts" id="gp-indicator-area"></div>
                </div>
            </div>`;

        // Load data and create chart
        const ohlcv = DataService.generateOHLCV(ticker, 365);
        createChart(container, ticker, ohlcv, '1Y', 'candlestick');

        // Update price info
        DataService.getQuote(ticker).then(data => {
            const info = container.querySelector('.gp-price-info');
            if (info && data) {
                const cls = (data.change || 0) >= 0 ? 'positive' : 'negative';
                info.innerHTML = `<span style="font-size:16px;font-weight:600">$${data.price.toFixed(2)}</span> <span class="${cls}">${(data.change||0) >= 0 ? '▲' : '▼'} ${Math.abs(data.change||0).toFixed(2)} (${Math.abs(data.changePercent||0).toFixed(2)}%)</span>`;
            }
        });

        // Timeframe buttons
        container.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const days = { '1D': 1, '5D': 5, '1M': 22, '3M': 66, '6M': 132, '1Y': 252, '5Y': 1260, 'MAX': 2520 }[btn.dataset.tf] || 252;
                const newData = DataService.generateOHLCV(ticker, days);
                createChart(container, ticker, newData, btn.dataset.tf, getActiveChartType(container));
            });
        });

        // Chart type buttons
        container.querySelectorAll('.ct-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                createChart(container, ticker, ohlcv, '1Y', btn.dataset.type);
            });
        });

        // Overlay checkboxes
        container.querySelectorAll('[data-overlay]').forEach(cb => {
            cb.addEventListener('change', () => updateOverlays(container, ticker, ohlcv));
        });

        // Indicator checkboxes
        container.querySelectorAll('[data-ind]').forEach(cb => {
            cb.addEventListener('change', () => updateIndicators(container, ticker, ohlcv));
        });

        // Initial indicators
        updateIndicators(container, ticker, ohlcv);
    }

    function getActiveChartType(container) {
        const active = container.querySelector('.ct-btn.active');
        return active ? active.dataset.type : 'candlestick';
    }

    function createChart(container, ticker, data, timeframe, chartType) {
        const chartEl = container.querySelector('#gp-main-chart') || container.querySelector('.gp-chart');
        if (!chartEl) return;

        chartEl.innerHTML = '';

        if (typeof LightweightCharts === 'undefined') {
            chartEl.innerHTML = '<div class="empty-state"><p>Chart library not loaded</p></div>';
            return;
        }

        const chart = LightweightCharts.createChart(chartEl, {
            width: chartEl.clientWidth,
            height: 400,
            layout: { background: { color: '#1a1a1a' }, textColor: '#888' },
            grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { borderColor: '#333' },
            timeScale: { borderColor: '#333', timeVisible: timeframe === '1D' },
        });

        let series;
        if (chartType === 'candlestick') {
            series = chart.addCandlestickSeries({
                upColor: '#22c55e', downColor: '#ff4444',
                borderUpColor: '#22c55e', borderDownColor: '#ff4444',
                wickUpColor: '#22c55e', wickDownColor: '#ff4444',
            });
            series.setData(data);
        } else if (chartType === 'line') {
            series = chart.addLineSeries({ color: '#ffaa00', lineWidth: 2 });
            series.setData(data.map(d => ({ time: d.time, value: d.close })));
        } else if (chartType === 'area') {
            series = chart.addAreaSeries({
                topColor: 'rgba(255, 170, 0, 0.3)',
                bottomColor: 'rgba(255, 170, 0, 0.0)',
                lineColor: '#ffaa00', lineWidth: 2,
            });
            series.setData(data.map(d => ({ time: d.time, value: d.close })));
        }

        chart.timeScale().fitContent();
        instances.set(ticker, { chart, series, data });

        // Resize observer
        const ro = new ResizeObserver(() => chart.applyOptions({ width: chartEl.clientWidth }));
        ro.observe(chartEl);

        // Update overlays
        updateOverlays(container, ticker, data);
    }

    function updateOverlays(container, ticker, data) {
        const inst = instances.get(ticker);
        if (!inst) return;

        // Remove old overlay series
        if (inst.overlays) inst.overlays.forEach(s => inst.chart.removeSeries(s));
        inst.overlays = [];

        const checked = [...container.querySelectorAll('[data-overlay]:checked')].map(c => c.dataset.overlay);

        checked.forEach(ov => {
            if (ov === 'sma20') {
                const s = inst.chart.addLineSeries({ color: '#4488ff', lineWidth: 1, priceLineVisible: false });
                s.setData(DataService.calcSMA(data, 20));
                inst.overlays.push(s);
            } else if (ov === 'sma50') {
                const s = inst.chart.addLineSeries({ color: '#ff8800', lineWidth: 1, priceLineVisible: false });
                s.setData(DataService.calcSMA(data, 50));
                inst.overlays.push(s);
            } else if (ov === 'sma200') {
                const s = inst.chart.addLineSeries({ color: '#ff4444', lineWidth: 1, priceLineVisible: false });
                s.setData(DataService.calcSMA(data, 200));
                inst.overlays.push(s);
            } else if (ov === 'ema20') {
                const s = inst.chart.addLineSeries({ color: '#00cccc', lineWidth: 1, priceLineVisible: false });
                s.setData(DataService.calcEMA(data, 20));
                inst.overlays.push(s);
            } else if (ov === 'bb') {
                const bb = DataService.calcBollingerBands(data);
                const su = inst.chart.addLineSeries({ color: 'rgba(100,100,255,0.5)', lineWidth: 1, priceLineVisible: false });
                su.setData(bb.upper);
                const sl = inst.chart.addLineSeries({ color: 'rgba(100,100,255,0.5)', lineWidth: 1, priceLineVisible: false });
                sl.setData(bb.lower);
                inst.overlays.push(su, sl);
            }
        });
    }

    function updateIndicators(container, ticker, data) {
        const area = container.querySelector('#gp-indicator-area') || container.querySelector('.gp-indicator-charts');
        if (!area) return;
        area.innerHTML = '';

        const checked = [...container.querySelectorAll('[data-ind]:checked')].map(c => c.dataset.ind);

        checked.forEach(ind => {
            if (ind === 'volume') {
                const div = document.createElement('div');
                div.style.cssText = 'height:80px;margin-top:4px;';
                area.appendChild(div);
                const chart = LightweightCharts.createChart(div, {
                    width: div.clientWidth || area.clientWidth,
                    height: 80,
                    layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                    grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
                    rightPriceScale: { borderColor: '#333' },
                    timeScale: { visible: false },
                });
                const vs = chart.addHistogramSeries({
                    color: '#26a69a',
                    priceFormat: { type: 'volume' },
                    priceScaleId: '',
                });
                vs.setData(data.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? '#22c55e44' : '#ff444444'
                })));
                chart.timeScale().fitContent();
                new ResizeObserver(() => chart.applyOptions({ width: div.clientWidth })).observe(div);
            }

            if (ind === 'rsi') {
                const rsi = DataService.calcRSI(data);
                const div = document.createElement('div');
                div.style.cssText = 'height:80px;margin-top:4px;';
                area.appendChild(div);
                const chart = LightweightCharts.createChart(div, {
                    width: div.clientWidth || area.clientWidth,
                    height: 80,
                    layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                    grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
                    rightPriceScale: { borderColor: '#333' },
                    timeScale: { visible: false },
                });
                const rs = chart.addLineSeries({ color: '#9b59b6', lineWidth: 1 });
                rs.setData(rsi);
                // Overbought/oversold lines
                chart.timeScale().fitContent();
                new ResizeObserver(() => chart.applyOptions({ width: div.clientWidth })).observe(div);
            }

            if (ind === 'macd') {
                const macdData = DataService.calcMACD(data);
                const div = document.createElement('div');
                div.style.cssText = 'height:80px;margin-top:4px;';
                area.appendChild(div);
                const chart = LightweightCharts.createChart(div, {
                    width: div.clientWidth || area.clientWidth,
                    height: 80,
                    layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                    grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
                    rightPriceScale: { borderColor: '#333' },
                    timeScale: { visible: false },
                });
                const hist = chart.addHistogramSeries({ priceFormat: { type: 'price' }, priceScaleId: '' });
                hist.setData(macdData.histogram);
                const ml = chart.addLineSeries({ color: '#4488ff', lineWidth: 1, priceScaleId: '' });
                ml.setData(macdData.macd);
                const sl = chart.addLineSeries({ color: '#ff8800', lineWidth: 1, priceScaleId: '' });
                sl.setData(macdData.signal);
                chart.timeScale().fitContent();
                new ResizeObserver(() => chart.applyOptions({ width: div.clientWidth })).observe(div);
            }
        });
    }

    return { render, instances };
})();

// Compare module
const Compare = (() => {
    function render(container, ticker) {
        const tickers = ticker ? [ticker] : [];
        container.innerHTML = `
            <div class="comp-view">
                <div class="comp-header">
                    <h2 style="color:var(--amber);font-size:14px;margin-bottom:6px;">COMPARE SECURITIES</h2>
                    <div class="comp-inputs">
                        <input type="text" class="comp-ticker" placeholder="Ticker 1" value="${tickers[0]||''}">
                        <span class="comp-vs">vs</span>
                        <input type="text" class="comp-ticker" placeholder="Ticker 2">
                        <input type="text" class="comp-ticker" placeholder="Ticker 3">
                        <button class="btn-terminal" id="comp-run-btn">COMPARE</button>
                    </div>
                </div>
                <div class="comp-chart" id="comp-chart-area" style="min-height:350px;background:var(--bg-card);border:1px solid var(--border);"></div>
                <div class="comp-table" id="comp-table-area" style="margin-top:8px;"></div>
            </div>`;

        container.querySelector('#comp-run-btn').addEventListener('click', () => {
            const inputs = container.querySelectorAll('.comp-ticker');
            const syms = [...inputs].map(i => i.value.toUpperCase().trim()).filter(Boolean);
            if (syms.length < 2) { Terminal.notify('Enter at least 2 tickers', 'error'); return; }
            runCompare(container, syms);
        });
    }

    async function runCompare(container, tickers) {
        const chartArea = container.querySelector('#comp-chart-area');
        const tableArea = container.querySelector('#comp-table-area');
        chartArea.innerHTML = '<div class="loading-spinner" style="margin:20px auto;display:block;"></div>';

        const colors = ['#ffaa00', '#4488ff', '#22c55e', '#ff4444', '#9b59b6'];

        // Create chart
        chartArea.innerHTML = '';
        const chart = LightweightCharts.createChart(chartArea, {
            width: chartArea.clientWidth,
            height: 350,
            layout: { background: { color: '#1a1a1a' }, textColor: '#888' },
            grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
            rightPriceScale: { borderColor: '#333', mode: LightweightCharts.PriceScaleMode.Percentage },
            timeScale: { borderColor: '#333' },
        });

        const quotes = await DataService.getMultipleQuotes(tickers);

        tickers.forEach((ticker, i) => {
            const data = DataService.generateOHLCV(ticker, 252);
            const base = data[0].close;
            const normalized = data.map(d => ({ time: d.time, value: ((d.close - base) / base) * 100 }));
            const s = chart.addLineSeries({ color: colors[i % colors.length], lineWidth: 2, title: ticker });
            s.setData(normalized);
        });

        chart.timeScale().fitContent();
        new ResizeObserver(() => chart.applyOptions({ width: chartArea.clientWidth })).observe(chartArea);

        // Comparison table
        let tableHtml = `<table class="terminal-table"><thead><tr><th>METRIC</th>${tickers.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>`;
        const metrics = ['price','pe','pb','eps','dividend','beta','marketCap'];
        const labels = { price:'Price', pe:'P/E', pb:'P/B', eps:'EPS', dividend:'Dividend', beta:'Beta', marketCap:'Market Cap' };

        for (const m of metrics) {
            tableHtml += `<tr><td style="color:var(--amber)">${labels[m]}</td>`;
            for (const q of quotes) {
                let val = q ? q[m] : '--';
                if (m === 'price' && val) val = '$' + val.toFixed(2);
                else if (m === 'marketCap' && val) val = '$' + (val/1e9).toFixed(1) + 'B';
                else if (val && typeof val === 'number') val = val.toFixed(2);
                tableHtml += `<td>${val || '--'}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        tableArea.innerHTML = tableHtml;
    }

    return { render, run: () => {} };
})();

// Dividends module
const Dividends = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><p>Enter a ticker for dividend analysis</p></div>'; return; }
        const data = await DataService.getQuote(ticker);

        const divYield = data.dividend > 0 ? ((data.dividend / data.price) * 100).toFixed(2) : '0.00';
        const payoutRatio = data.eps > 0 ? ((data.dividend / data.eps) * 100).toFixed(1) : 'N/A';

        container.innerHTML = `
            <div class="dvd-view">
                <div class="section-header">${ticker} — DIVIDEND ANALYSIS</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    <div class="card">
                        <div class="section-header">DIVIDEND SUMMARY</div>
                        <div class="stat-item"><span class="stat-label">Annual Dividend</span><span class="stat-value">$${data.dividend.toFixed(2)}</span></div>
                        <div class="stat-item"><span class="stat-label">Dividend Yield</span><span class="stat-value ${parseFloat(divYield) > 0 ? 'positive' : ''}">${divYield}%</span></div>
                        <div class="stat-item"><span class="stat-label">Payout Ratio</span><span class="stat-value">${payoutRatio}${payoutRatio !== 'N/A' ? '%' : ''}</span></div>
                        <div class="stat-item"><span class="stat-label">Ex-Dividend</span><span class="stat-value">--</span></div>
                        <div class="stat-item"><span class="stat-label">Pay Frequency</span><span class="stat-value">Quarterly</span></div>
                    </div>
                    <div class="card">
                        <div class="section-header">DIVIDEND HISTORY (5Y)</div>
                        <div id="dvd-hist-chart" style="height:200px;"></div>
                    </div>
                </div>
            </div>`;

        // Simple dividend history chart
        if (typeof LightweightCharts !== 'undefined') {
            const chartEl = container.querySelector('#dvd-hist-chart');
            const chart = LightweightCharts.createChart(chartEl, {
                width: chartEl.clientWidth, height: 200,
                layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
            });
            const s = chart.addHistogramSeries({ color: '#22c55e' });
            const divData = [];
            for (let y = 0; y < 5; y++) {
                for (let q = 0; q < 4; q++) {
                    const date = new Date();
                    date.setFullYear(date.getFullYear() - (4 - y));
                    date.setMonth(q * 3);
                    const growth = 1 + y * 0.03;
                    divData.push({ time: Math.floor(date.getTime()/1000), value: (data.dividend/4) * growth });
                }
            }
            s.setData(divData);
            chart.timeScale().fitContent();
        }
    }

    return { render };
})();

// Earnings module
const Earnings = (() => {
    async function render(container, ticker) {
        if (!ticker) { container.innerHTML = '<div class="empty-state"><p>Enter a ticker for earnings data</p></div>'; return; }
        const data = await DataService.getQuote(ticker);

        // Generate simulated earnings history
        const quarters = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i * 3);
            const qLabel = `Q${Math.ceil((d.getMonth()+1)/3)} ${d.getFullYear()}`;
            const estimate = data.eps / 4 * (0.9 + Math.random() * 0.2);
            const actual = estimate * (0.95 + Math.random() * 0.15);
            const surprise = ((actual - estimate) / Math.abs(estimate)) * 100;
            quarters.push({ quarter: qLabel, estimate: estimate.toFixed(2), actual: actual.toFixed(2), surprise: surprise.toFixed(1) });
        }

        container.innerHTML = `
            <div class="ern-view">
                <div class="section-header">${ticker} — EARNINGS</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    <div class="card">
                        <div class="section-header">EARNINGS HISTORY</div>
                        <table class="terminal-table">
                            <thead><tr><th>QUARTER</th><th>ESTIMATE</th><th>ACTUAL</th><th>SURPRISE</th></tr></thead>
                            <tbody>
                                ${quarters.map(q => `<tr>
                                    <td>${q.quarter}</td>
                                    <td>$${q.estimate}</td>
                                    <td>$${q.actual}</td>
                                    <td class="${parseFloat(q.surprise) >= 0 ? 'positive' : 'negative'}">${parseFloat(q.surprise) >= 0 ? '+' : ''}${q.surprise}%</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="card">
                        <div class="section-header">EPS TREND</div>
                        <div id="ern-chart" style="height:200px;"></div>
                    </div>
                </div>
            </div>`;

        if (typeof LightweightCharts !== 'undefined') {
            const chartEl = container.querySelector('#ern-chart');
            const chart = LightweightCharts.createChart(chartEl, {
                width: chartEl.clientWidth, height: 200,
                layout: { background: { color: '#1a1a1a' }, textColor: '#666' },
                grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
            });
            const s = chart.addHistogramSeries({ color: '#ffaa00' });
            const epsData = quarters.map((q, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (7-i)*3);
                return { time: Math.floor(d.getTime()/1000), value: parseFloat(q.actual), color: parseFloat(q.surprise) >= 0 ? '#22c55e' : '#ff4444' };
            });
            s.setData(epsData);
            chart.timeScale().fitContent();
        }
    }

    return { render };
})();
