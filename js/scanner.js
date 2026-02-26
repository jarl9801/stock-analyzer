// ============================================
// SCANNER.JS - Opportunity Scanner (Buy the Dip)
// ============================================

// Universe: ~100 S&P 500 + ~40 DAX tickers
const SCANNER_UNIVERSE = {
    US: [
        'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','JPM','V','WMT',
        'JNJ','UNH','XOM','BAC','PG','HD','CVX','MA','LLY','ABBV',
        'MRK','PEP','KO','COST','AVGO','TMO','MCD','CSCO','ACN','ABT',
        'DHR','TXN','NEE','LIN','PM','UNP','HON','LOW','INTC','QCOM',
        'AMGN','INTU','AMAT','IBM','CAT','GE','BA','RTX','GS','AXP',
        'ISRG','MDLZ','BKNG','ADI','SYK','GILD','MMC','REGN','VRTX','PYPL',
        'ADBE','CRM','NOW','PANW','SNPS','CDNS','NFLX','AMD','MU','LRCX',
        'KLAC','MRVL','ON','FTNT','CRWD','ZS','DDOG','NET','DIS','CMCSA',
        'NKE','SBUX','TGT','F','GM','DAL','UAL','LUV','DE','MMM',
        'DVN','COP','EOG','SLB','OXY','PXD','HAL','BKR','FANG','MPC'
    ],
    DE: [
        'SAP.DE','SIE.DE','ALV.DE','DTE.DE','AIR.DE','BAS.DE','BAYN.DE','BMW.DE',
        'MBG.DE','VOW3.DE','ADS.DE','MUV2.DE','DB1.DE','DBK.DE','IFX.DE','HEN3.DE',
        'RWE.DE','DPW.DE','FRE.DE','MTX.DE','HEI.DE','BEI.DE','CON.DE','ENR.DE',
        'FME.DE','LIN.DE','MRK.DE','SHL.DE','VNA.DE','ZAL.DE','PUM.DE','LEG.DE',
        'SRT3.DE','1COV.DE','HNR1.DE','EVK.DE','DTG.DE','TKA.DE','RHM.DE','QIA.DE'
    ]
};

let scannerResults = [];
let scannerRunning = false;

// ============================================
// Run Scanner
// ============================================
async function runOpportunityScanner() {
    if (scannerRunning) return;
    scannerRunning = true;

    const minDrop = parseFloat(document.getElementById('scanner-min-drop').value) || 10;
    const marketFilter = document.getElementById('scanner-market').value;
    const sectorFilter = document.getElementById('scanner-sector').value;

    // Build ticker list
    let tickers = [];
    if (marketFilter === 'us' || marketFilter === 'both') tickers = tickers.concat(SCANNER_UNIVERSE.US);
    if (marketFilter === 'de' || marketFilter === 'both') tickers = tickers.concat(SCANNER_UNIVERSE.DE);

    const container = document.getElementById('scanner-results');
    const progressEl = document.getElementById('scanner-progress');
    const scanBtn = document.getElementById('scanner-run-btn');

    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ SCANNING...';
    container.innerHTML = '';
    progressEl.style.display = 'block';

    const opportunities = [];
    let processed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);

        const results = await Promise.all(batch.map(async (ticker) => {
            try {
                return await scanTicker(ticker);
            } catch (e) {
                console.warn(`[Scanner] Failed ${ticker}:`, e.message);
                return null;
            }
        }));

        results.forEach(r => { if (r) opportunities.push(r); });
        processed += batch.length;

        // Update progress
        const pct = Math.min(100, Math.round((processed / tickers.length) * 100));
        progressEl.innerHTML = `<div class="scanner-progress-bar"><div class="scanner-progress-fill" style="width:${pct}%"></div></div><span>${processed}/${tickers.length} tickers scanned — ${opportunities.length} opportunities found</span>`;

        // Small delay between batches
        if (i + batchSize < tickers.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // Filter by min drop
    let filtered = opportunities.filter(o => o.drop >= minDrop);

    // Filter by sector
    if (sectorFilter && sectorFilter !== 'all') {
        const sectorMap = {
            'tech': 'Tecnología', 'finance': 'Finanzas', 'health': 'Salud',
            'consumer': 'Consumo', 'energy': 'Energía', 'industrial': 'Industriales'
        };
        filtered = filtered.filter(o => o.sector === sectorMap[sectorFilter]);
    }

    // Score and sort
    filtered.forEach(o => {
        o.score = calculateOpportunityScore(o);
    });
    filtered.sort((a, b) => b.score - a.score);

    scannerResults = filtered;
    localStorage.setItem('stockAnalyzer_scanner_results', JSON.stringify({
        results: filtered,
        timestamp: new Date().toISOString()
    }));

    renderScannerResults(filtered);
    progressEl.style.display = 'none';
    scanBtn.disabled = false;
    scanBtn.textContent = '🔍 RUN SCANNER';
    scannerRunning = false;
}

// ============================================
// Scan a single ticker
// ============================================
async function scanTicker(ticker) {
    // Fetch current data
    let data;
    try {
        data = await fetchStockData(ticker);
    } catch (e) {
        return null;
    }
    if (!data || !data.price || data.price <= 0) return null;

    // Try to get 1-month historical for drop calculation
    let drop = 0;
    let price30dAgo = null;

    // Try Yahoo chart for 1mo data
    if (typeof fetchYahooQuote === 'function') {
        try {
            for (const proxy of (typeof CORS_PROXIES !== 'undefined' ? CORS_PROXIES : [])) {
                try {
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
                    const resp = await fetch(proxy + encodeURIComponent(url), {
                        headers: { 'Accept': 'application/json' }
                    });
                    if (!resp.ok) continue;
                    const chartData = await resp.json();
                    if (chartData.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                        const closes = chartData.chart.result[0].indicators.quote[0].close.filter(c => c != null);
                        if (closes.length >= 2) {
                            price30dAgo = closes[0];
                            drop = ((price30dAgo - data.price) / price30dAgo) * 100;
                        }
                    }
                    break;
                } catch (e) { continue; }
            }
        } catch (e) { /* ignore */ }
    }

    // If no historical data, estimate from local DB
    if (price30dAgo === null && typeof STOCK_DATABASE !== 'undefined' && STOCK_DATABASE[ticker]) {
        const dbPrice = STOCK_DATABASE[ticker].price;
        if (dbPrice && data.price < dbPrice) {
            drop = ((dbPrice - data.price) / dbPrice) * 100;
            price30dAgo = dbPrice;
        }
    }

    if (drop <= 0) return null;

    return {
        ticker: data.ticker || ticker,
        name: data.name || ticker,
        sector: data.sector || 'Unknown',
        price: data.price,
        price30dAgo: price30dAgo,
        drop: drop,
        pe: data.pe || null,
        marketCap: data.marketCap || 0,
        revenueGrowth: null, // Would need additional API call
        beta: data.beta || 1.0,
        dividendYield: data.dividend ? (data.dividend / data.price * 100) : 0,
        fcfYield: data.fcf && data.marketCap ? (data.fcf / data.marketCap * 100) : 0
    };
}

// ============================================
// Score opportunity (0-100)
// ============================================
function calculateOpportunityScore(opp) {
    let score = 0;

    // Drop magnitude (max 40 pts)
    score += Math.min(40, opp.drop * 1.5);

    // P/E quality (max 20 pts) — lower P/E = better
    if (opp.pe && opp.pe > 0) {
        if (opp.pe < 10) score += 20;
        else if (opp.pe < 15) score += 15;
        else if (opp.pe < 20) score += 10;
        else if (opp.pe < 30) score += 5;
    }

    // FCF yield (max 15 pts)
    if (opp.fcfYield > 0) {
        score += Math.min(15, opp.fcfYield * 2);
    }

    // Dividend (max 10 pts)
    if (opp.dividendYield > 0) {
        score += Math.min(10, opp.dividendYield * 2.5);
    }

    // Beta stability bonus (max 15 pts) — lower beta = safer dip buy
    if (opp.beta && opp.beta < 1.5) {
        score += Math.max(0, 15 - (opp.beta * 10));
    }

    return Math.round(Math.min(100, score));
}

// ============================================
// Render scanner results
// ============================================
function renderScannerResults(results) {
    const container = document.getElementById('scanner-results');

    if (!results || results.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No opportunities found matching your criteria. Try lowering the minimum drop %.</p>';
        return;
    }

    let html = '<div class="scanner-cards">';

    results.forEach(opp => {
        const scoreClass = opp.score >= 60 ? 'score-strong' : opp.score >= 35 ? 'score-watch' : 'score-risky';
        const scoreLabel = opp.score >= 60 ? 'STRONG BUY' : opp.score >= 35 ? 'WATCH' : 'RISKY';
        const badgeColor = opp.score >= 60 ? 'var(--green)' : opp.score >= 35 ? 'var(--amber)' : 'var(--red)';

        const marketCapStr = opp.marketCap > 0 ? formatNumber(opp.marketCap) : 'N/A';
        const peStr = opp.pe ? opp.pe.toFixed(1) : 'N/A';

        html += `
            <div class="scanner-card ${scoreClass}" onclick="analyzeTicker('${opp.ticker}')">
                <div class="scanner-card-header">
                    <div>
                        <span class="scanner-ticker">${opp.ticker}</span>
                        <span class="scanner-name">${opp.name}</span>
                    </div>
                    <div class="scanner-score-badge" style="color:${badgeColor};border-color:${badgeColor};">
                        ${opp.score} — ${scoreLabel}
                    </div>
                </div>
                <div class="scanner-card-metrics">
                    <div class="scanner-metric">
                        <span class="scanner-metric-label">Price</span>
                        <span class="scanner-metric-value">$${opp.price.toFixed(2)}</span>
                    </div>
                    <div class="scanner-metric">
                        <span class="scanner-metric-label">30d Drop</span>
                        <span class="scanner-metric-value negative">-${opp.drop.toFixed(1)}%</span>
                    </div>
                    <div class="scanner-metric">
                        <span class="scanner-metric-label">P/E</span>
                        <span class="scanner-metric-value">${peStr}</span>
                    </div>
                    <div class="scanner-metric">
                        <span class="scanner-metric-label">Mkt Cap</span>
                        <span class="scanner-metric-value">${marketCapStr}</span>
                    </div>
                </div>
                <div class="scanner-card-actions">
                    <button onclick="event.stopPropagation(); addToWatchlist('${opp.ticker}')" class="btn btn-secondary" style="padding:4px 10px;font-size:11px;">⭐ Watchlist</button>
                    <span class="scanner-sector">${opp.sector}</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// Load cached results on init
// ============================================
function loadScannerCache() {
    const cached = localStorage.getItem('stockAnalyzer_scanner_results');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (data.results && data.results.length > 0) {
                scannerResults = data.results;
                renderScannerResults(data.results);
                const time = new Date(data.timestamp).toLocaleString();
                const progress = document.getElementById('scanner-progress');
                if (progress) progress.innerHTML = `<span style="color:var(--gray);">Last scan: ${time} — ${data.results.length} opportunities</span>`;
                if (progress) progress.style.display = 'block';
            }
        } catch (e) { /* ignore */ }
    }
}

document.addEventListener('DOMContentLoaded', loadScannerCache);
