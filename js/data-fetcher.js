// ============================================
// DATA-FETCHER.JS - Datos financieros (versión simplificada y robusta)
// ============================================

// Base de datos de empresas con datos reales
const STOCK_DATABASE = {
    // Tecnología
    'AAPL': {
        name: 'Apple Inc.',
        sector: 'Tecnología',
        price: 175.50,
        change: 2.30,
        marketCap: 2800000000000,
        pe: 28.5,
        pb: 45.2,
        eps: 6.15,
        bookValue: 3.88,
        dividend: 0.96,
        dividendYield: 0.55,
        beta: 1.2,
        fcf: 99000000000,
        shares: 15400000000,
        revenue: 394000000000,
        debt: 120000000000,
        cash: 169000000000,
        currency: 'USD'
    },
    'MSFT': {
        name: 'Microsoft Corporation',
        sector: 'Tecnología',
        price: 330.20,
        change: -1.50,
        marketCap: 2500000000000,
        pe: 32.1,
        pb: 12.8,
        eps: 10.29,
        bookValue: 25.80,
        dividend: 2.72,
        dividendYield: 0.82,
        beta: 0.9,
        fcf: 65000000000,
        shares: 7400000000,
        revenue: 211000000000,
        debt: 48000000000,
        cash: 104000000000,
        currency: 'USD'
    },
    'GOOGL': {
        name: 'Alphabet Inc.',
        sector: 'Tecnología',
        price: 140.80,
        change: 0.85,
        marketCap: 1800000000000,
        pe: 24.8,
        pb: 6.2,
        eps: 5.68,
        bookValue: 22.70,
        dividend: 0,
        dividendYield: 0,
        beta: 1.05,
        fcf: 60000000000,
        shares: 12700000000,
        revenue: 282000000000,
        debt: 13000000000,
        cash: 118000000000,
        currency: 'USD'
    },
    'AMZN': {
        name: 'Amazon.com Inc.',
        sector: 'Tecnología',
        price: 145.30,
        change: 3.20,
        marketCap: 1500000000000,
        pe: 60.5,
        pb: 8.9,
        eps: 2.40,
        bookValue: 16.30,
        dividend: 0,
        dividendYield: 0,
        beta: 1.3,
        fcf: 35000000000,
        shares: 10300000000,
        revenue: 514000000000,
        debt: 135000000000,
        cash: 64000000000,
        currency: 'USD'
    },
    'META': {
        name: 'Meta Platforms Inc.',
        sector: 'Tecnología',
        price: 310.40,
        change: 4.10,
        marketCap: 800000000000,
        pe: 35.8,
        pb: 7.1,
        eps: 8.67,
        bookValue: 43.70,
        dividend: 0,
        dividendYield: 0,
        beta: 1.15,
        fcf: 38000000000,
        shares: 2570000000,
        revenue: 134000000000,
        debt: 18000000000,
        cash: 65000000000,
        currency: 'USD'
    },
    'NVDA': {
        name: 'NVIDIA Corporation',
        sector: 'Tecnología',
        price: 460.15,
        change: 12.80,
        marketCap: 1100000000000,
        pe: 110.5,
        pb: 52.3,
        eps: 4.16,
        bookValue: 8.79,
        dividend: 0.16,
        dividendYield: 0.03,
        beta: 1.7,
        fcf: 27000000000,
        shares: 2400000000,
        revenue: 60000000000,
        debt: 8500000000,
        cash: 18000000000,
        currency: 'USD'
    },
    'TSLA': {
        name: 'Tesla Inc.',
        sector: 'Automotriz',
        price: 245.60,
        change: -5.40,
        marketCap: 780000000000,
        pe: 75.2,
        pb: 15.3,
        eps: 3.26,
        bookValue: 16.05,
        dividend: 0,
        dividendYield: 0,
        beta: 2.0,
        fcf: 4400000000,
        shares: 3170000000,
        revenue: 81000000000,
        debt: 9500000000,
        cash: 29000000000,
        currency: 'USD'
    },
    // Finanzas
    'JPM': {
        name: 'JPMorgan Chase & Co.',
        sector: 'Finanzas',
        price: 145.80,
        change: 0.50,
        marketCap: 420000000000,
        pe: 10.2,
        pb: 1.5,
        eps: 14.30,
        bookValue: 97.20,
        dividend: 4.00,
        dividendYield: 2.74,
        beta: 1.1,
        fcf: 0,
        shares: 2880000000,
        revenue: 128000000000,
        debt: 0,
        cash: 0,
        currency: 'USD'
    },
    'V': {
        name: 'Visa Inc.',
        sector: 'Finanzas',
        price: 245.60,
        change: 1.20,
        marketCap: 520000000000,
        pe: 30.5,
        pb: 13.8,
        eps: 8.05,
        bookValue: 17.80,
        dividend: 1.80,
        dividendYield: 0.73,
        beta: 0.95,
        fcf: 19000000000,
        shares: 2110000000,
        revenue: 33000000000,
        debt: 20000000000,
        cash: 17000000000,
        currency: 'USD'
    },
    'BAC': {
        name: 'Bank of America Corp.',
        sector: 'Finanzas',
        price: 33.50,
        change: 0.20,
        marketCap: 260000000000,
        pe: 11.5,
        pb: 1.1,
        eps: 2.91,
        bookValue: 30.45,
        dividend: 0.88,
        dividendYield: 2.63,
        beta: 1.4,
        fcf: 0,
        shares: 7760000000,
        revenue: 89000000000,
        debt: 0,
        cash: 0,
        currency: 'USD'
    },
    // Consumo
    'WMT': {
        name: 'Walmart Inc.',
        sector: 'Consumo',
        price: 165.30,
        change: -0.30,
        marketCap: 445000000000,
        pe: 25.8,
        pb: 5.4,
        eps: 6.40,
        bookValue: 30.60,
        dividend: 2.28,
        dividendYield: 1.38,
        beta: 0.5,
        fcf: 11000000000,
        shares: 2690000000,
        revenue: 611000000000,
        debt: 83000000000,
        cash: 10000000000,
        currency: 'USD'
    },
    'PG': {
        name: 'Procter & Gamble Co.',
        sector: 'Consumo',
        price: 155.20,
        change: 0.80,
        marketCap: 365000000000,
        pe: 25.5,
        pb: 8.2,
        eps: 6.09,
        bookValue: 18.93,
        dividend: 3.65,
        dividendYield: 2.35,
        beta: 0.4,
        fcf: 14000000000,
        shares: 2350000000,
        revenue: 82000000000,
        debt: 31000000000,
        cash: 12000000000,
        currency: 'USD'
    },
    'KO': {
        name: 'Coca-Cola Company',
        sector: 'Consumo',
        price: 60.50,
        change: 0.15,
        marketCap: 260000000000,
        pe: 23.5,
        pb: 10.8,
        eps: 2.57,
        bookValue: 5.60,
        dividend: 1.84,
        dividendYield: 3.04,
        beta: 0.6,
        fcf: 9500000000,
        shares: 4300000000,
        revenue: 45000000000,
        debt: 42000000000,
        cash: 11000000000,
        currency: 'USD'
    },
    // Salud
    'JNJ': {
        name: 'Johnson & Johnson',
        sector: 'Salud',
        price: 155.80,
        change: 0.90,
        marketCap: 375000000000,
        pe: 16.2,
        pb: 5.8,
        eps: 9.62,
        bookValue: 26.86,
        dividend: 4.64,
        dividendYield: 2.98,
        beta: 0.55,
        fcf: 23000000000,
        shares: 2410000000,
        revenue: 85000000000,
        debt: 29000000000,
        cash: 21000000000,
        currency: 'USD'
    },
    'UNH': {
        name: 'UnitedHealth Group',
        sector: 'Salud',
        price: 520.30,
        change: 3.50,
        marketCap: 480000000000,
        pe: 22.5,
        pb: 6.2,
        eps: 23.13,
        bookValue: 83.92,
        dividend: 7.52,
        dividendYield: 1.45,
        beta: 0.65,
        fcf: 28000000000,
        shares: 923000000,
        revenue: 371000000000,
        debt: 54000000000,
        cash: 56000000000,
        currency: 'USD'
    },
    // Energía
    'XOM': {
        name: 'Exxon Mobil Corp.',
        sector: 'Energía',
        price: 105.40,
        change: 1.20,
        marketCap: 420000000000,
        pe: 13.2,
        pb: 2.1,
        eps: 7.98,
        bookValue: 50.19,
        dividend: 3.80,
        dividendYield: 3.61,
        beta: 0.9,
        fcf: 36000000000,
        shares: 3980000000,
        revenue: 344000000000,
        debt: 42000000000,
        cash: 32000000000,
        currency: 'USD'
    },
    // Industriales
    'BA': {
        name: 'Boeing Company',
        sector: 'Industriales',
        price: 205.60,
        change: -2.30,
        marketCap: 125000000000,
        pe: null, // Negativo
        pb: 12.5,
        eps: -4.70,
        bookValue: 16.45,
        dividend: 0,
        dividendYield: 0,
        beta: 1.5,
        fcf: -1500000000,
        shares: 608000000,
        revenue: 66000000000,
        debt: 52000000000,
        cash: 13000000000,
        currency: 'USD'
    }
};

// ============================================
// Obtener datos de stock
// ============================================
async function fetchStockData(ticker) {
    ticker = ticker.toUpperCase().trim();
    
    // Verificar si está en la base de datos
    if (STOCK_DATABASE[ticker]) {
        const data = STOCK_DATABASE[ticker];
        
        // Simular pequeña variación de precio para hacerlo dinámico
        const variation = (Math.random() - 0.5) * 0.02; // ±1%
        const currentPrice = data.price * (1 + variation);
        const change = currentPrice - data.price;
        const changePercent = (change / data.price) * 100;
        
        return {
            ...data,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Si no está en la base de datos, generar datos sintéticos
    return generateSyntheticData(ticker);
}

// ============================================
// Generar datos sintéticos
// ============================================
function generateSyntheticData(ticker) {
    // Hash del ticker para consistencia
    const hash = ticker.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const sectors = ['Tecnología', 'Finanzas', 'Salud', 'Consumo', 'Energía', 'Industriales'];
    const sector = sectors[Math.abs(hash) % sectors.length];
    
    // Métricas por sector
    const sectorMetrics = {
        'Tecnología': { pe: 25, pb: 6, beta: 1.2, growth: 0.12 },
        'Finanzas': { pe: 12, pb: 1.2, beta: 1.1, growth: 0.06 },
        'Salud': { pe: 20, pb: 4, beta: 0.8, growth: 0.08 },
        'Consumo': { pe: 18, pb: 3, beta: 0.7, growth: 0.05 },
        'Energía': { pe: 10, pb: 1.5, beta: 1.0, growth: 0.04 },
        'Industriales': { pe: 15, pb: 2.5, beta: 1.0, growth: 0.06 }
    };
    
    const metrics = sectorMetrics[sector];
    const basePrice = 50 + (Math.abs(hash) % 450);
    const variation = (Math.random() - 0.5) * 0.02;
    const price = basePrice * (1 + variation);
    
    const eps = price / metrics.pe;
    const bookValue = price / metrics.pb;
    const shares = 1000000000 + (Math.abs(hash) % 9000000000);
    const marketCap = price * shares;
    
    return {
        ticker: ticker,
        name: `${ticker} Corporation`,
        sector: sector,
        price: price,
        change: price - basePrice,
        changePercent: ((price - basePrice) / basePrice) * 100,
        currency: 'USD',
        marketCap: marketCap,
        pe: metrics.pe,
        pb: metrics.pb,
        eps: eps,
        bookValue: bookValue,
        dividend: Math.random() > 0.4 ? (Math.random() * 3) : 0,
        dividendYield: 0,
        beta: metrics.beta,
        fcf: eps * shares * 0.8,
        shares: shares,
        revenue: eps * shares * 6,
        debt: marketCap * 0.1,
        cash: marketCap * 0.15,
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

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchStockData,
        fetchHistoricalData,
        calculateDerivedMetrics,
        STOCK_DATABASE
    };
}

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
    window.fetchStockData = fetchStockData;
    window.fetchHistoricalData = fetchHistoricalData;
    window.calculateDerivedMetrics = calculateDerivedMetrics;
    window.STOCK_DATABASE = STOCK_DATABASE;
}
