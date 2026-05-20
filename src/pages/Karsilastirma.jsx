import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Loader2, Plus, X, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { fetchStockData } from '../services/api';
import { BIST_STOCKS, getStockMeta } from '../constants/stocks';
import { formatPercent } from '../utils/formatters';
import StockLogo from '../components/ui/StockLogo';
import './Karsilastirma.css';

const COLORS = ['#2dd4bf', '#f59e0b', '#ef4444', '#a78bfa', '#34d399'];

const computeMetrics = (data) => {
    if (!data || data.length < 2) return { totalReturn: null, maxDrawdown: null, annualizedVol: null };

    const closes = data.map((d) => d.close);

    // Total return
    const totalReturn = ((closes[closes.length - 1] / closes[0]) - 1) * 100;

    // Max drawdown
    let peak = closes[0];
    let maxDrawdown = 0;
    for (const price of closes) {
        if (price > peak) peak = price;
        const dd = (peak - price) / peak * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Daily returns → annualized volatility
    const dailyReturns = [];
    for (let i = 1; i < closes.length; i++) {
        dailyReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
    const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

    return { totalReturn, maxDrawdown: -maxDrawdown, annualizedVol };
};

const Karsilastirma = () => {
    const navigate = useNavigate();

    const [selectedSymbols, setSelectedSymbols] = useState([]);
    const [stockDataMap, setStockDataMap] = useState(new Map()); // symbol → { data, meta }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectValue, setSelectValue] = useState('');

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    // Fetch data for newly added symbols
    useEffect(() => {
        if (selectedSymbols.length === 0) return;

        const missing = selectedSymbols.filter((sym) => !stockDataMap.has(sym));
        if (missing.length === 0) return;

        let cancelled = false;
        setLoading(true);
        setError('');

        const fetchAll = async () => {
            const results = await Promise.all(
                missing.map((sym) => fetchStockData(sym, '1y', '1d').then((res) => ({ sym, res })))
            );

            if (cancelled) return;

            const newMap = new Map(stockDataMap);
            let hasError = false;
            for (const { sym, res } of results) {
                if (res.success && res.data.length > 0) {
                    newMap.set(sym, { data: res.data, meta: res.meta });
                } else {
                    hasError = true;
                    newMap.set(sym, { data: [], meta: res.meta || {} });
                }
            }

            if (hasError) setError('Bazı hisseler için veri alınamadı.');
            setStockDataMap(newMap);
            setLoading(false);
        };

        fetchAll();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSymbols]);

    // Build / rebuild chart
    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (selectedSymbols.length === 0) return;

        // Determine theme
        const isDark = document.documentElement.dataset.theme === 'dark';

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 420,
            layout: {
                background: { color: 'transparent' },
                textColor: isDark ? '#94a3b8' : '#667085',
            },
            grid: {
                vertLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                horzLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            },
            rightPriceScale: {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
            timeScale: {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                timeVisible: true,
            },
            crosshair: {
                mode: 1,
            },
            handleScroll: true,
            handleScale: true,
        });

        chartRef.current = chart;

        const seriesList = [];

        for (let i = 0; i < selectedSymbols.length; i++) {
            const sym = selectedSymbols[i];
            const entry = stockDataMap.get(sym);
            if (!entry || entry.data.length === 0) continue;

            const { data } = entry;
            const firstClose = data[0].close;
            if (!firstClose || firstClose === 0) continue;

            const normalized = data.map((bar) => ({
                time: bar.time,
                value: ((bar.close / firstClose) - 1) * 100,
            }));

            const series = chart.addLineSeries({
                color: COLORS[i % COLORS.length],
                lineWidth: 2,
                title: sym,
                priceFormat: {
                    type: 'custom',
                    formatter: (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`,
                    minMove: 0.01,
                },
            });
            series.setData(normalized);
            seriesList.push(series);
        }

        if (seriesList.length > 0) {
            chart.timeScale().fitContent();
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
        };
    }, [selectedSymbols, stockDataMap]);

    const addSymbol = (sym) => {
        if (!sym) return;
        if (selectedSymbols.includes(sym)) return;
        if (selectedSymbols.length >= 5) return;
        setSelectedSymbols((prev) => [...prev, sym]);
        setSelectValue('');
    };

    const removeSymbol = (sym) => {
        setSelectedSymbols((prev) => prev.filter((s) => s !== sym));
    };

    const metrics = useMemo(() => {
        return selectedSymbols.map((sym) => {
            const entry = stockDataMap.get(sym);
            if (!entry) return { sym, totalReturn: null, maxDrawdown: null, annualizedVol: null };
            return { sym, ...computeMetrics(entry.data) };
        });
    }, [selectedSymbols, stockDataMap]);

    const hasData = selectedSymbols.some((sym) => {
        const entry = stockDataMap.get(sym);
        return entry && entry.data.length > 0;
    });

    const showMetrics = selectedSymbols.length >= 2 && hasData;

    return (
        <div className="karsilastirma-page animate-fade-in">
            {/* Header */}
            <div className="kars-header glass-panel">
                <div className="kars-header-text">
                    <div className="kars-header-icon-wrap">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h1 className="kars-title">Hisse Karşılaştırma</h1>
                        <p className="kars-subtitle text-muted">
                            En fazla 5 hisseyi normalize edilmiş bazda karşılaştırın
                        </p>
                    </div>
                </div>
                <div className="kars-header-meta">
                    <Activity size={14} />
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>1 Yıllık · Günlük</span>
                </div>
            </div>

            {/* Stock Selector */}
            <div className="kars-selector glass-panel">
                <TrendingUp size={16} className="text-muted" style={{ flexShrink: 0 }} />
                <select
                    className="kars-select"
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    disabled={selectedSymbols.length >= 5}
                >
                    <option value="">Hisse seçin…</option>
                    {BIST_STOCKS.filter((s) => !selectedSymbols.includes(s.symbol)).map((s) => (
                        <option key={s.symbol} value={s.symbol}>
                            {s.symbol} — {s.name}
                        </option>
                    ))}
                </select>

                <button
                    className="kars-add-btn"
                    onClick={() => addSymbol(selectValue)}
                    disabled={!selectValue || selectedSymbols.length >= 5}
                >
                    <Plus size={15} />
                    Ekle
                </button>

                {selectedSymbols.length > 0 && (
                    <div className="kars-chips">
                        {selectedSymbols.map((sym, idx) => {
                            const meta = getStockMeta(sym);
                            return (
                                <div
                                    key={sym}
                                    className="kars-chip"
                                    style={{ '--chip-color': COLORS[idx % COLORS.length] }}
                                >
                                    <span className="chip-dot" />
                                    <StockLogo
                                        symbol={sym}
                                        name={meta?.name || sym}
                                        className="chip-logo"
                                    />
                                    <span className="chip-label">{sym}</span>
                                    <button
                                        className="chip-remove"
                                        onClick={() => removeSymbol(sym)}
                                        title={`${sym} kaldır`}
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {selectedSymbols.length >= 5 && (
                    <span className="kars-limit-note text-muted">Maksimum 5 hisse</span>
                )}
            </div>

            {/* Chart Area */}
            {selectedSymbols.length === 0 ? (
                <div className="kars-empty glass-panel">
                    <BarChart3 size={40} className="kars-empty-icon" />
                    <p className="kars-empty-title">Karşılaştırma başlatın</p>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                        Yukarıdan hisse ekleyerek normalize edilmiş performans grafiğini görün.
                    </p>
                </div>
            ) : (
                <div className="kars-chart-wrap glass-panel">
                    {loading && (
                        <div className="kars-chart-overlay">
                            <Loader2 size={28} className="spin-icon" />
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Veri yükleniyor…</span>
                        </div>
                    )}
                    {error && (
                        <div className="kars-error-note text-muted">
                            <X size={13} /> {error}
                        </div>
                    )}
                    <div ref={chartContainerRef} className="kars-chart-inner" />
                </div>
            )}

            {/* Metrics Table */}
            {showMetrics && (
                <div className="kars-metrics glass-panel">
                    <h3 className="kars-metrics-title">
                        <Activity size={16} />
                        Performans Metrikleri
                    </h3>
                    <div className="kars-table-wrap">
                        <table className="metrics-table">
                            <thead>
                                <tr>
                                    <th className="metric-row-header">Metrik</th>
                                    {metrics.map((m, idx) => {
                                        const meta = getStockMeta(m.sym);
                                        return (
                                            <th key={m.sym}>
                                                <div
                                                    className="metric-header-cell"
                                                    style={{ '--chip-color': COLORS[idx % COLORS.length] }}
                                                >
                                                    <span className="chip-dot" />
                                                    <StockLogo
                                                        symbol={m.sym}
                                                        name={meta?.name || m.sym}
                                                        className="chip-logo"
                                                    />
                                                    <span>{m.sym}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="metric-label-cell">
                                        <TrendingUp size={13} className="metric-row-icon" />
                                        Toplam Getiri
                                    </td>
                                    {metrics.map((m) => (
                                        <td
                                            key={m.sym}
                                            className={
                                                m.totalReturn === null
                                                    ? ''
                                                    : m.totalReturn >= 0
                                                    ? 'positive-text'
                                                    : 'negative-text'
                                            }
                                        >
                                            {m.totalReturn === null ? '—' : formatPercent(m.totalReturn)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="metric-label-cell">
                                        <Activity size={13} className="metric-row-icon" />
                                        Maks Düşüş
                                    </td>
                                    {metrics.map((m) => (
                                        <td key={m.sym} className={m.maxDrawdown !== null ? 'negative-text' : ''}>
                                            {m.maxDrawdown === null ? '—' : formatPercent(m.maxDrawdown)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="metric-label-cell">
                                        <BarChart3 size={13} className="metric-row-icon" />
                                        Volatilite (yıllık)
                                    </td>
                                    {metrics.map((m) => (
                                        <td key={m.sym}>
                                            {m.annualizedVol === null
                                                ? '—'
                                                : `${m.annualizedVol.toFixed(2)}%`}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Karsilastirma;
