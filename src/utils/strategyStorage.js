export const STRATEGY_KEY = 'bist_global_strategy_v1';

export const DEFAULT_STRATEGY = {
    riskProfile: 'balanced',
    buyThreshold: 25,
    sellThreshold: -25,
    takeProfit: 1,
    stopLoss: 3,
    positionMode: 'long',
    exitOnSignal: true,
    ema1Period: 9,
    ema2Period: 21,
    ema3Period: 50,
    rsiPeriod: 14,
    adxPeriod: 14,
    adxMinStrength: 20,
    defaultTimeframe: '1d',
    screenerMinTrades: 1,
    screenerMinWinRate: 30,
    trailingStopEnabled: false,
    trailingStopPct: 1.5,
    volumeFilterEnabled: false,
    adxFilterEnabled: false,
};

export const RISK_PROFILES = {
    conservative: {
        label: 'Temkinli',
        description: 'Düşük risk, güçlü trendlerde işlem, sıkı stop-loss',
        color: '#10b981',
        icon: '🛡️',
        buyThreshold: 35,
        sellThreshold: -35,
        takeProfit: 0.8,
        stopLoss: 2,
        positionMode: 'long',
        exitOnSignal: true,
        adxFilterEnabled: true,
        adxMinStrength: 25,
        trailingStopEnabled: false,
        volumeFilterEnabled: false,
    },
    balanced: {
        label: 'Dengeli',
        description: 'Orta risk, iyi getiri/risk dengesi, varsayılan',
        color: '#22d3ee',
        icon: '⚖️',
        buyThreshold: 25,
        sellThreshold: -25,
        takeProfit: 1,
        stopLoss: 3,
        positionMode: 'long',
        exitOnSignal: true,
        adxFilterEnabled: false,
        adxMinStrength: 20,
        trailingStopEnabled: false,
        volumeFilterEnabled: false,
    },
    aggressive: {
        label: 'Agresif',
        description: 'Yüksek risk, çok işlem, long+short yönler',
        color: '#f59e0b',
        icon: '⚡',
        buyThreshold: 15,
        sellThreshold: -15,
        takeProfit: 2,
        stopLoss: 5,
        positionMode: 'both',
        exitOnSignal: false,
        adxFilterEnabled: false,
        adxMinStrength: 15,
        trailingStopEnabled: false,
        volumeFilterEnabled: false,
    },
};

export const loadGlobalStrategy = () => {
    try {
        const s = JSON.parse(localStorage.getItem(STRATEGY_KEY) || '{}');
        return { ...DEFAULT_STRATEGY, ...s };
    } catch {
        return { ...DEFAULT_STRATEGY };
    }
};

export const saveGlobalStrategy = (strategy) => {
    localStorage.setItem(STRATEGY_KEY, JSON.stringify(strategy));

    // Sync to screener backtest key so Screener picks up the settings
    localStorage.setItem('bist_screener_backtest_v1', JSON.stringify({
        buyThreshold: strategy.buyThreshold,
        sellThreshold: strategy.sellThreshold,
        takeProfit: strategy.takeProfit,
        stopLoss: strategy.stopLoss,
        exitOnSignal: strategy.exitOnSignal,
    }));

    // Sync screener filter defaults
    let existingFilters = {};
    try { existingFilters = JSON.parse(localStorage.getItem('bist_screener_filters_v1') || '{}'); } catch { /* */ }
    localStorage.setItem('bist_screener_filters_v1', JSON.stringify({
        ...existingFilters,
        timeframe: strategy.defaultTimeframe,
        minTrades: strategy.screenerMinTrades,
        minWinRate: strategy.screenerMinWinRate,
    }));
};
