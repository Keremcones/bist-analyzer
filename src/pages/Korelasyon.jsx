import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Grid3x3, Info } from 'lucide-react';
import { fetchStockData } from '../services/api';
import { BIST_STOCKS } from '../constants/stocks';
import './Korelasyon.css';

// ─── Math helpers ──────────────────────────────────────────────────────────────

function calcPearson(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 10) return 0;
    const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
        const xa = a[i] - ma, xb = b[i] - mb;
        num += xa * xb; da += xa * xa; db += xb * xb;
    }
    const den = Math.sqrt(da * db);
    return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

function getReturns(candles) {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
        const r = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        if (isFinite(r)) returns.push(r);
    }
    return returns;
}

// ─── Color helper ──────────────────────────────────────────────────────────────

function corrColor(corr) {
    if (corr === null || corr === undefined) return 'transparent';
    const abs = Math.abs(corr);
    const hue = corr >= 0 ? 142 : 0;
    const sat = 70;
    const light = Math.round(45 + (1 - abs) * 25);
    const alpha = 0.15 + abs * 0.65;
    return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SYMBOLS = ['AKBNK', 'GARAN', 'THYAO', 'FROTO', 'TOASO', 'EREGL', 'TUPRS', 'BIMAS', 'ARCLK', 'KCHOL', 'SAHOL', 'SISE', 'TCELL', 'ASELS', 'PETKM'];
const MAX_SYMBOLS = 20;
const CONCURRENCY = 5;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Korelasyon() {
    const [selectedSymbols, setSelectedSymbols] = useState(DEFAULT_SYMBOLS);
    const [stockData, setStockData] = useState(new Map());
    const [loading, setLoading] = useState(false);
    const [computing, setComputing] = useState(false);
    const [matrix, setMatrix] = useState(null);
    const [error, setError] = useState('');
    const [tooltip, setTooltip] = useState(null);

    const symbolNameMap = useMemo(() => {
        const m = {};
        BIST_STOCKS.forEach(s => { m[s.symbol] = s.name; });
        return m;
    }, []);

    const addSymbol = useCallback((sym) => {
        setSelectedSymbols(prev => {
            if (prev.includes(sym) || prev.length >= MAX_SYMBOLS) return prev;
            return [...prev, sym];
        });
    }, []);

    const removeSymbol = useCallback((sym) => {
        setSelectedSymbols(prev => prev.filter(s => s !== sym));
    }, []);

    const toggleSymbol = useCallback((sym) => {
        setSelectedSymbols(prev => {
            if (prev.includes(sym)) {
                return prev.filter(s => s !== sym);
            }
            if (prev.length >= MAX_SYMBOLS) return prev;
            return [...prev, sym];
        });
    }, []);

    const fetchAll = useCallback(async () => {
        if (selectedSymbols.length < 2) {
            setError('En az 2 hisse seçin.');
            return;
        }
        setError('');
        setLoading(true);
        setMatrix(null);

        const newMap = new Map(stockData);

        // Fetch in batches of CONCURRENCY
        for (let i = 0; i < selectedSymbols.length; i += CONCURRENCY) {
            const batch = selectedSymbols.slice(i, i + CONCURRENCY);
            await Promise.all(
                batch.map(async (sym) => {
                    if (newMap.has(sym)) return; // already cached
                    try {
                        const result = await fetchStockData(sym, '1d', '1y');
                        if (result && result.data && result.data.length > 0) {
                            newMap.set(sym, result.data);
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch ${sym}:`, e);
                    }
                })
            );
        }

        setStockData(new Map(newMap));
        setLoading(false);

        // Compute matrix
        setComputing(true);
        const returnsCache = {};
        const mat = {};

        for (const s1 of selectedSymbols) {
            mat[s1] = {};
            const candles1 = newMap.get(s1);
            if (!candles1) continue;
            if (!returnsCache[s1]) returnsCache[s1] = getReturns(candles1);
        }

        for (const s1 of selectedSymbols) {
            mat[s1] = {};
            for (const s2 of selectedSymbols) {
                if (s1 === s2) {
                    mat[s1][s2] = 1.0;
                } else if (mat[s2] && mat[s2][s1] !== undefined) {
                    mat[s1][s2] = mat[s2][s1];
                } else {
                    const r1 = returnsCache[s1];
                    const r2 = returnsCache[s2];
                    if (r1 && r2) {
                        mat[s1][s2] = calcPearson(r1, r2);
                    } else {
                        mat[s1][s2] = null;
                    }
                }
            }
        }

        setMatrix(mat);
        setComputing(false);
    }, [selectedSymbols, stockData]);

    const handleCompute = () => {
        // Clear cache for fresh data
        setStockData(new Map());
        fetchAll();
    };

    const validSymbols = selectedSymbols.filter(s => matrix && matrix[s]);

    return (
        <div className="korelasyon-page">
            {/* Header */}
            <div className="kor-header glass-panel">
                <div className="kor-header-left">
                    <div className="kor-header-icon">
                        <Grid3x3 size={22} />
                    </div>
                    <div>
                        <h2 className="kor-title">Korelasyon Matrisi</h2>
                        <p className="kor-desc">
                            Seçili hisseler arasındaki günlük getiri korelasyonlarını görüntüleyin.
                            Yeşil = pozitif, kırmızı = negatif ilişki.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stock Selector */}
            <div className="kor-selector glass-panel">
                <div className="kor-selector-top">
                    <span className="kor-selector-label">
                        Hisse Seçimi
                        <span className="kor-selected-count">{selectedSymbols.length} / {MAX_SYMBOLS}</span>
                    </span>
                    <span className="kor-selector-hint">En fazla {MAX_SYMBOLS} hisse seçilebilir</span>
                </div>
                <div className="kor-stock-chips">
                    {BIST_STOCKS.map(stock => {
                        const selected = selectedSymbols.includes(stock.symbol);
                        const disabled = !selected && selectedSymbols.length >= MAX_SYMBOLS;
                        return (
                            <button
                                key={stock.symbol}
                                className={`kor-stock-chip ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                                onClick={() => toggleSymbol(stock.symbol)}
                                title={stock.name}
                                disabled={disabled}
                            >
                                {stock.symbol}
                            </button>
                        );
                    })}
                </div>
                <div className="kor-actions">
                    <button
                        className="kor-reset-btn"
                        onClick={() => setSelectedSymbols(DEFAULT_SYMBOLS)}
                    >
                        Varsayılanı Yükle
                    </button>
                    <button
                        className="kor-compute-btn"
                        onClick={handleCompute}
                        disabled={loading || computing || selectedSymbols.length < 2}
                    >
                        {(loading || computing) ? (
                            <><Loader2 size={15} className="spin" /> Hesaplanıyor...</>
                        ) : (
                            <><Grid3x3 size={15} /> Hesapla</>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="kor-error glass-panel">
                    <Info size={16} /> {error}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="kor-status glass-panel">
                    <Loader2 size={20} className="spin" />
                    <span>Hisse verileri yükleniyor ({selectedSymbols.length} hisse)...</span>
                </div>
            )}
            {computing && !loading && (
                <div className="kor-status glass-panel">
                    <Loader2 size={20} className="spin" />
                    <span>Korelasyon matrisi hesaplanıyor...</span>
                </div>
            )}

            {/* Matrix */}
            {matrix && !loading && !computing && validSymbols.length > 0 && (
                <>
                    <div className="kor-matrix-wrap glass-panel">
                        <div className="kor-matrix-scroll">
                            <table className="kor-matrix">
                                <thead>
                                    <tr>
                                        <th className="kor-th-corner"></th>
                                        {validSymbols.map(sym => (
                                            <th key={sym} className="kor-th-col">
                                                <span title={symbolNameMap[sym] || sym}>{sym}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {validSymbols.map(s1 => (
                                        <tr key={s1}>
                                            <th className="kor-th-row">
                                                <span title={symbolNameMap[s1] || s1}>{s1}</span>
                                            </th>
                                            {validSymbols.map(s2 => {
                                                const corr = matrix[s1]?.[s2];
                                                const isDiag = s1 === s2;
                                                return (
                                                    <td
                                                        key={s2}
                                                        className={`kor-cell ${isDiag ? 'kor-cell-diag' : ''}`}
                                                        style={{ backgroundColor: isDiag ? undefined : corrColor(corr) }}
                                                        onMouseEnter={() => setTooltip({ s1, s2, corr })}
                                                        onMouseLeave={() => setTooltip(null)}
                                                    >
                                                        {corr === null || corr === undefined ? '–' : corr.toFixed(2)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Tooltip */}
                        {tooltip && tooltip.s1 !== tooltip.s2 && (
                            <div className="kor-tooltip">
                                <strong>{tooltip.s1}</strong> ↔ <strong>{tooltip.s2}</strong>
                                <br />
                                {symbolNameMap[tooltip.s1]} / {symbolNameMap[tooltip.s2]}
                                <br />
                                Korelasyon: <strong>{tooltip.corr !== null ? tooltip.corr?.toFixed(4) : '–'}</strong>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="kor-legend glass-panel">
                        <span className="kor-legend-label neg">−1.0</span>
                        <div className="kor-legend-bar"></div>
                        <span className="kor-legend-label mid">0</span>
                        <div className="kor-legend-bar kor-legend-bar-pos"></div>
                        <span className="kor-legend-label pos">+1.0</span>
                        <span className="kor-legend-note">
                            <Info size={13} /> Renk skalası: kırmızı = negatif, beyaz = nötr, yeşil = pozitif
                        </span>
                    </div>

                    {/* Interpretation guide */}
                    <div className="kor-guide glass-panel">
                        <div className="kor-guide-header">
                            <Info size={15} />
                            <span>Korelasyon Yorumlama Rehberi</span>
                        </div>
                        <div className="kor-guide-grid">
                            <div className="kor-guide-item kor-guide-strong-pos">
                                <span className="kor-guide-range">0.8 – 1.0</span>
                                <span className="kor-guide-text">Güçlü pozitif ilişki</span>
                            </div>
                            <div className="kor-guide-item kor-guide-mid-pos">
                                <span className="kor-guide-range">0.4 – 0.8</span>
                                <span className="kor-guide-text">Orta pozitif ilişki</span>
                            </div>
                            <div className="kor-guide-item kor-guide-weak">
                                <span className="kor-guide-range">−0.4 – 0.4</span>
                                <span className="kor-guide-text">Zayıf / nötr ilişki</span>
                            </div>
                            <div className="kor-guide-item kor-guide-mid-neg">
                                <span className="kor-guide-range">−0.8 – −0.4</span>
                                <span className="kor-guide-text">Orta negatif ilişki</span>
                            </div>
                            <div className="kor-guide-item kor-guide-strong-neg">
                                <span className="kor-guide-range">−1.0 – −0.8</span>
                                <span className="kor-guide-text">Güçlü negatif ilişki</span>
                            </div>
                            <div className="kor-guide-item kor-guide-note">
                                <span className="kor-guide-range">Portföy ipucu</span>
                                <span className="kor-guide-text">Düşük korelasyonlu hisseler portföy riskini dağıtır</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
