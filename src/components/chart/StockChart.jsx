import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useTheme } from '../../context/ThemeContext';
import { EMA } from 'technicalindicators';

const calcEMA = (data, period) => {
    if (data.length < period) return [];
    const closes = data.map(d => d.close);
    const vals = EMA.calculate({ period, values: closes });
    const offset = closes.length - vals.length;
    return data.slice(offset).map((d, i) => ({ time: d.time, value: parseFloat(vals[i].toFixed(4)) }));
};

const INDICATOR_BTNS = [
    { key: 'ema9',   label: 'EMA9',   color: '#22d3ee' },
    { key: 'ema21',  label: 'EMA21',  color: '#f59e0b' },
    { key: 'ema50',  label: 'EMA50',  color: '#a78bfa' },
    { key: 'volume', label: 'Hacim',  color: '#64748b' },
    { key: 'score',  label: 'Score',  color: '#10b981' },
];

const StockChart = ({ data, backtestResults, comparisonData, comparisonSymbol }) => {
    const mainContainerRef = useRef();
    const scoreContainerRef = useRef();
    const mainChartRef = useRef(null);
    const scoreChartRef = useRef(null);
    const { theme } = useTheme();
    const [legendData, setLegendData] = useState(null);
    const [visible, setVisible] = useState({ ema9: true, ema21: true, ema50: true, volume: true, score: true });

    const ema9  = useMemo(() => calcEMA(data, 9),  [data]);
    const ema21 = useMemo(() => calcEMA(data, 21), [data]);
    const ema50 = useMemo(() => calcEMA(data, 50), [data]);

    const algoScores = backtestResults?.algoScores || [];
    const signals    = backtestResults?.signals    || [];

    const toggle = (key) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

    const isDark = theme === 'dark';

    const chartBaseOptions = useMemo(() => ({
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: isDark ? '#cbd5e1' : '#475569',
        },
        grid: {
            vertLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            horzLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
        timeScale: {
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            timeVisible: true,
            secondsVisible: false,
        },
        autoSize: true,
    }), [isDark]);

    // ── Main Chart ──────────────────────────────────────────────────
    useEffect(() => {
        if (!mainContainerRef.current || !data?.length) return;

        const chart = createChart(mainContainerRef.current, {
            ...chartBaseOptions,
            width: mainContainerRef.current.clientWidth,
            height: mainContainerRef.current.clientHeight || 420,
        });
        mainChartRef.current = chart;

        // Candlestick
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#10b981', downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981', wickDownColor: '#ef4444',
        });
        candleSeries.setData(data);

        // EMA lines
        const ema9Series  = chart.addLineSeries({ color: '#22d3ee', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const ema21Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const ema50Series = chart.addLineSeries({ color: '#a78bfa', lineWidth: 2,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

        if (ema9.length)  ema9Series.setData(ema9);
        if (ema21.length) ema21Series.setData(ema21);
        if (ema50.length) ema50Series.setData(ema50);

        ema9Series.applyOptions({ visible: visible.ema9 });
        ema21Series.applyOptions({ visible: visible.ema21 });
        ema50Series.applyOptions({ visible: visible.ema50 });

        // Volume overlay (bottom 22% of same chart via scaleMargins)
        const volumeSeries = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'vol',
        });
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
        })));
        volumeSeries.applyOptions({ visible: visible.volume });

        // Comparison overlay
        if (comparisonData?.length && data.length) {
            const baseMain = data[0].close;
            const baseComp = comparisonData[0].close;
            const normMain = data.map(d => ({ time: d.time, value: parseFloat(((d.close / baseMain - 1) * 100).toFixed(2)) }));
            const normComp = comparisonData.map(d => ({ time: d.time, value: parseFloat(((d.close / baseComp - 1) * 100).toFixed(2)) }));

            const compMainSeries = chart.addLineSeries({ color: '#60a5fa', lineWidth: 2, priceScaleId: 'cmp', priceLineVisible: false, lastValueVisible: true, title: 'Ana' });
            const compSecSeries  = chart.addLineSeries({ color: '#f472b6', lineWidth: 2, priceScaleId: 'cmp', priceLineVisible: false, lastValueVisible: true, title: comparisonSymbol || 'Karş.' });
            chart.priceScale('cmp').applyOptions({ scaleMargins: { top: 0, bottom: 0.6 } });
            compMainSeries.setData(normMain);
            compSecSeries.setData(normComp);
        }

        // Buy/Sell markers
        if (signals.length) {
            const markers = signals.map(s => ({
                time: s.time,
                position: (s.type === 'Buy') ? 'belowBar' : 'aboveBar',
                color: (s.type === 'Buy') ? '#10b981' : (s.type === 'Short') ? '#f97316' : '#ef4444',
                shape: (s.type === 'Buy') ? 'arrowUp' : 'arrowDown',
                text: (s.type === 'Buy') ? 'AL' : (s.type === 'Short') ? 'SHORT' : 'SAT',
            }));
            candleSeries.setMarkers(markers);
        }

        // Crosshair legend
        chart.subscribeCrosshairMove(param => {
            if (param.time) {
                const price = param.seriesData.get(candleSeries);
                if (price) setLegendData({ time: param.time, ...price });
            } else {
                setLegendData(data[data.length - 1]);
            }
        });

        chart.timeScale().fitContent();

        // Sync score chart time range
        chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (range && scoreChartRef.current) {
                scoreChartRef.current.timeScale().setVisibleLogicalRange(range);
            }
        });

        const handleResize = () => {
            if (mainChartRef.current && mainContainerRef.current) {
                mainChartRef.current.applyOptions({ width: mainContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            mainChartRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, backtestResults, comparisonData, comparisonSymbol, theme]);

    // Apply EMA / Volume visibility without full re-render
    useEffect(() => {
        if (!mainChartRef.current) return;
        // We can't easily access series refs from outside the effect, so we rebuild when visibility changes.
        // The rebuild is lightweight due to the stable data references.
    }, [visible]);

    // ── Score Chart ─────────────────────────────────────────────────
    useEffect(() => {
        if (!scoreContainerRef.current || !algoScores.length || !visible.score) return;

        const chart = createChart(scoreContainerRef.current, {
            ...chartBaseOptions,
            width: scoreContainerRef.current.clientWidth,
            height: scoreContainerRef.current.clientHeight || 130,
            rightPriceScale: { scaleMargins: { top: 0.05, bottom: 0.05 }, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            timeScale: {
                visible: false,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
        });
        scoreChartRef.current = chart;

        const scoreSeries = chart.addHistogramSeries({
            priceFormat: { type: 'price', precision: 0, minMove: 1 },
            priceScaleId: 'right',
        });

        scoreSeries.setData(algoScores.map(s => ({
            time: s.time,
            value: s.score,
            color: s.score >= 0 ? 'rgba(16,185,129,0.65)' : 'rgba(239,68,68,0.65)',
        })));

        // Threshold lines
        scoreSeries.createPriceLine({ price: 25,  color: 'rgba(16,185,129,0.7)',  lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'AL' });
        scoreSeries.createPriceLine({ price: -25, color: 'rgba(239,68,68,0.7)',   lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'SAT' });
        scoreSeries.createPriceLine({ price: 0,   color: 'rgba(148,163,184,0.4)', lineWidth: 1, lineStyle: LineStyle.Solid,  axisLabelVisible: false });

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (scoreChartRef.current && scoreContainerRef.current) {
                scoreChartRef.current.applyOptions({ width: scoreContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            scoreChartRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [algoScores, visible.score, theme]);

    const formatN = (n) => n?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatV = (n) => n > 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n?.toLocaleString('tr-TR');
    const activeLegend = legendData || data?.[data.length - 1];

    return (
        <div className="stock-chart-wrapper">
            {/* Indicator Toggles */}
            <div className="indicator-toggles">
                {INDICATOR_BTNS.map(btn => (
                    <button
                        key={btn.key}
                        className={`ind-toggle ${visible[btn.key] ? 'active' : ''}`}
                        style={{ '--ind-color': btn.color }}
                        onClick={() => toggle(btn.key)}
                    >
                        <span className="ind-dot" />
                        {btn.label}
                    </button>
                ))}
                {comparisonSymbol && (
                    <span className="comparison-badge">
                        📊 {comparisonSymbol} ile karşılaştırılıyor
                    </span>
                )}
            </div>

            {/* Legend */}
            {activeLegend && (
                <div className="chart-legend glass-panel">
                    <div className="legend-row">
                        <span className="l-label">A:</span><span className="l-val">{formatN(activeLegend.open)}</span>
                        <span className="l-label">Y:</span><span className="l-val">{formatN(activeLegend.high)}</span>
                        <span className="l-label">D:</span><span className="l-val">{formatN(activeLegend.low)}</span>
                        <span className="l-label">K:</span>
                        <span className="l-val" style={{ color: activeLegend.close >= activeLegend.open ? '#10b981' : '#ef4444' }}>
                            {formatN(activeLegend.close)}
                        </span>
                        <span className="l-label">H:</span><span className="l-val">{formatV(activeLegend.volume)}</span>
                    </div>
                </div>
            )}

            {/* Main Chart */}
            <div ref={mainContainerRef} className="main-chart-area" />

            {/* AlgoScore Panel */}
            {visible.score && algoScores.length > 0 && (
                <div className="score-chart-panel">
                    <div className="score-chart-label">Algo Score</div>
                    <div ref={scoreContainerRef} className="score-chart-area" />
                </div>
            )}
        </div>
    );
};

export default StockChart;
