import { calculateAlgoScores } from './algo';

const calculateMaxDrawdownPct = (equityCurve) => {
    if (!equityCurve.length) return 0;
    let peak = equityCurve[0];
    let maxDrawdown = 0;
    for (const equity of equityCurve) {
        if (equity > peak) peak = equity;
        const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
};

/**
 * Gelişmiş Backtest
 *
 * positionMode: 'long' | 'short' | 'both'
 * - long  : sadece AL sinyallerinde long gir
 * - short : sadece SAT sinyallerinde short gir
 * - both  : her iki yönde de işlem yap
 *
 * Short Mekanizması:
 * - Giriş: score <= sellThreshold → nextBar.open'dan short aç
 * - TP : bar.low <= entryPrice * (1 - tp/100)  → kâr
 * - SL : bar.high >= entryPrice * (1 + sl/100) → zarar
 * - Sinyal çıkışı: score >= buyThreshold
 * - Kâr formülü: (entryPrice - exitPrice) / entryPrice * 100
 */
export const runAdvancedBacktest = (
    stockData,
    buyThreshold = 50,
    sellThreshold = -50,
    takeProfitPct = 0,
    stopLossPct = 0,
    exitOnSignal = true,
    positionMode = 'long'
) => {
    const EMPTY = { signals: [], metrics: null, tradeHistory: [], algoScores: [] };
    if (!stockData || stockData.length < 52) return EMPTY;

    const algoScores = calculateAlgoScores(stockData);
    if (!algoScores || algoScores.length === 0) return EMPTY;

    const scoreMap = new Map(algoScores.map(s => [String(s.time), s.score]));

    let position = null;
    let balance = 10000;
    const initialBal = 10000;
    let totalTrades = 0;
    let wonTrades = 0;
    const signals = [];
    const tradeHistory = [];
    const equityCurve = [initialBal];

    const startIndex = stockData.findIndex(d => String(d.time) === String(algoScores[0].time));
    if (startIndex === -1) return { ...EMPTY, algoScores };

    const canLong = positionMode === 'long' || positionMode === 'both';
    const canShort = positionMode === 'short' || positionMode === 'both';

    for (let i = startIndex; i < stockData.length; i++) {
        const bar = stockData[i];
        const nextBar = stockData[i + 1] || null;
        const score = scoreMap.get(String(bar.time));
        if (score === undefined) continue;

        if (position) {
            let closePrice = null;
            let closeReason = null;
            let closeTime = bar.time;

            if (position.type === 'LONG') {
                // SL/TP for long
                if (stopLossPct > 0) {
                    const slLevel = position.entryPrice * (1 - stopLossPct / 100);
                    if (bar.low <= slLevel) { closePrice = slLevel; closeReason = 'SL (Zarar Kes)'; }
                }
                if (!closeReason && takeProfitPct > 0) {
                    const tpLevel = position.entryPrice * (1 + takeProfitPct / 100);
                    if (bar.high >= tpLevel) { closePrice = tpLevel; closeReason = 'TP (Kâr Al)'; }
                }
                if (!closeReason && exitOnSignal && score <= sellThreshold) {
                    closePrice = nextBar ? nextBar.open : bar.close;
                    closeTime = nextBar ? nextBar.time : bar.time;
                    closeReason = 'Sinyal (Trend Dönüşü)';
                }
                if (closeReason) {
                    const pnlPct = ((closePrice - position.entryPrice) / position.entryPrice) * 100;
                    balance = balance * (1 + pnlPct / 100);
                    equityCurve.push(balance);
                    totalTrades++;
                    if (pnlPct > 0) wonTrades++;
                    signals.push({ time: closeTime, type: 'Sell', price: closePrice, reason: closeReason });
                    tradeHistory.push({
                        entryTime: position.entryTime, exitTime: closeTime,
                        entryPrice: position.entryPrice, exitPrice: closePrice,
                        type: 'LONG', profitLossPct: pnlPct, reason: closeReason
                    });
                    position = null;
                }
            } else if (position.type === 'SHORT') {
                // SL/TP for short (reversed direction)
                if (stopLossPct > 0) {
                    const slLevel = position.entryPrice * (1 + stopLossPct / 100);
                    if (bar.high >= slLevel) { closePrice = slLevel; closeReason = 'SL (Zarar Kes)'; }
                }
                if (!closeReason && takeProfitPct > 0) {
                    const tpLevel = position.entryPrice * (1 - takeProfitPct / 100);
                    if (bar.low <= tpLevel) { closePrice = tpLevel; closeReason = 'TP (Kâr Al)'; }
                }
                if (!closeReason && exitOnSignal && score >= buyThreshold) {
                    closePrice = nextBar ? nextBar.open : bar.close;
                    closeTime = nextBar ? nextBar.time : bar.time;
                    closeReason = 'Sinyal (Trend Dönüşü)';
                }
                if (closeReason) {
                    const pnlPct = ((position.entryPrice - closePrice) / position.entryPrice) * 100;
                    balance = balance * (1 + pnlPct / 100);
                    equityCurve.push(balance);
                    totalTrades++;
                    if (pnlPct > 0) wonTrades++;
                    signals.push({ time: closeTime, type: 'ShortCover', price: closePrice, reason: closeReason });
                    tradeHistory.push({
                        entryTime: position.entryTime, exitTime: closeTime,
                        entryPrice: position.entryPrice, exitPrice: closePrice,
                        type: 'SHORT', profitLossPct: pnlPct, reason: closeReason
                    });
                    position = null;
                }
            }
        }

        // Open new position only when no position is open
        if (!position) {
            if (canLong && score >= buyThreshold && nextBar) {
                position = { type: 'LONG', entryPrice: nextBar.open, entryTime: nextBar.time };
                signals.push({ time: nextBar.time, type: 'Buy', price: nextBar.open, reason: 'Sinyal (Bar Kapanışı)' });
            } else if (canShort && score <= sellThreshold && nextBar) {
                position = { type: 'SHORT', entryPrice: nextBar.open, entryTime: nextBar.time };
                signals.push({ time: nextBar.time, type: 'Short', price: nextBar.open, reason: 'Short Sinyal' });
            }
        }
    }

    // Close open position at last bar
    if (position) {
        const lastBar = stockData[stockData.length - 1];
        let pnlPct;
        if (position.type === 'LONG') {
            pnlPct = ((lastBar.close - position.entryPrice) / position.entryPrice) * 100;
            signals.push({ time: lastBar.time, type: 'Sell', price: lastBar.close, reason: 'Bitiş (Açık Pozisyon)' });
        } else {
            pnlPct = ((position.entryPrice - lastBar.close) / position.entryPrice) * 100;
            signals.push({ time: lastBar.time, type: 'ShortCover', price: lastBar.close, reason: 'Bitiş (Açık Pozisyon)' });
        }
        balance = balance * (1 + pnlPct / 100);
        equityCurve.push(balance);
        totalTrades++;
        if (pnlPct > 0) wonTrades++;
        tradeHistory.push({
            entryTime: position.entryTime, exitTime: lastBar.time,
            entryPrice: position.entryPrice, exitPrice: lastBar.close,
            type: position.type, profitLossPct: pnlPct, reason: 'Bitiş (Açık Pozisyon)'
        });
    }

    const totalReturnPct = ((balance - initialBal) / initialBal) * 100;
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
    const startPrice = stockData[startIndex].close;
    const endPrice = stockData[stockData.length - 1].close;
    const buyAndHoldReturn = ((endPrice - startPrice) / startPrice) * 100;
    const maxDrawdownPct = calculateMaxDrawdownPct(equityCurve);

    return {
        algoScores,
        signals,
        tradeHistory,
        metrics: { totalReturnPct, buyAndHoldReturn, winRate, totalTrades, successfulTrades: wonTrades, maxDrawdownPct }
    };
};
