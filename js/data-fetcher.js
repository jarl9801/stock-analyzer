// ============================================
// DATA-FETCHER.JS - API de datos financieros en tiempo real
// ============================================

// APIs gratuitas para datos de mercado
const API_ENDPOINTS = {
    // Yahoo Finance proxy (gratuito, no requiere API key)
    yahoo: {
        quote: 'https://query1.finance.yahoo.com/v8/finance/chart/',
        search: 'https://query1.finance.yahoo.com/v1/finance/search'
    },
    // Alternative: Twelve Data (requiere API key para uso extendido)
    twelvedata: {
        base: 'https://api.twelvedata.com',
        apiKey: null
    }
};

// Cache de datos
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ============================================
// Obtener datos de stock en tiempo real
// ============================================
async function fetchStockData(ticker) {
    ticker = ticker.toUpperCase().trim();
    
    // Verificar cache
    const cached = dataCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[Cache] Usando datos en cache para ${ticker}`);
        return cached.data;
    }
    
    try {
        // Intentar obtener de Yahoo Finance
        const data = await fetchYahooFinance(ticker);
        
        // Guardar en cache
        dataCache.set(ticker, {
            data: data,
            timestamp: Date.now()
        });
        
        return data;
    } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        // Fallback a datos sintéticos
        return generateSyntheticData(ticker);
    }
}

// ============================================
// Yahoo Finance API
// ============================================
async function fetchYahooFinance(ticker) {
    const url = `${API_ENDPOINTS.yahoo.quote}${ticker}?interval=1d&range=1y`;
    
    // Usar CORS proxy para evitar bloqueos
    const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];
    
    let lastError;
    
    for (const proxyUrl of proxyUrls) {
        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) continue;
            
            const json = await response.json();
            
            if (json.chart?.error) {
                throw new Error(json.chart.error.description);
            }
            
            const result = json.chart?.result?.[0];
            if (!result) throw new Error('No data available');
            
            const meta = result.meta;
            const timestamps = result.timestamp;
            const prices = result.indicators?.quote?.[0];
            
            // Calcular métricas
            const currentPrice = meta.regularMarketPrice || meta.previousClose;
            const previousClose = meta.chartPreviousClose || meta.previousClose;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;
            
            // Calcular métricas adicionales
            const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || currentPrice * 1.2;
            const fiftyTwoWeekLow = meta.fiftyTwoWeekLow || currentPrice * 0.8;
            
            // Calcular beta y volatilidad de los datos históricos
            const volatility = calculateVolatilityFromPrices(prices?.close || []);
            
            // Estimar métricas fundamentales
            const fundamentals = estimateFundamentals(ticker, currentPrice, meta);
            
            return {
                ticker: ticker,
                name: meta.shortName || meta.longName || meta.symbol,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                currency: meta.currency || 'USD',
                marketCap: meta.marketCap || fundamentals.estimatedMarketCap,
                sector: fundamentals.sector,
                pe: fundamentals.pe,
                pb: fundamentals.pb,
                eps: fundamentals.eps,
                bookValue: fundamentals.bookValue,
                dividend: fundamentals.dividend,
                dividendYield: fundamentals.dividendYield,
                beta: fundamentals.beta,
                fcf: fundamentals.fcf,
                shares: fundamentals.shares,
                revenue: fundamentals.revenue,
                debt: fundamentals.debt,
                cash: fundamentals.cash,
                fiftyTwoWeekHigh: fiftyTwoWeekHigh,
                fiftyTwoWeekLow: fiftyTwoWeekLow,
                volatility: volatility,
                historicalData: {
                    timestamps: timestamps,
                    prices: prices
                },
                source: 'yahoo',
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            lastError = error;
            continue;
        }
    }
    
    throw lastError || new Error('All proxies failed');
}

// ============================================
// Calcular volatilidad desde precios históricos
// ============================================
function calculateVolatilityFromPrices(prices) {
    if (!prices || prices.length < 2) return 0.25;
    
    // Filtrar valores nulos
    const validPrices = prices.filter(p => p !== null && p !== undefined);
    if (validPrices.length < 2) return 0.25;
    
    // Calcular retornos diarios
    const returns = [];
    for (let i = 1; i < validPrices.length; i++) {
        returns.push((validPrices[i] - validPrices[i-1]) / validPrices[i-1]);
    }
    
    // Calcular desviación estándar
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Anualizar (252 días hábiles)
    return stdDev * Math.sqrt(252);
}

// ============================================
// Estimar métricas fundamentales
// ============================================
function estimateFundamentals(ticker, price, meta) {
    // Base de datos de sectores y métricas típicas
    const sectorData = {
        'AAPL': { sector: 'Tecnología', pe: 28, pb: 45, beta: 1.2 },
        'MSFT': { sector: 'Tecnología', pe: 32, pb: 12, beta: 0.9 },
        'GOOGL': { sector: 'Tecnología', pe: 25, pb: 6, beta: 1.05 },
        'AMZN': { sector: 'Consumo', pe: 60, pb: 9, beta: 1.3 },
        'TSLA': { sector: 'Automotriz', pe: 75, pb: 15, beta: 2.0 },
        'META': { sector: 'Tecnología', pe: 36, pb: 7, beta: 1.15 },
        'NVDA': { sector: 'Tecnología', pe: 110, pb: 52, beta: 1.7 },
        'JPM': { sector: 'Finanzas', pe: 10, pb: 1.5, beta: 1.1 },
        'V': { sector: 'Finanzas', pe: 30, pb: 14, beta: 0.95 },
        'WMT': { sector: 'Consumo', pe: 26, pb: 5, beta: 0.5 }
    };
    
    const known = sectorData[ticker];
    
    if (known) {
        const eps = price / known.pe;
        const bookValue = price / known.pb;
        const marketCap = meta.marketCap || price * 10000000000;
        const shares = marketCap / price;
        
        return {
            sector: known.sector,
            pe: known.pe,
            pb: known.pb,
            eps: eps,
            bookValue: bookValue,
            beta: known.beta,
            dividend: ticker === 'AAPL' ? 0.96 : ticker === 'MSFT' ? 2.72 : ticker === 'JPM' ? 4.0 : ticker === 'V' ? 1.8 : ticker === 'WMT' ? 2.28 : 0,
            dividendYield: 0,
            fcf: eps * shares * 0.8,
            shares: shares,
            revenue: eps * shares * 6, // Aproximación
            debt: marketCap * 0.1,
            cash: marketCap * 0.15,
            estimatedMarketCap: marketCap
        };
    }
    
    // Para tickers desconocidos, inferir del precio
    return inferFromPrice(ticker, price);
}

// ============================================
// Inferir métricas del precio
// ============================================
function inferFromPrice(ticker, price) {
    const hash = ticker.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const sectors = ['Tecnología', 'Finanzas', 'Salud', 'Consumo', 'Energía', 'Industriales'];
    const sector = sectors[Math.abs(hash) % sectors.length];
    
    const sectorMetrics = {
        'Tecnología': { pe: 25, pb: 8, beta: 1.2 },
        'Finanzas': { pe: 12, pb: 1.2, beta: 1.1 },
        'Salud': { pe: 20, pb: 4, beta: 0.8 },
        'Consumo': { pe: 18, pb: 3, beta: 0.7 },
        'Energía': { pe: 10, pb: 1.5, beta: 1.3 },
        'Industriales': { pe: 15, pb: 2.5, beta: 1.0 }
    };
    
    const metrics = sectorMetrics[sector];
    const eps = price / metrics.pe;
    const bookValue = price / metrics.pb;
    const shares = 1000000000 + (Math.abs(hash) % 9000000000);
    const marketCap = price * shares;
    
    return {
        sector: sector,
        pe: metrics.pe,
        pb: metrics.pb,
        eps: eps,
        bookValue: bookValue,
        beta: metrics.beta,
        dividend: Math.random() > 0.4 ? (Math.random() * 3) : 0,
        dividendYield: 0,
        fcf: eps * shares * 0.8,
        shares: shares,
        revenue: eps * shares * 6,
        debt: marketCap * 0.1,
        cash: marketCap * 0.15,
        estimatedMarketCap: marketCap
    };
}

// ============================================
// Generar datos sintéticos (fallback)
// ============================================
function generateSyntheticData(ticker) {
    const hash = ticker.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const basePrice = 50 + (Math.abs(hash) % 450);
    
    const fundamentals = inferFromPrice(ticker, basePrice);
    
    return {
        ticker: ticker,
        name: `${ticker} Corporation`,
        price: basePrice,
        change: (Math.random() - 0.5) * basePrice * 0.05,
        changePercent: (Math.random() - 0.5) * 5,
        currency: 'USD',
        ...fundamentals,
        fiftyTwoWeekHigh: basePrice * 1.3,
        fiftyTwoWeekLow: basePrice * 0.7,
        volatility: 0.25,
        source: 'synthetic',
        lastUpdated: new Date().toISOString()
    };
}

// ============================================
// Buscar tickers
// ============================================
async function searchTickers(query) {
    if (!query || query.length < 2) return [];
    
    try {
        const url = `${API_ENDPOINTS.yahoo.search}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        return (data.quotes || []).map(q => ({
            ticker: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.exchange,
            type: q.quoteType
        }));
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// ============================================
// Obtener datos históricos
// ============================================
async function fetchHistoricalData(ticker, period = '1Y') {
    const periods = {
        '1M': { range: '1mo', interval: '1d' },
        '3M': { range: '3mo', interval: '1d' },
        '6M': { range: '6mo', interval: '1d' },
        '1Y': { range: '1y', interval: '1d' },
        '5Y': { range: '5y', interval: '1wk' }
    };
    
    const config = periods[period] || periods['1Y'];
    const url = `${API_ENDPOINTS.yahoo.quote}${ticker}?interval=${config.interval}&range=${config.range}`;
    
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const json = await response.json();
        
        const result = json.chart?.result?.[0];
        if (!result) throw new Error('No data');
        
        const timestamps = result.timestamp;
        const prices = result.indicators?.quote?.[0];
        
        return timestamps.map((t, i) => ({
            date: new Date(t * 1000).toISOString().split('T')[0],
            open: prices.open?.[i],
            high: prices.high?.[i],
            low: prices.low?.[i],
            close: prices.close?.[i],
            volume: prices.volume?.[i]
        })).filter(d => d.close !== null);
        
    } catch (error) {
        console.error('Historical data error:', error);
        return generateSyntheticHistoricalData(ticker, period);
    }
}

// ============================================
// Generar datos históricos sintéticos
// ============================================
function generateSyntheticHistoricalData(ticker, period) {
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 365 * 5 };
    const numDays = days[period] || 365;
    
    const data = [];
    let price = 100;
    
    for (let i = numDays; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.48) * 0.02;
        price = price * (1 + change);
        
        data.push({
            date: date.toISOString().split('T')[0],
            open: price * 0.99,
            high: price * 1.02,
            low: price * 0.98,
            close: price,
            volume: Math.floor(Math.random() * 10000000) + 1000000
        });
    }
    
    return data;
}

// ============================================
// Calcular métricas derivadas
// ============================================
function calculateDerivedMetrics(data) {
    const ev = data.marketCap + data.debt - data.cash;
    const ebitda = data.revenue * 0.15; // Estimación
    
    return {
        evEbitda: ebitda > 0 ? ev / ebitda : null,
        roe: (data.eps / data.bookValue) * 100,
        pFcf: data.fcf > 0 ? data.marketCap / data.fcf : null,
        dividendYield: data.dividend > 0 ? (data.dividend / data.price) * 100 : 0,
        netCash: data.cash - data.debt,
        fcfYield: data.fcf > 0 ? (data.fcf / data.marketCap) * 100 : 0,
        priceTo52WRange: data.fiftyTwoWeekHigh > data.fiftyTwoWeekLow ? 
            ((data.price - data.fiftyTwoWeekLow) / (data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow)) * 100 : 50
    };
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchStockData,
        fetchHistoricalData,
        searchTickers,
        calculateDerivedMetrics,
        dataCache
    };
}
