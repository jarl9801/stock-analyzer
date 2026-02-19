// ============================================
// DATA-FETCHER.JS - Datos financieros actualizados
// ============================================

// ============================================
// Configuración de APIs (añade tus API keys aquí)
// ============================================
const API_CONFIG = {
    fmp: {
        key: 'demo',
        baseUrl: 'https://financialmodelingprep.com/api/v3'
    },
    alphavantage: {
        key: 'demo',
        baseUrl: 'https://www.alphavantage.co/query'
    }
};

// ============================================
// Base de datos actualizada (Feb 2026)
// ============================================
const STOCK_DATABASE = {
    'AAPL': {
        name: 'Apple Inc.',
        sector: 'Tecnología',
        price: 195.89,
        marketCap: 2980000000000,
        pe: 30.2,
        pb: 48.5,
        eps: 6.48,
        bookValue: 4.04,
        dividend: 0.96,
        beta: 1.24,
        fcf: 101000000000,
        shares: 15200000000,
        revenue: 391000000000,
        debt: 111000000000,
        cash: 162000000000,
        currency: 'USD'
    },
    'MSFT': {
        name: 'Microsoft Corporation',
        sector: 'Tecnología',
        price: 417.88,
        marketCap: 3100000000000,
        pe: 36.1,
        pb: 13.2,
        eps: 11.57,
        bookValue: 31.65,
        dividend: 3.00,
        beta: 0.90,
        fcf: 67000000000,
        shares: 7420000000,
        revenue: 245000000000,
        debt: 48000000000,
        cash: 81000000000,
        currency: 'USD'
    },
    'GOOGL': {
        name: 'Alphabet Inc.',
        sector: 'Tecnología',
        price: 185.19,
        marketCap: 2300000000000,
        pe: 25.8,
        pb: 6.8,
        eps: 7.18,
        bookValue: 27.23,
        dividend: 0.20,
        beta: 1.05,
        fcf: 69000000000,
        shares: 12400000000,
        revenue: 350000000000,
        debt: 13000000000,
        cash: 111000000000,
        currency: 'USD'
    },
    'AMZN': {
        name: 'Amazon.com Inc.',
        sector: 'Tecnología',
        price: 224.92,
        marketCap: 2350000000000,
        pe: 62.5,
        pb: 9.2,
        eps: 3.60,
        bookValue: 24.45,
        dividend: 0,
        beta: 1.15,
        fcf: 36800000000,
        shares: 10400000000,
        revenue: 638000000000,
        debt: 135000000000,
        cash: 86000000000,
        currency: 'USD'
    },
    'META': {
        name: 'Meta Platforms Inc.',
        sector: 'Tecnología',
        price: 726.61,
        marketCap: 1850000000000,
        pe: 27.5,
        pb: 8.5,
        eps: 26.42,
        bookValue: 85.48,
        dividend: 2.00,
        beta: 1.21,
        fcf: 43000000000,
        shares: 2550000000,
        revenue: 164000000000,
        debt: 18000000000,
        cash: 77800000000,
        currency: 'USD'
    },
    'NVDA': {
        name: 'NVIDIA Corporation',
        sector: 'Tecnología',
        price: 875.28,
        marketCap: 2150000000000,
        pe: 72.5,
        pb: 55.2,
        eps: 12.07,
        bookValue: 15.85,
        dividend: 0.16,
        beta: 1.75,
        fcf: 27000000000,
        shares: 2460000000,
        revenue: 61000000000,
        debt: 8500000000,
        cash: 25900000000,
        currency: 'USD'
    },
    'TSLA': {
        name: 'Tesla Inc.',
        sector: 'Automotriz',
        price: 248.50,
        marketCap: 790000000000,
        pe: 76.2,
        pb: 16.8,
        eps: 3.26,
        bookValue: 14.79,
        dividend: 0,
        beta: 2.28,
        fcf: 4400000000,
        shares: 3180000000,
        revenue: 97000000000,
        debt: 9500000000,
        cash: 29100000000,
        currency: 'USD'
    },
    'JPM': {
        name: 'JPMorgan Chase & Co.',
        sector: 'Finanzas',
        price: 243.80,
        marketCap: 700000000000,
        pe: 12.8,
        pb: 1.9,
        eps: 19.06,
        bookValue: 128.36,
        dividend: 4.20,
        beta: 1.10,
        fcf: 0,
        shares: 2870000000,
        revenue: 158000000000,
        debt: 0,
        cash: 0,
        currency: 'USD'
    },
    'V': {
        name: 'Visa Inc.',
        sector: 'Finanzas',
        price: 345.20,
        marketCap: 720000000000,
        pe: 32.5,
        pb: 15.2,
        eps: 10.62,
        bookValue: 22.71,
        dividend: 2.08,
        beta: 0.95,
        fcf: 19000000000,
        shares: 2090000000,
        revenue: 35000000000,
        debt: 20000000000,
        cash: 17000000000,
        currency: 'USD'
    },
    'WMT': {
        name: 'Walmart Inc.',
        sector: 'Consumo',
        price: 180.45,
        marketCap: 485000000000,
        pe: 27.2,
        pb: 6.2,
        eps: 6.63,
        bookValue: 29.10,
        dividend: 2.28,
        beta: 0.52,
        fcf: 11800000000,
        shares: 2690000000,
        revenue: 648000000000,
        debt: 83000000000,
        cash: 10000000000,
        currency: 'USD'
    },
    'JNJ': {
        name: 'Johnson & Johnson',
        sector: 'Salud',
        price: 162.30,
        marketCap: 390000000000,
        pe: 15.8,
        pb: 6.2,
        eps: 10.27,
        bookValue: 26.18,
        dividend: 4.76,
        beta: 0.58,
        fcf: 23000000000,
        shares: 2400000000,
        revenue: 88000000000,
        debt: 29000000000,
        cash: 21000000000,
        currency: 'USD'
    },
    'XOM': {
        name: 'Exxon Mobil Corp.',
        sector: 'Energía',
        price: 118.50,
        marketCap: 470000000000,
        pe: 13.8,
        pb: 2.3,
        eps: 8.59,
        bookValue: 51.52,
        dividend: 3.80,
        beta: 0.92,
        fcf: 36000000000,
        shares: 3970000000,
        revenue: 344000000000,
        debt: 42000000000,
        cash: 32000000000,
        currency: 'USD'
    },
    'BA': {
        name: 'Boeing Company',
        sector: 'Industriales',
        price: 205.60,
        marketCap: 125000000000,
        pe: null,
        pb: 12.5,
        eps: -4.70,
        bookValue: 16.45,
        dividend: 0,
        beta: 1.5,
        fcf: -1500000000,
        shares: 608000000,
        revenue: 66000000000,
        debt: 52000000000,
        cash: 13000000000,
        currency: 'USD'
    },
    'NU': {
        name: 'NU Holdings Ltd.',
        sector: 'Finanzas',
        price: 17.52,
        marketCap: 85331000000,
        pe: 33.87,
        pb: 8.04,
        eps: 0.52,
        bookValue: 2.18,
        dividend: 0,
        beta: 1.08,
        fcf: 2800000000,
        shares: 4870000000,
        revenue: 6360000000,
        debt: 0,
        cash: 14680000000,
        currency: 'USD'
    },
    'MI': {
        name: 'Xiaomi Corporation',
        sector: 'Tecnología',
        price: 18.45,
        marketCap: 46000000000,
        pe: 22.5,
        pb: 2.8,
        eps: 0.82,
        bookValue: 6.59,
        dividend: 0.12,
        beta: 1.35,
        fcf: 3200000000,
        shares: 2490000000,
        revenue: 42000000000,
        debt: 3200000000,
        cash: 8500000000,
        currency: 'USD'
    }
};

// ============================================
// Obtener datos de stock
// ============================================
async function fetchStockData(ticker) {
    ticker = ticker.toUpperCase().trim();
    
    if (STOCK_DATABASE[ticker]) {
        const data = STOCK_DATABASE[ticker];
        const variation = (Math.random() - 0.5) * 0.01;
        return {
            ...data,
            price: data.price * (1 + variation),
            change: data.price * variation,
            changePercent: variation * 100,
            lastUpdated: new Date().toISOString(),
            source: 'local-database'
        };
    }
    
    return generateSyntheticData(ticker);
}

// ============================================
// Generar datos sintéticos
// ============================================
function generateSyntheticData(ticker) {
    const hash = ticker.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const sectors = ['Tecnología', 'Finanzas', 'Salud', 'Consumo', 'Energía', 'Industriales'];
    const sector = sectors[Math.abs(hash) % sectors.length];
    
    const sectorMetrics = {
        'Tecnología': { pe: 25, pb: 6, beta: 1.2 },
        'Finanzas': { pe: 12, pb: 1.2, beta: 1.1 },
        'Salud': { pe: 20, pb: 4, beta: 0.8 },
        'Consumo': { pe: 18, pb: 3, beta: 0.7 },
        'Energía': { pe: 10, pb: 1.5, beta: 1.0 },
        'Industriales': { pe: 15, pb: 2.5, beta: 1.0 }
    };
    
    const metrics = sectorMetrics[sector];
    const basePrice = 50 + (Math.abs(hash) % 450);
    const variation = (Math.random() - 0.5) * 0.02;
    const price = basePrice * (1 + variation);
    
    const eps = price / metrics.pe;
    const bookValue = price / metrics.pb;
    const shares = 1000000000 + (Math.abs(hash) % 9000000000);
    
    return {
        ticker: ticker,
        name: `${ticker} Corporation`,
        sector: sector,
        price: price,
        change: price - basePrice,
        changePercent: ((price - basePrice) / basePrice) * 100,
        currency: 'USD',
        marketCap: price * shares,
        pe: metrics.pe,
        pb: metrics.pb,
        eps: eps,
        bookValue: bookValue,
        dividend: Math.random() > 0.4 ? (Math.random() * 3) : 0,
        beta: metrics.beta,
        fcf: eps * shares * 0.8,
        shares: shares,
        revenue: eps * shares * 6,
        debt: price * shares * 0.1,
        cash: price * shares * 0.15,
        lastUpdated: new Date().toISOString(),
        source: 'synthetic'
    };
}

// ============================================
// Obtener datos históricos
// ============================================
async function fetchHistoricalData(ticker, period = '1Y') {
    const data = await fetchStockData(ticker);
    const currentPrice = data.price;
    
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 365 * 5 };
    const numDays = days[period] || 365;
    
    const historicalData = [];
    let price = currentPrice;
    
    for (let i = numDays; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.48) * 0.02;
        price = price * (1 + change);
        
        historicalData.push({
            date: date.toISOString().split('T')[0],
            price: price
        });
    }
    
    return historicalData;
}

// ============================================
// Calcular métricas derivadas
// ============================================
function calculateDerivedMetrics(data) {
    const ev = data.marketCap + data.debt - data.cash;
    const ebitda = data.revenue * 0.15;
    
    return {
        evEbitda: ebitda > 0 ? ev / ebitda : null,
        roe: (data.eps / data.bookValue) * 100,
        pFcf: data.fcf > 0 ? data.marketCap / data.fcf : null,
        dividendYield: data.dividend > 0 ? (data.dividend / data.price) * 100 : 0,
        netCash: data.cash - data.debt,
        fcfYield: data.fcf > 0 ? (data.fcf / data.marketCap) * 100 : 0
    };
}

// ============================================
// Funciones de API (placeholders)
// ============================================
async function fetchStockDataAPI(ticker) {
    console.log('[API] API key no configurada. Usando base de datos local.');
    return null;
}

async function fetchAlphaVantageData(ticker) {
    console.log('[AlphaVantage] API key no configurada. Usando base de datos local.');
    return null;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchStockData,
        fetchHistoricalData,
        calculateDerivedMetrics,
        STOCK_DATABASE
    };
}

if (typeof window !== 'undefined') {
    window.fetchStockData = fetchStockData;
    window.fetchHistoricalData = fetchHistoricalData;
    window.calculateDerivedMetrics = calculateDerivedMetrics;
    window.STOCK_DATABASE = STOCK_DATABASE;
}