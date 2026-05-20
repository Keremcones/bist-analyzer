/**
 * Simple Moving Average (SMA) hesaplar
 */
export const calculateSMA = (data, period) => {
    const sma = [];
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        sum += data[i].close;

        if (i >= period) {
            sum -= data[i - period].close;
            sma.push({ time: data[i].time, value: sum / period });
        } else if (i === period - 1) {
            sma.push({ time: data[i].time, value: sum / period });
        } else {
            // Periyot dolana kadar null veya hesaplanmadı işareti konabilir
            // Lightweight charts için boş bırakmak veya baştan kesmek daha iyi olabilir
        }
    }

    return sma;
};

/**
 * Hareketli Ortalama Kesişimi (Moving Average Crossover) Stratejisi Backtesti
 * @param {Array} data - Mum grafiği verisi [{time, open, high, low, close}]
 * @param {number} shortPeriod - Kısa periyot (Örn: 20)
 * @param {number} longPeriod - Uzun periyot (Örn: 50)
 */
export const runSMACrossoverBacktest = (data, shortPeriod = 20, longPeriod = 50) => {
    if (!data || data.length < longPeriod) return null;

    const shortSMA = calculateSMA(data, shortPeriod);
    const longSMA = calculateSMA(data, longPeriod);

    // Sinyalleri ve işlemleri hesapla
    const signals = []; // {time, type: 'Buy'|'Sell', price}
    const trades = [];  // {entryTime, entryPrice, exitTime, exitPrice, returnPct, isProfit}

    let currentPosition = null; // null veya {price, time}
    let initialCapital = 10000; // Varsayılan 10 bin TL ile başla
    let currentCapital = initialCapital;

    // SMA dizilerini zaman damgasına göre eşleştirmek için bir map oluşturalım
    const smas = new Map();
    shortSMA.forEach(item => {
        smas.set(item.time, { short: item.value });
    });

    longSMA.forEach(item => {
        if (smas.has(item.time)) {
            smas.get(item.time).long = item.value;
        }
    });

    // İlk kesişimi bulmak için önceki durumu takip et
    let previousShort = null;
    let previousLong = null;

    for (let i = 0; i < data.length; i++) {
        const bar = data[i];
        const smaValues = smas.get(bar.time);

        if (!smaValues || smaValues.short === undefined || smaValues.long === undefined) {
            continue;
        }

        const { short, long } = smaValues;

        if (previousShort !== null && previousLong !== null) {
            // Golden Cross (Al) : Kısa SMA, Uzun SMA'yı yukarı kesti
            if (previousShort <= previousLong && short > long) {
                if (!currentPosition) {
                    signals.push({ time: bar.time, type: 'Buy', price: bar.close });
                    currentPosition = { price: bar.close, time: bar.time };
                }
            }
            // Death Cross (Sat) : Kısa SMA, Uzun SMA'yı aşağı kesti
            else if (previousShort >= previousLong && short < long) {
                if (currentPosition) {
                    signals.push({ time: bar.time, type: 'Sell', price: bar.close });

                    const returnPct = ((bar.close - currentPosition.price) / currentPosition.price) * 100;
                    currentCapital = currentCapital * (1 + (returnPct / 100));

                    trades.push({
                        entryTime: currentPosition.time,
                        entryPrice: currentPosition.price,
                        exitTime: bar.time,
                        exitPrice: bar.close,
                        returnPct: returnPct,
                        isProfit: returnPct > 0
                    });

                    currentPosition = null;
                }
            }
        }

        previousShort = short;
        previousLong = long;
    }

    // Açık pozisyon varsa, son günkü fiyattan kapatmış sayarak gerçekleşmemiş PnL hesapla
    let unrealizedReturn = 0;
    if (currentPosition) {
        const lastBar = data[data.length - 1];
        unrealizedReturn = ((lastBar.close - currentPosition.price) / currentPosition.price) * 100;
        currentCapital = currentCapital * (1 + (unrealizedReturn / 100));
    }

    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => t.isProfit).length;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const totalReturnPct = ((currentCapital - initialCapital) / initialCapital) * 100;

    // Buy & Hold (Al ve Tut) getirisi kıyaslama için
    const firstValidBar = data.find(d => smas.has(d.time) && smas.get(d.time).long !== undefined);
    const buyAndHoldReturn = firstValidBar
        ? ((data[data.length - 1].close - firstValidBar.close) / firstValidBar.close) * 100
        : 0;

    return {
        shortSMA,
        longSMA,
        signals,
        trades,
        metrics: {
            totalTrades,
            winRate,
            totalReturnPct,
            buyAndHoldReturn,
            finalCapital: currentCapital
        }
    };
};
