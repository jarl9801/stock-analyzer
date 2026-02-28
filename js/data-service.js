// ============================================
// DATA-SERVICE.JS — Unified data layer
// ============================================

const DataService = (() => {
    const cache = new Map();
    const CACHE_TTL = 5 * 60 * 1000; // 5 min

    // S&P 500 top stocks by sector
    const SP500_TOP = {
        'Technology': ['AAPL','MSFT','NVDA','GOOGL','META','AMZN','ADBE','CRM','ORCL','CSCO','INTC','AMD','QCOM','AVGO','TXN'],
        'Finance': ['JPM','V','MA','BAC','WFC','GS','MS','BLK','SCHW','AXP','C','USB','PNC','TFC','COF'],
        'Healthcare': ['JNJ','UNH','LLY','PFE','ABT','TMO','MRK','ABBV','BMY','AMGN','MDT','ISRG','DHR','SYK','GILD'],
        'Consumer': ['WMT','PG','KO','PEP','COST','MCD','NKE','SBUX','TGT','HD','LOW','TJX','DG','DLTR','CL'],
        'Energy': ['XOM','CVX','COP','EOG','SLB','MPC','PSX','VLO','OXY','DVN','HAL','FANG','HES','BKR','KMI'],
        'Industrial': ['BA','HON','UNP','CAT','RTX','DE','GE','LMT','MMM','UPS','FDX','NSC','WM','EMR','ITW'],
    };

    const ALL_TICKERS = Object.values(SP500_TOP).flat();

    async function getQuote(ticker) {
        ticker = ticker.toUpperCase().trim();
        const cached = cache.get(`quote:${ticker}`);
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

        let data;
        if (typeof fetchStockData === 'function') {
            data = await fetchStockData(ticker);
        } else {
            data = generateSyntheticData(ticker);
        }

        cache.set(`quote:${ticker}`, { data, ts: Date.now() });
        return data;
    }

    async function getMultipleQuotes(tickers) {
        return Promise.all(tickers.map(t => getQuote(t).catch(() => null)));
    }

    function getMarketIndices() {
        return [
            { symbol: 'SPX', name: 'S&P 500', price: 5234.18, change: 12.45, pct: 0.24 },
            { symbol: 'NDX', name: 'NASDAQ', price: 18432.50, change: -23.10, pct: -0.13 },
            { symbol: 'DJI', name: 'DOW JONES', price: 39142.80, change: 85.30, pct: 0.22 },
            { symbol: 'DAX', name: 'DAX', price: 18120.45, change: 45.20, pct: 0.25 },
            { symbol: 'VIX', name: 'VIX', price: 14.85, change: -0.32, pct: -2.11 },
            { symbol: 'TNX', name: '10Y YIELD', price: 4.28, change: 0.02, pct: 0.47 },
            { symbol: 'CL', name: 'CRUDE OIL', price: 78.45, change: -0.85, pct: -1.07 },
            { symbol: 'GC', name: 'GOLD', price: 2165.30, change: 8.20, pct: 0.38 },
            { symbol: 'BTC', name: 'BITCOIN', price: 62450.00, change: 1250.00, pct: 2.04 },
            { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0845, change: -0.0012, pct: -0.11 },
        ];
    }

    function getMarketStatus() {
        const now = new Date();
        const h = now.getUTCHours(), d = now.getUTCDay();
        const isWeekday = d >= 1 && d <= 5;
        const preMarket = h >= 9 && h < 14;
        const regular = h >= 14 && h < 21; // approx
        const afterHours = h >= 21 && h < 24;

        if (!isWeekday) return { status: 'CLOSED', label: 'MARKET CLOSED (WEEKEND)' };
        if (regular) return { status: 'OPEN', label: 'MARKET OPEN' };
        if (preMarket) return { status: 'PRE', label: 'PRE-MARKET' };
        if (afterHours) return { status: 'AFTER', label: 'AFTER-HOURS' };
        return { status: 'CLOSED', label: 'MARKET CLOSED' };
    }

    function getSectorForTicker(ticker) {
        for (const [sector, tickers] of Object.entries(SP500_TOP)) {
            if (tickers.includes(ticker)) return sector;
        }
        if (typeof STOCK_DATABASE !== 'undefined' && STOCK_DATABASE[ticker]) {
            return STOCK_DATABASE[ticker].sector;
        }
        return 'Other';
    }

    // Generate simulated OHLCV data for charts
    function generateOHLCV(ticker, days = 365) {
        const data = [];
        const basePrice = (typeof STOCK_DATABASE !== 'undefined' && STOCK_DATABASE[ticker])
            ? STOCK_DATABASE[ticker].price
            : 100 + Math.random() * 200;

        let price = basePrice * 0.85;
        const now = Date.now();

        for (let i = days; i >= 0; i--) {
            const date = new Date(now - i * 86400000);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const change = (Math.random() - 0.48) * 0.03;
            const open = price;
            price *= (1 + change);
            const close = price;
            const high = Math.max(open, close) * (1 + Math.random() * 0.015);
            const low = Math.min(open, close) * (1 - Math.random() * 0.015);
            const volume = Math.floor(5000000 + Math.random() * 20000000);

            data.push({
                time: Math.floor(date.getTime() / 1000),
                open: +open.toFixed(2),
                high: +high.toFixed(2),
                low: +low.toFixed(2),
                close: +close.toFixed(2),
                volume
            });
        }
        return data;
    }

    // Technical indicator calculations
    function calcSMA(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) sum += data[i - j].close;
            result.push({ time: data[i].time, value: +(sum / period).toFixed(2) });
        }
        return result;
    }

    function calcEMA(data, period) {
        const k = 2 / (period + 1);
        const result = [];
        let ema = data[0].close;
        for (let i = 0; i < data.length; i++) {
            ema = data[i].close * k + ema * (1 - k);
            if (i >= period - 1) result.push({ time: data[i].time, value: +ema.toFixed(2) });
        }
        return result;
    }

    function calcRSI(data, period = 14) {
        const result = [];
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = data[i].close - data[i - 1].close;
            if (diff > 0) gains += diff; else losses -= diff;
        }
        let avgGain = gains / period, avgLoss = losses / period;
        for (let i = period; i < data.length; i++) {
            if (i > period) {
                const diff = data[i].close - data[i - 1].close;
                avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
                avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
            }
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push({ time: data[i].time, value: +(100 - 100 / (1 + rs)).toFixed(2) });
        }
        return result;
    }

    function calcMACD(data) {
        const ema12 = calcEMA(data, 12);
        const ema26 = calcEMA(data, 26);
        const macdLine = [];
        const offset = ema12.length - ema26.length;
        for (let i = 0; i < ema26.length; i++) {
            macdLine.push({
                time: ema26[i].time,
                value: +(ema12[i + offset].value - ema26[i].value).toFixed(4)
            });
        }
        // Signal line (9-period EMA of MACD)
        const signal = [];
        const k = 2 / 10;
        let sema = macdLine[0].value;
        for (let i = 0; i < macdLine.length; i++) {
            sema = macdLine[i].value * k + sema * (1 - k);
            if (i >= 8) signal.push({ time: macdLine[i].time, value: +sema.toFixed(4) });
        }
        // Histogram
        const histogram = [];
        const sOffset = macdLine.length - signal.length;
        for (let i = 0; i < signal.length; i++) {
            histogram.push({
                time: signal[i].time,
                value: +(macdLine[i + sOffset].value - signal[i].value).toFixed(4),
                color: macdLine[i + sOffset].value - signal[i].value >= 0 ? '#22c55e' : '#ff4444'
            });
        }
        return { macd: macdLine, signal, histogram };
    }

    function calcBollingerBands(data, period = 20, stdDev = 2) {
        const upper = [], lower = [], middle = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) sum += data[i - j].close;
            const avg = sum / period;
            let sq = 0;
            for (let j = 0; j < period; j++) sq += Math.pow(data[i - j].close - avg, 2);
            const std = Math.sqrt(sq / period);
            middle.push({ time: data[i].time, value: +avg.toFixed(2) });
            upper.push({ time: data[i].time, value: +(avg + stdDev * std).toFixed(2) });
            lower.push({ time: data[i].time, value: +(avg - stdDev * std).toFixed(2) });
        }
        return { upper, middle, lower };
    }

    return {
        getQuote, getMultipleQuotes, getMarketIndices, getMarketStatus,
        getSectorForTicker, generateOHLCV,
        calcSMA, calcEMA, calcRSI, calcMACD, calcBollingerBands,
        SP500_TOP, ALL_TICKERS, cache
    };
})();
