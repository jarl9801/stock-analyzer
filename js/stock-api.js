// ============================================
// STOCK-API.JS - API de datos financieros simple
// ============================================

/**
 * API gratuita usando twelvedata (250 requests/día gratis)
 * o polygon.io (5 API calls/min gratis)
 * 
 * Para usar: registrarse en https://twelvedata.com y obtener API key gratuita
 */

const API_KEYS = {
    twelvedata: 'demo', // Cambiar por tu API key
    polygon: 'demo'     // Cambiar por tu API key
};

/**
 * Fetch datos de twelvedata
 */
async function fetchTwelveData(ticker) {
    try {
        const url = `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${API_KEYS.twelvedata}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code) throw new Error(data.message);
        
        return {
            ticker: ticker.toUpperCase(),
            name: data.name || ticker,
            price: parseFloat(data.close),
            change: parseFloat(data.change),
            changePercent: parseFloat(data.percent_change),
            currency: data.currency || 'USD',
            pe: parseFloat(data.pe) || null,
            eps: parseFloat(data.eps) || null,
            dividend: parseFloat(data.dividend) || 0,
            beta: parseFloat(data.beta) || 1.0,
            volume: parseInt(data.volume),
            lastUpdated: new Date().toISOString(),
            source: 'twelvedata'
        };
    } catch (error) {
        console.warn('[TwelveData] Error:', error.message);
        return null;
    }
}

/**
 * Fetch datos de polygon.io
 */
async function fetchPolygon(ticker) {
    try {
        // Precio actual
        const quoteUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${API_KEYS.polygon}`;
        const response = await fetch(quoteUrl);
        const data = await response.json();
        
        if (!data.ticker) throw new Error('No data');
        
        const tickerData = data.ticker;
        const dayData = tickerData.day;
        const prevDay = tickerData.prevDay;
        
        return {
            ticker: ticker.toUpperCase(),
            name: tickerData.ticker,
            price: dayData.c,
            change: dayData.c - prevDay.c,
            changePercent: ((dayData.c - prevDay.c) / prevDay.c) * 100,
            currency: 'USD',
            volume: dayData.v,
            lastUpdated: new Date().toISOString(),
            source: 'polygon'
        };
    } catch (error) {
        console.warn('[Polygon] Error:', error.message);
        return null;
    }
}

/**
 * Función principal que intenta múltiples fuentes
 */
async function fetchRealTimeData(ticker) {
    console.log(`[StockAPI] Fetching real-time data for ${ticker}...`);
    
    // 1. Intentar TwelveData
    const twelveData = await fetchTwelveData(ticker);
    if (twelveData && twelveData.price > 0) {
        console.log('[StockAPI] ✅ Datos de TwelveData');
        return twelveData;
    }
    
    // 2. Intentar Polygon
    const polygonData = await fetchPolygon(ticker);
    if (polygonData && polygonData.price > 0) {
        console.log('[StockAPI] ✅ Datos de Polygon');
        return polygonData;
    }
    
    console.log('[StockAPI] ❌ APIs fallaron, usando fallback local');
    return null;
}

// Exportar
if (typeof window !== 'undefined') {
    window.fetchTwelveData = fetchTwelveData;
    window.fetchPolygon = fetchPolygon;
    window.fetchRealTimeData = fetchRealTimeData;
    window.API_KEYS = API_KEYS;
}