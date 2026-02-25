// ============================================
// PRICE-CHART.JS - Yahoo Finance Chart with Chart.js
// ============================================

let priceChartInstance = null;
let currentChartTicker = null;
let currentChartRange = '6mo';

const CHART_CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
];

/**
 * Fetch price history from Yahoo Finance chart API
 */
async function fetchYahooPriceHistory(ticker, range = '6mo') {
    const interval = (range === '5y') ? '1wk' : (range === '1y' ? '1d' : '1d');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;

    for (const proxy of CHART_CORS_PROXIES) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const resp = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/json' }
            });
            if (!resp.ok) continue;

            const data = await resp.json();
            const result = data?.chart?.result?.[0];
            if (!result) continue;

            const timestamps = result.timestamp;
            const closes = result.indicators?.quote?.[0]?.close;
            if (!timestamps || !closes) continue;

            const points = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] != null) {
                    points.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        price: closes[i]
                    });
                }
            }
            return points;
        } catch (e) {
            console.warn('[PriceChart] Proxy failed:', e.message);
            continue;
        }
    }
    return null;
}

/**
 * Render or update the price chart
 */
async function renderPriceChart(ticker, range) {
    range = range || currentChartRange;
    currentChartTicker = ticker;
    currentChartRange = range;

    const section = document.getElementById('price-chart-section');
    const statusEl = document.getElementById('chart-status');
    const canvas = document.getElementById('price-chart-canvas');
    if (!section || !canvas) return;

    section.style.display = 'block';
    if (statusEl) statusEl.textContent = 'Loading chart...';

    // Update active range button
    document.querySelectorAll('.chart-range-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });

    let points = await fetchYahooPriceHistory(ticker, range);

    // Fallback to local synthetic data
    if (!points || points.length === 0) {
        if (statusEl) statusEl.textContent = 'Chart unavailable — datos locales';
        // Generate synthetic history as fallback
        points = generateLocalHistory(ticker, range);
        if (!points || points.length === 0) {
            if (statusEl) statusEl.textContent = 'Chart unavailable';
            return;
        }
    } else {
        if (statusEl) statusEl.textContent = '';
    }

    const labels = points.map(p => p.date);
    const prices = points.map(p => p.price);
    const isPositive = prices[prices.length - 1] >= prices[0];
    const lineColor = isPositive ? '#00FF00' : '#FF3333';

    if (priceChartInstance) {
        priceChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: prices,
                borderColor: lineColor,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: lineColor,
                fill: true,
                backgroundColor: isPositive
                    ? 'rgba(0, 255, 0, 0.05)'
                    : 'rgba(255, 51, 51, 0.05)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111111',
                    titleColor: '#888888',
                    bodyColor: lineColor,
                    borderColor: '#333333',
                    borderWidth: 1,
                    titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 13 },
                    callbacks: {
                        label: ctx => '$' + ctx.parsed.y.toFixed(2)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#222222', drawBorder: false },
                    ticks: {
                        color: '#888888',
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    grid: { color: '#222222', drawBorder: false },
                    ticks: {
                        color: '#888888',
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        callback: v => '$' + v.toFixed(0)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Generate local synthetic history as fallback
 */
function generateLocalHistory(ticker, range) {
    const db = (typeof STOCK_DATABASE !== 'undefined') ? STOCK_DATABASE : {};
    const stock = db[ticker];
    const basePrice = stock ? stock.price : 100;
    const days = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825 };
    const numDays = days[range] || 180;
    const points = [];
    let price = basePrice * (0.85 + Math.random() * 0.3);

    for (let i = numDays; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        price *= 1 + (Math.random() - 0.48) * 0.02;
        points.push({ date: d.toISOString().split('T')[0], price });
    }
    return points;
}

/**
 * Change chart time range
 */
function changeChartRange(range) {
    if (currentChartTicker) {
        renderPriceChart(currentChartTicker, range);
    }
}

// Expose globally
if (typeof window !== 'undefined') {
    window.renderPriceChart = renderPriceChart;
    window.changeChartRange = changeChartRange;
}
