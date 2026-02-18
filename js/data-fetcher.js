// ============================================
// DATA-FETCHER.JS - Obtención de datos financieros
// ============================================

// APIs disponibles (requieren API keys en producción)
const API_CONFIG = {
    alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: null // El usuario debe configurar su propia API key
    },
    polygon: {
        baseUrl: 'https://api.polygon.io/v2',
        apiKey: null
    },
    finnhub: {
        baseUrl: 'https://finnhub.io/api/v1',
        apiKey: null
    }
};

// ============================================
// Datos de ejemplo para demostración
// ============================================
const MOCK_DATA = {
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
        beta: 1.2,
        fcf: 99000000000, // Free Cash Flow anual
        shares: 15400000000,
        revenue: 394000000000,
        debt: 120000000000,
        cash: 169000000000
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
        beta: 0.9,
        fcf: 65000000000,
        shares: 7400000000,
        revenue: 211000000000,
        debt: 48000000000,
        cash: 104000000000
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
        beta: 1.05,
        fcf: 60000000000,
        shares: 12700000000,
        revenue: 282000000000,
        debt: 13000000000,
        cash: 118000000000
    },
    'AMZN': {
        name: 'Amazon.com Inc.',
        sector: 'Consumo',
        price: 145.30,
        change: 3.20,
        marketCap: 1500000000000,
        pe: 60.5,
        pb: 8.9,
        eps: 2.40,
        bookValue: 16.30,
        dividend: 0,
        beta: 1.3,
        fcf: 35000000000,
        shares: 10300000000,
        revenue: 514000000000,
        debt: 135000000000,
        cash: 64000000000
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
        beta: 2.0,
        fcf: 4400000000,
        shares: 3170000000,
        revenue: 81000000000,
        debt: 9500000000,
        cash: 29000000000
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
        beta: 1.15,
        fcf: 38000000000,
        shares: 2570000000,
        revenue: 134000000000,
        debt: 18000000000,
        cash: 65000000000
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
        beta: 1.7,
        fcf: 27000000000,
        shares: 2400000000,
        revenue: 60000000000,
        debt: 8500000000,
        cash: 18000000000
    },
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
        beta: 1.1,
        fcf: 0, // Bancos usan diferentes métricas
        shares: 2880000000,
        revenue: 128000000000,
        debt: 0, // Los bancos tienen deuda como parte del negocio
        cash: 0
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
        beta: 0.95,
        fcf: 19000000000,
        shares: 2110000000,
        revenue: 33000000000,
        debt: 20000000000,
        cash: 17000000000
    },
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
        beta: 0.5,
        fcf: 11000000000,
        shares: 2690000000,
        revenue: 611000000000,
        debt: 83000000000,
        cash: 10000000000
    }
};

// ============================================
// Obtener datos de stock
// ============================================
async function fetchStockData(ticker) {
    // Normalizar ticker
    ticker = ticker.toUpperCase().trim();
    
    // Verificar si tenemos datos mock
    if (MOCK_DATA[ticker]) {
        const data = MOCK_DATA[ticker];
        return {
            ticker: ticker,
            name: data.name,
            price: data.price,
            change: data.change,
            changePercent: (data.change / (data.price - data.change)) * 100,
            sector: data.sector,
            marketCap: data.marketCap,
            pe: data.pe,
            pb: data.pb,
            eps: data.eps,
            bookValue: data.bookValue,
            dividend: data.dividend,
            beta: data.beta,
            fcf: data.fcf,
            shares: data.shares,
            revenue: data.revenue,
            debt: data.debt,
            cash: data.cash,
            source: 'mock'
        };
    }
    
    // Si no está en mock, generar datos sintéticos
    return generateSyntheticData(ticker);
}

// ============================================
// Generar datos sintéticos para tickers desconocidos
// ============================================
function generateSyntheticData(ticker) {
    // Generar precio base pseudo-aleatorio pero consistente para el mismo ticker
    const hash = ticker.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const basePrice = 50 + (Math.abs(hash) % 450);
    const sectors = ['Tecnología', 'Finanzas', 'Salud', 'Consumo', 'Energía', 'Industriales'];
    const sector = sectors[Math.abs(hash) % sectors.length];
    
    // Métricas basadas en el sector
    const sectorMetrics = {
        'Tecnología': { pe: 25, pb: 8, beta: 1.2, growth: 0.15 },
        'Finanzas': { pe: 12, pb: 1.2, beta: 1.1, growth: 0.08 },
        'Salud': { pe: 20, pb: 4, beta: 0.8, growth: 0.10 },
        'Consumo': { pe: 18, pb: 3, beta: 0.7, growth: 0.06 },
        'Energía': { pe: 10, pb: 1.5, beta: 1.3, growth: 0.04 },
        'Industriales': { pe: 15, pb: 2.5, beta: 1.0, growth: 0.07 }
    };
    
    const metrics = sectorMetrics[sector];
    const eps = basePrice / metrics.pe;
    const bookValue = basePrice / metrics.pb;
    const shares = 1000000000 + (Math.abs(hash) % 9000000000);
    const fcf = eps * shares * 0.8; // Aproximación
    
    return {
        ticker: ticker,
        name: `${ticker} Corp.`,
        price: basePrice,
        change: (Math.random() - 0.5) * basePrice * 0.05,
        changePercent: (Math.random() - 0.5) * 5,
        sector: sector,
        marketCap: basePrice * shares,
        pe: metrics.pe + (Math.random() - 0.5) * 5,
        pb: metrics.pb + (Math.random() - 0.5) * 0.5,
        eps: eps,
        bookValue: bookValue,
        dividend: Math.random() > 0.3 ? (Math.random() * 3) : 0,
        beta: metrics.beta + (Math.random() - 0.5) * 0.3,
        fcf: fcf,
        shares: shares,
        revenue: fcf * (1.5 + Math.random()),
        debt: fcf * (0.5 + Math.random()),
        cash: fcf * (0.3 + Math.random() * 0.5),
        source: 'synthetic'
    };
}

// ============================================
// Obtener datos históricos (para gráficos)
// ============================================
async function fetchHistoricalData(ticker, period = '1Y') {
    // Generar datos históricos sintéticos
    const data = await fetchStockData(ticker);
    const currentPrice = data.price;
    
    const periods = {
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        '5Y': 365 * 5
    };
    
    const days = periods[period] || 365;
    const prices = [];
    let price = currentPrice;
    
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Simular movimiento aleatorio con tendencia
        const change = (Math.random() - 0.48) * price * 0.02;
        price = price + change;
        
        prices.push({
            date: date.toISOString().split('T')[0],
            price: price,
            volume: Math.floor(Math.random() * 10000000) + 1000000
        });
    }
    
    return prices;
}

// ============================================
// Obtener noticias
// ============================================
async function fetchNews(ticker) {
    // Simular noticias
    const headlines = [
        `${ticker} reporta resultados trimestrales superando expectativas`,
        `Analistas actualizan precio objetivo de ${ticker}`,
        `${ticker} anuncia nuevo programa de recompra de acciones`,
        `Sector ${await fetchStockData(ticker).then(d => d.sector)} muestra fortaleza`,
        `${ticker} expande operaciones a nuevos mercados`
    ];
    
    return headlines.map((headline, i) => ({
        title: headline,
        source: ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch'][i % 4],
        date: new Date(Date.now() - i * 86400000).toISOString(),
        url: '#'
    }));
}

// ============================================
// Calcular métricas derivadas
// ============================================
function calculateDerivedMetrics(data) {
    return {
        // EV/EBITDA aproximado
        evEbitda: (data.marketCap + data.debt - data.cash) / (data.revenue * 0.15),
        
        // ROE
        roe: (data.eps / data.bookValue) * 100,
        
        // P/FCF
        pFcf: data.marketCap / data.fcf,
        
        // Dividend Yield
        dividendYield: (data.dividend / data.price) * 100,
        
        // Net Cash/Debt
        netCash: data.cash - data.debt,
        
        // FCF Yield
        fcfYield: (data.fcf / data.marketCap) * 100
    };
}

// ============================================
// Configurar API key
// ============================================
function setApiKey(provider, key) {
    if (API_CONFIG[provider]) {
        API_CONFIG[provider].apiKey = key;
        localStorage.setItem(`apiKey_${provider}`, key);
        return true;
    }
    return false;
}

// ============================================
// Cargar API keys guardadas
// ============================================
function loadApiKeys() {
    Object.keys(API_CONFIG).forEach(provider => {
        const key = localStorage.getItem(`apiKey_${provider}`);
        if (key) {
            API_CONFIG[provider].apiKey = key;
        }
    });
}

// Inicializar
loadApiKeys();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchStockData,
        fetchHistoricalData,
        fetchNews,
        calculateDerivedMetrics,
        setApiKey,
        MOCK_DATA
    };
}
