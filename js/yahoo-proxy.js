// ============================================
// YAHOO-PROXY.JS - Conexión a Yahoo Finance vía proxy
// ============================================

/**
 * Proxy CORS para Yahoo Finance usando allorigos o similar
 */
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
];

/**
 * Fetch datos de Yahoo Finance v1 (chart API)
 */
async function fetchYahooQuote(ticker) {
    const tickerClean = ticker.toUpperCase().trim();
    
    // URLs de Yahoo Finance
    const urls = [
        `https://query1.finance.yahoo.com/v8/finance/chart/${tickerClean}?interval=1d&range=1d`,
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${tickerClean}?modules=price,summaryDetail,defaultKeyStatistics,financialData`
    ];
    
    for (const proxy of CORS_PROXIES) {
        try {
            console.log(`[Yahoo] Intentando con proxy...`);
            
            // Intentar chart API primero (precio actual)
            const chartUrl = proxy + encodeURIComponent(urls[0]);
            const response = await fetch(chartUrl, {
                headers: { 'Accept': 'application/json' },
                timeout: 10000
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const meta = result.meta;
                const quote = result.indicators?.quote?.[0];
                
                const price = meta.regularMarketPrice || meta.previousClose;
                const previousClose = meta.chartPreviousClose || meta.previousClose;
                const change = price - previousClose;
                const changePercent = (change / previousClose) * 100;
                
                return {
                    ticker: tickerClean,
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    currency: meta.currency || 'USD',
                    lastUpdated: new Date().toISOString(),
                    source: 'yahoo-chart'
                };
            }
        } catch (error) {
            console.warn(`[Yahoo] Proxy failed:`, error.message);
            continue;
        }
    }
    
    return null;
}

/**
 * Fetch datos completos de Yahoo Finance
 */
async function fetchYahooFullData(ticker) {
    const tickerClean = ticker.toUpperCase().trim();
    
    for (const proxy of CORS_PROXIES) {
        try {
            const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${tickerClean}?modules=price,summaryDetail,defaultKeyStatistics,financialData`;
            const proxyUrl = proxy + encodeURIComponent(url);
            
            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/json' },
                timeout: 10000
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.quoteSummary?.result?.[0]) {
                const result = data.quoteSummary.result[0];
                const price = result.price;
                const summary = result.summaryDetail || {};
                const stats = result.defaultKeyStatistics || {};
                const financial = result.financialData || {};
                
                const sectorMap = {
                    'Technology': 'Tecnología',
                    'Financial Services': 'Finanzas',
                    'Healthcare': 'Salud',
                    'Consumer Cyclical': 'Consumo',
                    'Consumer Defensive': 'Consumo',
                    'Energy': 'Energía',
                    'Industrials': 'Industriales',
                    'Communication Services': 'Tecnología'
                };
                
                const currentPrice = price.regularMarketPrice?.raw || 0;
                const previousClose = price.regularMarketPreviousClose?.raw || currentPrice;
                
                return {
                    ticker: tickerClean,
                    name: price.longName || price.shortName || tickerClean,
                    sector: sectorMap[price.sector] || 'Tecnología',
                    price: currentPrice,
                    change: currentPrice - previousClose,
                    changePercent: previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
                    currency: price.currency || 'USD',
                    marketCap: price.marketCap?.raw || 0,
                    pe: summary.trailingPE?.raw || null,
                    pb: summary.priceToBook?.raw || null,
                    eps: stats.trailingEps?.raw || null,
                    bookValue: summary.bookValue?.raw || null,
                    dividend: summary.dividendRate?.raw || 0,
                    dividendYield: summary.dividendYield?.raw ? summary.dividendYield.raw * 100 : 0,
                    beta: summary.beta?.raw || 1.0,
                    fcf: financial.freeCashflow?.raw || 0,
                    shares: stats.sharesOutstanding?.raw || 0,
                    revenue: financial.totalRevenue?.raw || 0,
                    debt: financial.totalDebt?.raw || 0,
                    cash: financial.totalCash?.raw || 0,
                    lastUpdated: new Date().toISOString(),
                    source: 'yahoo-full'
                };
            }
        } catch (error) {
            console.warn(`[Yahoo Full] Proxy failed:`, error.message);
            continue;
        }
    }
    
    return null;
}

// ============================================
// Función principal mejorada con Yahoo
// ============================================
async function fetchStockDataWithYahoo(ticker) {
    console.log(`[fetchStockData] Buscando ${ticker}...`);
    
    // 1. Intentar Yahoo Finance primero
    const yahooData = await fetchYahooFullData(ticker);
    if (yahooData && yahooData.price > 0) {
        console.log(`[fetchStockData] ✅ Datos de Yahoo Finance:`, yahooData);
        return yahooData;
    }
    
    // 2. Fallback a base de datos local
    if (typeof STOCK_DATABASE !== 'undefined' && STOCK_DATABASE[ticker.toUpperCase()]) {
        const data = STOCK_DATABASE[ticker.toUpperCase()];
        const variation = (Math.random() - 0.5) * 0.01;
        return {
            ...data,
            price: data.price * (1 + variation),
            change: data.price * variation,
            changePercent: variation * 100,
            source: 'local-database'
        };
    }
    
    // 3. Generar datos sintéticos
    if (typeof generateSyntheticData === 'function') {
        return generateSyntheticData(ticker);
    }
    
    return null;
}

// Exportar
if (typeof window !== 'undefined') {
    window.fetchYahooQuote = fetchYahooQuote;
    window.fetchYahooFullData = fetchYahooFullData;
    window.fetchStockDataWithYahoo = fetchStockDataWithYahoo;
}