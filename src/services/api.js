const YAHOO_ENDPOINTS = [
    '/api/yahoo/v8/finance/chart/',
    '/api/yahoo-v2/v8/finance/chart/'
];
const TWELVE_PROXY_URL = '/api/twelve/time_series';

const apiCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const getTwelveKey = () => localStorage.getItem('TWELVE_DATA_API_KEY') || import.meta.env.VITE_TWELVE_KEY || '';

// ─────────────────────────────────────────────────────────────
// Sahte veri üretici (Fallback)
// ─────────────────────────────────────────────────────────────
const generateMockData = (symbol, interval = '1d') => {
    const data = [];
    let currentPrice = 250 + Math.random() * 50;
    const now = new Date();
    const count = 300;
    for (let i = 0; i < count; i++) {
        const volatility = currentPrice * 0.01;
        const o = currentPrice;
        const c = o + (Math.random() - 0.5) * volatility;
        const h = Math.max(o, c) + Math.random() * volatility * 0.2;
        const l = Math.min(o, c) - Math.random() * volatility * 0.2;

        let timeValue;
        if (interval === '1d') {
            timeValue = new Date(now.getTime() - (count - i) * 24 * 3600 * 1000).toISOString().split('T')[0];
        } else {
            timeValue = Math.floor((now.getTime() - (count - i) * 3600 * 1000) / 1000);
        }

        data.push({ time: timeValue, open: o, high: h, low: l, close: c, volume: 1000000 });
        currentPrice = c;
    }
    return {
        success: true,
        data,
        meta: {
            symbol,
            currentPrice,
            previousClose: data[data.length - 2]?.close,
            dayHigh: currentPrice * 1.02,
            dayLow: currentPrice * 0.98,
            fiftyTwoWeekHigh: currentPrice * 1.5,
            fiftyTwoWeekLow: currentPrice * 0.7,
            volume: 5000000,
            avgVolume: 4000000,
            marketCap: 100000000,
            isMock: true,
            source: 'Simülasyon'
        }
    };
};

// ─────────────────────────────────────────────────────────────
// Twelve Data Servisi (Professional)
// ─────────────────────────────────────────────────────────────
const fetchTwelveData = async (symbol, interval) => {
    const key = getTwelveKey();
    if (!key) throw new Error('Key yok');
    const baseSymbol = symbol.split('.')[0];
    const twelveSymbol = `${baseSymbol}:IST`;
    let twelveInterval = interval === '1d' ? '1day' : interval;
    const url = `${TWELVE_PROXY_URL}?symbol=${twelveSymbol}&interval=${twelveInterval}&outputsize=5000&apikey=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'error' || !data.values) throw new Error(data.message || 'Veri yok');

    const formattedData = data.values.map(v => ({
        time: interval === '1d' ? v.datetime.split(' ')[0] : Math.floor(new Date(v.datetime).getTime() / 1000),
        open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close), volume: parseInt(v.volume) || 0
    })).reverse();

    return { success: true, data: formattedData, meta: { symbol, currentPrice: formattedData[formattedData.length - 1].close, previousClose: formattedData[formattedData.length - 2]?.close, isMock: false, source: 'Twelve Data (Resmi)' } };
};

// ─────────────────────────────────────────────────────────────
// Multi-Endpoint Yahoo Driver (Keyless)
// ─────────────────────────────────────────────────────────────
const parseYahooResponse = (data, symbol, interval) => {
    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp;
    const meta = result.meta;
    const TR_OFFSET_S = 3 * 3600;

    const intervalSnap = { '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400 };
    const snap = intervalSnap[interval] || 0;

    const formattedData = timestamps.map((time, i) => {
        const snappedTime = snap ? Math.floor(time / snap) * snap : time;
        const adjustedTime = snappedTime + TR_OFFSET_S;
        let timeValue = adjustedTime;
        if (interval === '1d') {
            const date = new Date(adjustedTime * 1000);
            timeValue = date.toISOString().split('T')[0];
        }
        return {
            time: timeValue,
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i],
        };
    }).filter(d => d.open != null && d.close != null && !isNaN(d.close));

    return {
        success: true,
        data: formattedData,
        meta: {
            symbol: symbol.replace('.IS', ''),
            currentPrice: meta.regularMarketPrice || formattedData[formattedData.length - 1].close,
            previousClose: meta.previousClose || formattedData[formattedData.length - 2]?.close,
            dayHigh: meta.regularMarketDayHigh || Math.max(...formattedData.slice(-20).map(d => d.high)),
            dayLow: meta.regularMarketDayLow || Math.min(...formattedData.slice(-20).map(d => d.low)),
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || Math.max(...formattedData.map(d => d.high)),
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || Math.min(...formattedData.map(d => d.low)),
            volume: meta.regularMarketVolume || formattedData[formattedData.length - 1].volume,
            avgVolume: meta.averageDailyVolume3Month || 0,
            marketCap: meta.marketCap || 0,
            isMock: false,
            source: 'Yahoo Finance'
        }
    };
};

const fetchWithYahooRotation = async (symbol, range, interval) => {
    const formattedSymbol = symbol.includes('.IS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.IS`;

    for (const baseUrl of YAHOO_ENDPOINTS) {
        try {
            const url = `${baseUrl}${formattedSymbol}?range=${range}&interval=${interval}`;
            const response = await fetch(url);
            if (response.status === 429) continue;
            if (!response.ok) continue;
            const data = await response.json();
            if (!data.chart?.result?.length) continue;

            return parseYahooResponse(data, formattedSymbol, interval);
        } catch {
            // Bu endpointten veri alinamadi, siradaki endpoint deneniyor.
        }
    }
    throw new Error('Yahoo Finance erişilemiyor.');
};

export const fetchStockData = async (symbol, range = '1y', interval = '1d') => {
    const cleanSymbol = symbol.split('.')[0].toUpperCase();
    const cacheKey = `${cleanSymbol}_${range}_${interval}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    // 1. Twelve Data (Eğer key varsa ilk tercih)
    if (getTwelveKey()) {
        try {
            const result = await fetchTwelveData(cleanSymbol, interval);
            apiCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
            return result;
        } catch {
            // Twelve Data basarisizsa Yahoo fallback kullanilir.
        }
    }

    // 2. Yahoo Finance (Keyless fallback)
    try {
        const result = await fetchWithYahooRotation(cleanSymbol, range, interval);
        apiCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
    } catch {
        return generateMockData(cleanSymbol, interval);
    }
};

export const fetchMultipleStocks = async (symbols) => {
    const results = await Promise.all(symbols.map(sym => fetchStockData(sym, '5d', '1d')));
    return results.filter(r => r.success).map(r => ({
        symbol: r.meta.symbol,
        price: r.meta.currentPrice,
        previousClose: r.meta.previousClose,
        changePercent: ((r.meta.currentPrice - r.meta.previousClose) / r.meta.previousClose) * 100,
        isMock: r.meta.isMock,
        source: r.meta.source
    }));
};
