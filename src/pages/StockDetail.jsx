import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStockData } from '../services/api';
import { runAdvancedBacktest } from '../utils/advancedBacktest';
import StockChart from '../components/chart/StockChart';
import { formatCurrency, formatPercent, formatLargeNumber } from '../utils/formatters';
import { getStockMeta, BIST_STOCKS } from '../constants/stocks';
import StockLogo from '../components/ui/StockLogo';
import { loadGlobalStrategy } from '../utils/strategyStorage';
import {
    Loader2, TrendingUp, TrendingDown, Activity, CheckCircle,
    Percent, Calendar, Download, GitCompare, X, Bell, Plus
} from 'lucide-react';
import './StockDetail.css';

const RISK_PRESETS = [
    { name: 'Temkinli', tp: 0.8, sl: 2 },
    { name: 'Dengeli',  tp: 1,   sl: 3 },
    { name: 'Agresif',  tp: 2,   sl: 5 },
];

const StockDetail = () => {
    const { symbol } = useParams();
    const globalStrategy = useMemo(() => loadGlobalStrategy(), []);

    const [stockData, setStockData]     = useState(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [timeframe, setTimeframe]     = useState(globalStrategy.defaultTimeframe);

    const [tpInput, setTpInput] = useState(globalStrategy.takeProfit);
    const [slInput, setSlInput] = useState(globalStrategy.stopLoss);
    const [takeProfit, setTakeProfit]   = useState(globalStrategy.takeProfit);
    const [stopLoss, setStopLoss]       = useState(globalStrategy.stopLoss);

    const [startDate, setStartDate] = useState('');
    const [endDate,   setEndDate]   = useState('');

    // Position mode: long | short | both
    const [positionMode, setPositionMode] = useState(globalStrategy.positionMode);

    // Comparison
    const [compSymbol,     setCompSymbol]     = useState('');
    const [compData,       setCompData]       = useState(null);
    const [compLoading,    setCompLoading]    = useState(false);

    const [buyThreshold]  = useState(globalStrategy.buyThreshold);
    const [sellThreshold] = useState(globalStrategy.sellThreshold);

    const [backtestResults, setBacktestResults] = useState(null);
    const [isCalculating,   setIsCalculating]   = useState(false);
    const [exitOnSignal,    setExitOnSignal]    = useState(true);

    // Strateji Alarmı
    const [alarmSignal, setAlarmSignal] = useState('buy');
    const [alarmSaved, setAlarmSaved] = useState(false);

    const STRATEGY_ALARM_KEY = 'bist_strategy_alarms_v1';
    const addStrategyAlarm = async () => {
        if (Notification.permission === 'default') await Notification.requestPermission();
        const existing = JSON.parse(localStorage.getItem(STRATEGY_ALARM_KEY) || '[]');
        const sym = symbol.replace('.IS', '').toUpperCase();
        const filtered = existing.filter(a => !(a.symbol === sym && a.signalType === alarmSignal));
        const updated = [...filtered, {
            id: Date.now(),
            symbol: sym,
            signalType: alarmSignal,
            timeframe,
            buyThreshold,
            sellThreshold,
        }];
        localStorage.setItem(STRATEGY_ALARM_KEY, JSON.stringify(updated));
        setAlarmSaved(true);
        setTimeout(() => setAlarmSaved(false), 2000);
    };

    // Optimization
    const [showOptimization, setShowOptimization] = useState(false);
    const [optimResults, setOptimResults] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Debounce TP/SL
    useEffect(() => {
        const t = setTimeout(() => { setTakeProfit(tpInput); setStopLoss(slInput); }, 600);
        return () => clearTimeout(t);
    }, [tpInput, slInput]);

    const formatTimeLine = (time) => {
        if (!time) return '-';
        const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
        const d  = String(date.getUTCDate()).padStart(2, '0');
        const m  = String(date.getUTCMonth() + 1).padStart(2, '0');
        const y  = date.getUTCFullYear();
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        return `${d}.${m}.${y} ${hh}:${mm}`;
    };

    // Fetch main stock data
    useEffect(() => {
        const fetchAndAnalyze = async () => {
            setLoading(true);
            setError(null);
            let range = '5y';
            if (timeframe === '5m' || timeframe === '15m') range = '60d';
            else if (timeframe === '1h' || timeframe === '4h') range = '730d';
            const response = await fetchStockData(symbol, range, timeframe);
            if (response.success && response.data.length > 0) {
                setStockData(response);
                const toDateStr = (t) => {
                    const d = typeof t === 'number' ? new Date(t * 1000) : new Date(t);
                    return d.toISOString().split('T')[0];
                };
                setStartDate(toDateStr(response.data[0].time));
                setEndDate(toDateStr(response.data[response.data.length - 1].time));
            } else {
                setError(response.error || 'Hisse verisi bulunamadı.');
            }
            setLoading(false);
        };
        fetchAndAnalyze();
    }, [symbol, timeframe]);

    // Run backtest
    useEffect(() => {
        if (!stockData?.data) return;
        setIsCalculating(true);
        setBacktestResults(null);
        const t = setTimeout(() => {
            try {
                const filteredData = stockData.data.filter(bar => {
                    const bStr = (typeof bar.time === 'number' ? new Date(bar.time * 1000) : new Date(bar.time)).toISOString().split('T')[0];
                    return (!startDate || bStr >= startDate) && (!endDate || bStr <= endDate);
                });
                if (filteredData.length < 10) { setIsCalculating(false); return; }
                const results = runAdvancedBacktest(filteredData, buyThreshold, sellThreshold, takeProfit, stopLoss, exitOnSignal, positionMode);
                setBacktestResults(results);
            } catch (err) {
                console.error('Backtest hatası:', err);
            } finally {
                setIsCalculating(false);
            }
        }, 50);
        return () => clearTimeout(t);
    }, [stockData, buyThreshold, sellThreshold, takeProfit, stopLoss, exitOnSignal, startDate, endDate, positionMode]);

    // Fetch comparison stock data
    useEffect(() => {
        if (!compSymbol) { setCompData(null); return; }
        const fetch = async () => {
            setCompLoading(true);
            try {
                let range = '5y';
                if (timeframe === '5m' || timeframe === '15m') range = '60d';
                else if (timeframe === '1h' || timeframe === '4h') range = '730d';
                const resp = await fetchStockData(compSymbol, range, timeframe);
                if (resp.success && resp.data.length > 0) setCompData(resp.data);
                else setCompData(null);
            } catch { setCompData(null); }
            finally { setCompLoading(false); }
        };
        fetch();
    }, [compSymbol, timeframe]);

    if (loading) {
        return (
            <div className="stock-detail-page center-content">
                <Loader2 className="spinner" size={40} />
                <p>Hesaplanıyor ve veri çekiliyor...</p>
            </div>
        );
    }

    if (error || !stockData) {
        return (
            <div className="stock-detail-page center-content">
                <div className="error-state glass-panel">
                    <h2>Hisse Bulunamadı</h2>
                    <p className="negative-text">{error}</p>
                </div>
            </div>
        );
    }

    const { currentPrice, previousClose } = stockData.meta;
    const changeAmt  = currentPrice - previousClose;
    const changePct  = (changeAmt / previousClose) * 100;
    const isPositive = changeAmt >= 0;
    const cleanSymbol = stockData.meta.symbol.replace('.IS', '');
    const stockMeta  = getStockMeta(cleanSymbol);

    // Comparison % return
    const compReturn = compData?.length
        ? ((compData[compData.length - 1].close - compData[0].close) / compData[0].close) * 100
        : null;
    const mainReturn = stockData.data.length
        ? ((stockData.data[stockData.data.length - 1].close - stockData.data[0].close) / stockData.data[0].close) * 100
        : null;

    const runOptimization = async () => {
        if (!stockData?.data?.length) return;
        setIsOptimizing(true);
        setOptimResults([]);

        const tpValues = [0.5, 1, 2, 3, 5];
        const slValues = [1, 2, 5, 8];
        const combinations = [];
        for (const tp of tpValues) {
            for (const sl of slValues) {
                combinations.push({ tp, sl });
            }
        }

        const results = [];
        for (let i = 0; i < combinations.length; i++) {
            const { tp, sl } = combinations[i];
            const res = runAdvancedBacktest(stockData.data, buyThreshold, sellThreshold, tp, sl, true, positionMode);
            results.push({
                tp, sl,
                totalReturn: res?.metrics?.totalReturnPct ?? 0,
                winRate: res?.metrics?.winRate ?? 0,
                totalTrades: res?.metrics?.totalTrades ?? 0,
                maxDrawdown: res?.metrics?.maxDrawdownPct ?? 0,
            });
            if ((i + 1) % 4 === 0) await new Promise(r => setTimeout(r, 0));
        }

        results.sort((a, b) => b.totalReturn - a.totalReturn);
        setOptimResults(results.slice(0, 10));
        setIsOptimizing(false);
    };

    const exportTradeHistoryCsv = () => {
        if (!backtestResults?.tradeHistory?.length) return;
        const header = ['entry_time', 'exit_time', 'entry_price', 'exit_price', 'type', 'profit_loss_pct', 'reason'];
        const lines  = backtestResults.tradeHistory.map(t => [
            formatTimeLine(t.entryTime), formatTimeLine(t.exitTime),
            Number(t.entryPrice).toFixed(4), Number(t.exitPrice).toFixed(4),
            t.type, Number(t.profitLossPct).toFixed(4), t.reason,
        ]);
        const csv  = [header, ...lines].map(row => row.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cleanSymbol}_${timeframe}_trade_history.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="stock-detail-page animate-fade-in">
            {stockData.meta.isMock && (
                <div className="mock-warning-banner">
                    <span className="mock-warning-icon">⚠️</span>
                    <div>
                        <strong>DEMO VERİ — Fiyatlar Gerçek Değil</strong>
                        <p>Yahoo Finance API'sine şu anda erişilemiyor. Gösterilen fiyatlar simülasyon verisinden oluşmaktadır.</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="stock-header glass-panel">
                <div className="stock-title-container">
                    <StockLogo symbol={cleanSymbol} name={stockMeta?.name} alt={stockData.meta.symbol} className="stock-header-logo" />
                    <div className="stock-title">
                        <h1 className="stock-main-symbol">{cleanSymbol}</h1>
                        <div className="stock-subtitle">
                            <p className="text-muted">{stockMeta?.name || 'Borsa Istanbul'}</p>
                            <span className={`source-badge ${stockData.meta.isMock ? 'mock' : 'real'}`}>{stockData.meta.source}</span>
                        </div>
                    </div>
                </div>
                <div className="stock-price-info">
                    <div className="current-price-huge">{formatCurrency(currentPrice)}</div>
                    <div className={`price-change ${isPositive ? 'positive-text' : 'negative-text'}`}>
                        {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        <span>{formatCurrency(Math.abs(changeAmt))} ({formatPercent(Math.abs(changePct))})</span>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stock-stats-bar glass-panel animate-slide-up">
                <div className="stat-item">
                    <span className="stat-label">Sektör</span>
                    <span className="stat-value">{stockMeta?.sector || 'N/A'}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-label">Gün Aralığı</span>
                    <span className="stat-value">{formatCurrency(stockData.meta.dayLow)} – {formatCurrency(stockData.meta.dayHigh)}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-label">52 Hafta</span>
                    <span className="stat-value">{formatCurrency(stockData.meta.fiftyTwoWeekLow)} – {formatCurrency(stockData.meta.fiftyTwoWeekHigh)}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-label">Hacim</span>
                    <span className="stat-value">{formatLargeNumber(stockData.meta.volume)}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-label">Zaman Dilimi</span>
                    <div className="timeframe-selector small">
                        {['5m', '15m', '1h', '4h', '1d'].map(tf => (
                            <button key={tf} className={`tf-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container glass-panel">
                <StockChart
                    data={stockData.data}
                    backtestResults={backtestResults}
                    comparisonData={compData}
                    comparisonSymbol={compSymbol}
                />
            </div>

            {/* Comparison Panel */}
            <div className="comparison-section glass-panel">
                <div className="comparison-header">
                    <h3><GitCompare size={16} /> Hisse Karşılaştırma</h3>
                    {compLoading && <span className="text-muted" style={{ fontSize: '0.8rem' }}>Yükleniyor...</span>}
                </div>
                <div className="comparison-picker">
                    <select
                        value={compSymbol}
                        onChange={e => setCompSymbol(e.target.value)}
                        className="comparison-select"
                    >
                        <option value="">Karşılaştırılacak hisse seç</option>
                        {BIST_STOCKS.filter(s => s.symbol !== cleanSymbol).map(s => (
                            <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                        ))}
                    </select>
                    {compSymbol && (
                        <button className="comparison-clear-btn" onClick={() => setCompSymbol('')}>
                            <X size={13} /> Kaldır
                        </button>
                    )}
                </div>
                {compData && mainReturn !== null && compReturn !== null && (
                    <div className="comparison-metrics" style={{ marginTop: '0.75rem' }}>
                        <div className="cmp-metric">
                            <span className="cmp-label">{cleanSymbol} Getiri</span>
                            <span className={`cmp-value ${mainReturn >= 0 ? 'positive-text' : 'negative-text'}`}>{formatPercent(mainReturn)}</span>
                        </div>
                        <div className="cmp-metric">
                            <span className="cmp-label">{compSymbol} Getiri</span>
                            <span className={`cmp-value ${compReturn >= 0 ? 'positive-text' : 'negative-text'}`}>{formatPercent(compReturn)}</span>
                        </div>
                        <div className="cmp-metric">
                            <span className="cmp-label">Fark</span>
                            <span className={`cmp-value ${mainReturn - compReturn >= 0 ? 'positive-text' : 'negative-text'}`}>
                                {formatPercent(mainReturn - compReturn)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Strateji Alarm Paneli */}
            {(() => {
                const currentScore = backtestResults?.algoScores?.at(-1)?.score ?? null;
                return (
                    <div className="stock-alarm-panel glass-panel">
                        <div className="alarm-panel-hd">
                            <Bell size={14} />
                            <strong>{cleanSymbol} — Strateji Alarmı</strong>
                            {currentScore !== null && (
                                <span className={`alarm-score-badge ${currentScore >= buyThreshold ? 'score-buy' : currentScore <= sellThreshold ? 'score-sell' : 'score-neutral'}`}>
                                    Güncel skor: {currentScore > 0 ? '+' : ''}{currentScore.toFixed(1)}
                                </span>
                            )}
                        </div>
                        <p className="alarm-browser-note">⚠️ Alarm yalnızca <strong>tarayıcı açıkken</strong> her 2 dakikada kontrol edilir.</p>
                        <div className="alarm-form-row">
                            <div className="alarm-signal-btns">
                                <button
                                    className={`signal-btn ${alarmSignal === 'buy' ? 'active-buy' : ''}`}
                                    onClick={() => setAlarmSignal('buy')}
                                >
                                    🟢 Al Sinyali
                                </button>
                                <button
                                    className={`signal-btn ${alarmSignal === 'sell' ? 'active-sell' : ''}`}
                                    onClick={() => setAlarmSignal('sell')}
                                >
                                    🔴 Sat Sinyali
                                </button>
                                <button
                                    className={`signal-btn ${alarmSignal === 'both' ? 'active-both' : ''}`}
                                    onClick={() => setAlarmSignal('both')}
                                >
                                    ⚡ Her İkisi
                                </button>
                            </div>
                            <span className="alarm-threshold-hint text-muted">
                                Al ≥ {buyThreshold} · Sat ≤ {sellThreshold} · {timeframe}
                            </span>
                            <button className="preset-btn alarm-save-btn" onClick={addStrategyAlarm}>
                                {alarmSaved ? '✓ Kaydedildi' : <><Bell size={14} /> Alarm Kur</>}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Optimization Panel */}
            <div className="glass-panel optim-panel">
                <div className="optim-header" onClick={() => setShowOptimization(p => !p)}>
                    <Activity size={16} />
                    <strong>TP/SL Optimizasyonu</strong>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                        20 kombinasyon · en iyi 10 sonuç
                    </span>
                    <button className="optim-toggle-btn" style={{ marginLeft: 'auto' }}>
                        {showOptimization ? <X size={14} /> : 'Göster'}
                    </button>
                </div>
                {showOptimization && (
                    <div className="optim-body">
                        <button
                            className="preset-btn optim-run-btn"
                            onClick={runOptimization}
                            disabled={isOptimizing}
                        >
                            {isOptimizing ? <><Loader2 size={14} className="spin-icon" /> Hesaplanıyor…</> : '▶ Optimizasyonu Çalıştır'}
                        </button>
                        {optimResults.length > 0 && (
                            <div className="optim-table-wrap">
                                <table className="optim-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>TP %</th>
                                            <th>SL %</th>
                                            <th>Strateji Getiri</th>
                                            <th>Win Rate</th>
                                            <th>İşlem</th>
                                            <th>Max DD</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {optimResults.map((r, i) => (
                                            <tr key={i} className={i === 0 ? 'optim-best-row' : ''}>
                                                <td>{i === 0 ? '🏆' : i + 1}</td>
                                                <td><strong>{r.tp}%</strong></td>
                                                <td><strong>{r.sl}%</strong></td>
                                                <td className={r.totalReturn >= 0 ? 'positive-text' : 'negative-text'}>
                                                    {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(1)}%
                                                </td>
                                                <td>{r.winRate.toFixed(1)}%</td>
                                                <td>{r.totalTrades}</td>
                                                <td className="negative-text">{r.maxDrawdown.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Backtest Settings */}
            <div className="backtest-section">
                {isCalculating && (
                    <div className="calculating-overlay">
                        <Loader2 className="spinner" size={28} />
                        <span>Strateji Hesaplanıyor...</span>
                    </div>
                )}
                <div className="backtest-header">
                    <h2>Backtest: Trend, Momentum &amp; Hacim</h2>
                    <div className="strategy-settings glass-panel">
                        <div className="settings-row">
                            <div className="settings-group">
                                <span className="settings-label">Risk Yönetimi</span>
                                <div className="inputs">
                                    <label>TP %:<input type="number" value={tpInput} onChange={e => setTpInput(Number(e.target.value))} min="0" max="100" className="param-input" /></label>
                                    <label>SL %:<input type="number" value={slInput} onChange={e => setSlInput(Number(e.target.value))} min="0" max="100" className="param-input" /></label>
                                </div>
                                <div className="preset-buttons">
                                    {RISK_PRESETS.map(p => (
                                        <button key={p.name} className="preset-chip" onClick={() => { setTpInput(p.tp); setSlInput(p.sl); }}>{p.name}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-group">
                                <span className="settings-label"><Calendar size={14} /> Tarih Aralığı</span>
                                <div className="inputs">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input" />
                                    <span className="date-sep">–</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input" />
                                </div>
                            </div>

                            <div className="settings-group">
                                <span className="settings-label">Pozisyon Yönü</span>
                                <div className="position-mode-group">
                                    {[
                                        { val: 'long',  label: 'Long',  cls: '' },
                                        { val: 'short', label: 'Short', cls: 'short' },
                                        { val: 'both',  label: 'Her İkisi', cls: 'both' },
                                    ].map(m => (
                                        <button
                                            key={m.val}
                                            className={`pos-btn ${positionMode === m.val ? `active ${m.cls}` : ''}`}
                                            onClick={() => setPositionMode(m.val)}
                                        >{m.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="settings-footer">
                            <label className="exit-signal-label">
                                <input type="checkbox" checked={exitOnSignal} onChange={e => setExitOnSignal(e.target.checked)} className="exit-signal-checkbox" />
                                Sinyal dönüşünde işlemi kapat
                            </label>
                        </div>
                    </div>
                </div>

                {backtestResults?.metrics && (
                    <div className="metrics-grid">
                        <div className="metric-card glass-panel">
                            <div className="metric-icon"><Percent size={24} /></div>
                            <div className="metric-content">
                                <span className="metric-label">Strateji Toplam Getiri</span>
                                <span className={`metric-value ${backtestResults.metrics.totalReturnPct >= 0 ? 'positive-text' : 'negative-text'}`}>
                                    {formatPercent(backtestResults.metrics.totalReturnPct)}
                                </span>
                                <span className="metric-sub">İlk sermayeye oranla</span>
                            </div>
                        </div>
                        <div className="metric-card glass-panel">
                            <div className="metric-icon"><Activity size={24} /></div>
                            <div className="metric-content">
                                <span className="metric-label">Al ve Tut Getirisi</span>
                                <span className={`metric-value ${backtestResults.metrics.buyAndHoldReturn >= 0 ? 'positive-text' : 'negative-text'}`}>
                                    {formatPercent(backtestResults.metrics.buyAndHoldReturn)}
                                </span>
                                <span className="metric-sub">Strateji olmadan beklenseydi</span>
                            </div>
                        </div>
                        <div className="metric-card glass-panel">
                            <div className="metric-icon"><CheckCircle size={24} /></div>
                            <div className="metric-content">
                                <span className="metric-label">Kazanma Oranı (Win Rate)</span>
                                <span className="metric-value">{formatPercent(backtestResults.metrics.winRate).replace('+', '')}</span>
                                <span className="metric-sub">{backtestResults.metrics.totalTrades} işlemde oran</span>
                            </div>
                        </div>
                        <div className="metric-card glass-panel">
                            <div className="metric-icon"><Activity size={24} /></div>
                            <div className="metric-content">
                                <span className="metric-label">Maks. Düşüş (MDD)</span>
                                <span className="metric-value negative-text">{formatPercent(backtestResults.metrics.maxDrawdownPct).replace('+', '')}</span>
                                <span className="metric-sub">Sermaye zirvesinden en büyük gerileme</span>
                            </div>
                        </div>
                    </div>
                )}

                {backtestResults?.tradeHistory?.length > 0 && (
                    <div className="trade-history-panel glass-panel">
                        <div className="trade-history-header">
                            <h3>Geçmiş İşlemler ({backtestResults.tradeHistory.length})</h3>
                            <button className="export-trades-btn" onClick={exportTradeHistoryCsv}>
                                <Download size={16} /> CSV İndir
                            </button>
                        </div>
                        <div className="table-responsive">
                            <table className="trade-table">
                                <thead>
                                    <tr>
                                        <th>Yön</th>
                                        <th>Giriş Zamanı</th>
                                        <th>Çıkış Zamanı</th>
                                        <th>Giriş Fiyatı</th>
                                        <th>Çıkış Fiyatı</th>
                                        <th>Kar/Zarar</th>
                                        <th>Kapanış Nedeni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backtestResults.tradeHistory.slice().reverse().map((trade, idx) => (
                                        <tr key={idx} className={trade.profitLossPct >= 0 ? 'profit-row' : 'loss-row'}>
                                            <td>
                                                <span style={{ color: trade.type === 'LONG' ? '#10b981' : '#f97316', fontWeight: 700, fontSize: '0.78rem' }}>
                                                    {trade.type}
                                                </span>
                                            </td>
                                            <td>{formatTimeLine(trade.entryTime)}</td>
                                            <td>{formatTimeLine(trade.exitTime)}</td>
                                            <td>{formatCurrency(trade.entryPrice)}</td>
                                            <td>{formatCurrency(trade.exitPrice)}</td>
                                            <td className={trade.profitLossPct >= 0 ? 'positive-text' : 'negative-text'}>
                                                {formatPercent(trade.profitLossPct)}
                                            </td>
                                            <td>{trade.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default StockDetail;
