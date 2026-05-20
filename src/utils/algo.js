import { EMA, SMA, ADX, RSI, MACD, Stochastic, OBV, BollingerBands } from 'technicalindicators';

// ==========================
// BIST OPTİMİZE STRATEJİ
// ==========================
// BIST hisseleri için ayarlanmış ağırlıklar:
// - Yüksek Momentum ve Trend takip etme (pullback değil, kırılma stratejisi)
// - Hacim onayı önemli (BIST'te hacim kırılmaları güçlü sinyaller verir)
// - RSI 45-55 alım bölgesi (oversold bekleme yerine orta bölgede trend takibi)

// Trend Analizi (%45 — BIST'te trend en güçlü faktör)
const calculateTrendScore = (baseData) => {
    if (baseData.close.length < 50) return 0;

    const ema9 = EMA.calculate({ period: 9, values: baseData.close });
    const ema21 = EMA.calculate({ period: 21, values: baseData.close });
    const ema50 = EMA.calculate({ period: 50, values: baseData.close });

    const adxResult = ADX.calculate({
        high: baseData.high,
        low: baseData.low,
        close: baseData.close,
        period: 14
    });

    const lastEma9 = ema9[ema9.length - 1];
    const lastEma21 = ema21[ema21.length - 1];
    const lastEma50 = ema50[ema50.length - 1];
    const lastAdx = adxResult.length > 0 ? adxResult[adxResult.length - 1].adx : 0;
    const lastDiPlus = adxResult.length > 0 ? adxResult[adxResult.length - 1].pdi : 0;
    const lastDiMinus = adxResult.length > 0 ? adxResult[adxResult.length - 1].mdi : 0;

    let score = 0;

    // EMA hizalanma — kısa > orta > uzun => güçlü yükseliş trendi
    if (lastEma9 > lastEma21 && lastEma21 > lastEma50) {
        score += 30; // Tam hizalanmış yükseliş
    } else if (lastEma9 > lastEma21) {
        score += 15; // Kısmi hizalanma
    } else if (lastEma9 < lastEma21 && lastEma21 < lastEma50) {
        score -= 30; // Tam düşüş trendi
    } else if (lastEma9 < lastEma21) {
        score -= 15;
    }

    // ADX + DI yönü: Güçlü ve yönlü trend bonus
    if (lastAdx > 20) {
        if (lastDiPlus > lastDiMinus) {
            const bonus = Math.min((lastAdx - 20) * 1.0, 25);
            score += bonus;
        } else if (lastDiMinus > lastDiPlus) {
            const penalty = Math.min((lastAdx - 20) * 1.0, 25);
            score -= penalty;
        }
    }

    return Math.max(-45, Math.min(45, score));
};

// Momentum Analizi (%35 — BIST'te momentum kırılmaları çok karlı)
const calculateMomentumScore = (baseData) => {
    if (baseData.close.length < 30) return 0;

    const rsi = RSI.calculate({ period: 14, values: baseData.close });
    const macd = MACD.calculate({
        values: baseData.close,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const stoch = Stochastic.calculate({
        high: baseData.high,
        low: baseData.low,
        close: baseData.close,
        period: 14,
        signalPeriod: 3
    });

    const lastRsi = rsi[rsi.length - 1];
    const prevRsi = rsi[rsi.length - 2] || lastRsi;
    const lastMacd = macd[macd.length - 1];
    const prevMacd = macd[macd.length - 2];
    const lastStoch = stoch[stoch.length - 1];

    let score = 0;

    // RSI: BIST için 40-60 alım bölgesi (trend takibi, aşırı dipte bekleme yok)
    if (lastRsi > 50 && lastRsi < 70 && lastRsi > prevRsi) {
        score += 20; // RSI 50+ ve yükseliyor = momentum
    } else if (lastRsi > 40 && lastRsi <= 50 && lastRsi > prevRsi) {
        score += 10; // RSI dipten dönüyor
    } else if (lastRsi < 30) {
        score += 5;  // Aşırı satım — erken, trend olmadan girme
    } else if (lastRsi > 75) {
        score -= 20; // Aşırı alım
    } else if (lastRsi >= 70) {
        score -= 10;
    }

    // MACD: Histogram büyüyor mu? (momentum ivmeleniyor mu?)
    if (lastMacd && prevMacd) {
        if (lastMacd.histogram > 0 && lastMacd.histogram > prevMacd.histogram) {
            score += 15; // Histogram büyüyor = güçlenen momentum
        } else if (lastMacd.histogram > 0) {
            score += 7;
        } else if (lastMacd.histogram < 0 && lastMacd.histogram < prevMacd.histogram) {
            score -= 15;
        } else if (lastMacd.histogram < 0) {
            score -= 7;
        }
    }

    // Stochastic: Orta bölge geçişi (20 altında sat, 80 üstünde belirgin zayıflık)
    if (lastStoch) {
        if (lastStoch.k > 20 && lastStoch.k < 80 && lastStoch.k > lastStoch.d) {
            score += 5; // Orta bölgede yukarı kesiyor
        } else if (lastStoch.k < 20) {
            score += 8;  // Oversold 
        } else if (lastStoch.k > 85) {
            score -= 12; // Overbought
        }
    }

    return Math.max(-35, Math.min(35, score));
};

// Hacim Analizi (%15 — Onay filtresi)
const calculateVolumeScore = (baseData) => {
    if (baseData.volume.length < 20) return 0;

    const volValues = baseData.volume;
    const lastVolume = volValues[volValues.length - 1];
    const avgVolume20 = volValues.slice(-20).reduce((a, b) => a + b, 0) / 20;

    const obv = OBV.calculate({ close: baseData.close, volume: baseData.volume });

    let score = 0;

    // Hacim ivmesi — ortalamana göre son bar hacimleri
    const volRatio = lastVolume / avgVolume20;
    if (volRatio > 2.0) score += 15;       // 2x hacim patlaması = güçlü sinyal
    else if (volRatio > 1.5) score += 10;  // 1.5x hacim artışı
    else if (volRatio > 1.2) score += 5;
    else if (volRatio < 0.6) score -= 8;   // Hacim kuruyorsa trend zayıf

    // OBV trendi — son 3 bar
    if (obv.length > 3) {
        const obvTrend = obv[obv.length - 1] - obv[obv.length - 3];
        if (obvTrend > 0) score += 5;
        else score -= 5;
    }

    return Math.max(-15, Math.min(15, score));
};

// Bollinger Band + Destek/Direnç (%5 — Hafif filtre)
const calculateSnRScore = (baseData) => {
    if (baseData.close.length < 20) return 0;

    const closes = baseData.close;
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];

    let score = 0;

    // Bollinger Band analizi — sıkışma ve kırılma
    try {
        const bb = BollingerBands.calculate({
            period: 20,
            values: closes,
            stdDev: 2
        });

        if (bb.length > 0) {
            const lastBb = bb[bb.length - 1];

            if (current > lastBb.middle && prev <= lastBb.middle) {
                score += 10; // Orta bant kırılması = yükseliş sinyali
            } else if (current < lastBb.middle && prev >= lastBb.middle) {
                score -= 10; // Orta bant kırılması = düşüş sinyali
            }

            if (current < lastBb.lower) score += 5;  // Alt band dışına çıktı = olası dönüş
            if (current > lastBb.upper) score -= 5;  // Üst band dışına çıktı = aşırı gerilmiş
        }
    } catch { /* BB hesaplanamadi, atla */ }

    // Art arda yükselen kapanışlar = momentum konfirmasyonu
    const lastN = closes.slice(-4);
    const isRising = lastN.every((v, i) => i === 0 || v > lastN[i - 1]);
    const isFalling = lastN.every((v, i) => i === 0 || v < lastN[i - 1]);
    if (isRising) score += 8;
    if (isFalling) score -= 8;

    return Math.max(-20, Math.min(20, score));
};

/**
 * BIST Optimize Algo Score
 * @param {Array} data [{time, open, high, low, close, volume}]
 * @returns {Array} [{time, score}]
 */
export const calculateAlgoScores = (data) => {
    const scores = [];
    const WINDOW = 100; // Performans: tam geçmişi gönderme, son 100 barı gönder

    for (let i = 50; i < data.length; i++) {
        // Pencere optimizasyonu: çok büyük pencere hesaplamayı öldürür
        const windowStart = Math.max(0, i - WINDOW);
        const windowData = data.slice(windowStart, i + 1);

        const baseData = {
            open: windowData.map(d => d.open),
            high: windowData.map(d => d.high),
            low: windowData.map(d => d.low),
            close: windowData.map(d => d.close),
            volume: windowData.map(d => d.volume)
        };

        const trendScore = calculateTrendScore(baseData);
        const momentumScore = calculateMomentumScore(baseData);
        const rawVolScore = calculateVolumeScore(baseData);
        const snrScore = calculateSnRScore(baseData);

        // Hacim skoru trend yönünde değerlendiriliyor
        const direction = trendScore >= 0 ? 1 : -1;
        const volumeScore = rawVolScore * direction;

        let totalScore = trendScore + momentumScore + volumeScore + snrScore;

        // Güçlü onay çarpanı: trend + momentum + hacim hepsi aynı yönde ise
        const bullConfirm = trendScore > 20 && momentumScore > 15 && rawVolScore > 5;
        const bearConfirm = trendScore < -20 && momentumScore < -15 && rawVolScore > 5;
        if (bullConfirm || bearConfirm) {
            totalScore *= 1.25;
        }

        const finalScore = Math.max(-100, Math.min(100, Math.round(totalScore)));

        scores.push({
            time: data[i].time,
            score: finalScore,
            openPrice: data[i].open,
            closePrice: data[i].close
        });
    }

    return scores;
};
