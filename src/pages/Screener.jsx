import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowUpDown, Search, Star, SlidersHorizontal, ChevronDown, ChevronUp, LineChart, Bell, BellRing, X, Plus } from 'lucide-react';
import { fetchStockData } from '../services/api';
import { BIST_STOCKS, getStockMeta } from '../constants/stocks';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { runAdvancedBacktest } from '../utils/advancedBacktest';
import StockLogo from '../components/ui/StockLogo';
import { useWatchlist } from '../context/WatchlistContext';
import './Screener.css';

const TIMEFRAME_OPTIONS = [
    { label: '15 Dakika', value: '15m' },
    { label: '1 Saat', value: '1h' },
    { label: '4 Saat', value: '4h' },
    { label: '1 Gun', value: '1d' },
];

const DEFAULT_BACKTEST_SETTINGS = {
    buyThreshold: 25,
    sellThreshold: -25,
    takeProfit: 1,
    stopLoss: 3,
    exitOnSignal: true,
};

const BACKTEST_SETTINGS_KEY = 'bist_screener_backtest_v1';

const loadBacktestSettings = () => {
    try {
        const s = JSON.parse(localStorage.getItem(BACKTEST_SETTINGS_KEY) || '{}');
        return { ...DEFAULT_BACKTEST_SETTINGS, ...s };
    } catch {
        return DEFAULT_BACKTEST_SETTINGS;
    }
};

const FILTER_PRESET_KEY = 'bist_screener_filters_v1';
const SCREENER_ALARM_KEY = 'bist_screener_alarms_v1';

const loadScreenerAlarms = () => {
    try { return JSON.parse(localStorage.getItem(SCREENER_ALARM_KEY) || '[]'); } catch { return []; }
};
const saveScreenerAlarms = (list) => localStorage.setItem(SCREENER_ALARM_KEY, JSON.stringify(list));

const getSavedFilterPreset = () => {
    const defaults = {
        sector: 'Hepsi',
        timeframe: '1d',
        minTrades: 1,
        minWinRate: 30,
        watchlistOnly: false,
    };

    const saved = localStorage.getItem(FILTER_PRESET_KEY);
    if (!saved) return defaults;

    try {
        const parsed = JSON.parse(saved);
        return {
            sector: typeof parsed.sector === 'string' ? parsed.sector : defaults.sector,
            timeframe: typeof parsed.timeframe === 'string' ? parsed.timeframe : defaults.timeframe,
            minTrades: typeof parsed.minTrades === 'number' ? parsed.minTrades : defaults.minTrades,
            minWinRate: typeof parsed.minWinRate === 'number' ? parsed.minWinRate : defaults.minWinRate,
            watchlistOnly: typeof parsed.watchlistOnly === 'boolean' ? parsed.watchlistOnly : defaults.watchlistOnly,
        };
    } catch {
        return defaults;
    }
};

const getRangeByTimeframe = (timeframe) => {
    if (timeframe === '5m' || timeframe === '15m') return '60d';
    if (timeframe === '1h' || timeframe === '4h') return '1y';
    return '2y'; // screener için 2y yeterli; 5y ~60% daha fazla veri demek
};

const Screener = () => {
    const savedPreset = useMemo(() => getSavedFilterPreset(), []);
    const savedBT     = useMemo(() => loadBacktestSettings(), []);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sector, setSector] = useState(savedPreset.sector);
    const [sortKey, setSortKey] = useState('systemScore');
    const [sortDirection, setSortDirection] = useState('desc');
    const [timeframe, setTimeframe] = useState(savedPreset.timeframe);
    const [minTrades, setMinTrades] = useState(savedPreset.minTrades);
    const [minWinRate, setMinWinRate] = useState(savedPreset.minWinRate);
    const [watchlistOnly, setWatchlistOnly] = useState(savedPreset.watchlistOnly);

    // Backtest parametreleri
    const [btTP,          setBtTP]         = useState(savedBT.takeProfit);
    const [btSL,          setBtSL]         = useState(savedBT.stopLoss);
    const [btBuy,         setBtBuy]        = useState(savedBT.buyThreshold);
    const [btSell,        setBtSell]       = useState(savedBT.sellThreshold);
    const [positionMode,  setPositionMode] = useState('long'); // 'long' | 'both'
    const [showBtSettings, setShowBtSettings] = useState(false);

    const { toggleSymbol, isInWatchlist } = useWatchlist();
    const navigate = useNavigate();

    // Screener alarms
    const [screenerAlarms, setScreenerAlarms] = useState(loadScreenerAlarms);
    const [showAlarmPanel, setShowAlarmPanel] = useState(false);
    const [alarmName, setAlarmName] = useState('');

    const [progress,   setProgress]   = useState({ loaded: 0, total: 0 });
    const [btProgress, setBtProgress] = useState({ done: 0, total: 0 });
    // rawDataMap: stores fetched {data,meta} per symbol — only refreshed on timeframe change
    const [rawDataMap, setRawDataMap] = useState(new Map());
    const fetchIdRef = useRef(0);
    const btIdRef    = useRef(0);

    // ── Alarm checker: runs every 5 min when alarms are set ──
    useEffect(() => {
        if (!screenerAlarms.length || !rows.length) return;
        const check = () => {
            screenerAlarms.forEach(alarm => {
                const matched = rows.filter(row => {
                    const cleanSymbol = row.symbol.replace('.IS', '');
                    const meta = getStockMeta(cleanSymbol);
                    const passSector = alarm.sector === 'Hepsi' ? true : meta?.sector === alarm.sector;
                    const passMinTrades = row.totalTrades >= alarm.minTrades;
                    const passMinWinRate = row.winRate >= alarm.minWinRate;
                    return passSector && passMinTrades && passMinWinRate;
                });
                if (matched.length > 0 && Notification.permission === 'granted') {
                    new Notification(`📊 ${alarm.name}`, {
                        body: `${matched.length} hisse filtreye uyuyor: ${matched.slice(0, 3).map(r => r.symbol.replace('.IS', '')).join(', ')}${matched.length > 3 ? '…' : ''}`,
                        icon: '/logo.svg',
                    });
                }
            });
        };
        const id = setInterval(check, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [screenerAlarms, rows]);

    // ── Effect 1: Fetch raw stock data (only on timeframe change) ──
    useEffect(() => {
        const CONCURRENCY = 6;
        const fetchId = ++fetchIdRef.current;

        const doFetch = async () => {
            setLoading(true);
            setError(null);
            setRows([]);
            setRawDataMap(new Map());

            const symbols = BIST_STOCKS.map((s) => s.symbol);
            const range = getRangeByTimeframe(timeframe);
            setProgress({ loaded: 0, total: symbols.length });

            const newMap = new Map();
            let loaded = 0;

            for (let i = 0; i < symbols.length; i += CONCURRENCY) {
                if (fetchIdRef.current !== fetchId) return;

                const batch = symbols.slice(i, i + CONCURRENCY);
                const results = await Promise.all(
                    batch.map(async (sym) => {
                        try {
                            const res = await fetchStockData(sym, range, timeframe);
                            if (res?.success && res?.data?.length) return { sym, res };
                        } catch { /* skip */ }
                        return null;
                    })
                );

                if (fetchIdRef.current !== fetchId) return;

                for (const item of results) {
                    if (item) newMap.set(item.sym, { data: item.res.data, meta: item.res.meta });
                }
                loaded += batch.length;
                setProgress({ loaded: Math.min(loaded, symbols.length), total: symbols.length });

                if (i === 0) {
                    // Show first batch immediately; backtest runs in Effect 2
                    setRawDataMap(new Map(newMap));
                    setLoading(false);
                }
            }

            if (fetchIdRef.current !== fetchId) return;
            setRawDataMap(new Map(newMap));
            setLoading(false);
        };

        doFetch().catch((err) => {
            console.error(err);
            setError('Veri yüklenemedi.');
            setLoading(false);
        });
    }, [timeframe]);

    // ── Effect 2: Re-run backtests whenever raw data OR params change ──
    useEffect(() => {
        if (!rawDataMap.size) return;
        const btId = ++btIdRef.current;
        setAnalyzing(true);

        const items = [...rawDataMap.entries()];
        const total = items.length;
        setBtProgress({ done: 0, total });

        const CHUNK = 8;
        const accumulated = [];

        const runChunk = async (startIdx) => {
            if (btIdRef.current !== btId) return;

            const end = Math.min(startIdx + CHUNK, total);
            for (let j = startIdx; j < end; j++) {
                const [, { data, meta }] = items[j];
                const strat = runAdvancedBacktest(data, btBuy, btSell, btTP, btSL, true, positionMode);
                const currentPrice = meta.currentPrice;
                const previousClose = meta.previousClose || currentPrice;
                accumulated.push({
                    symbol: meta.symbol,
                    price: currentPrice,
                    previousClose,
                    changePercent: previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
                    strategyReturn: strat?.metrics?.totalReturnPct ?? 0,
                    buyAndHoldReturn: strat?.metrics?.buyAndHoldReturn ?? 0,
                    totalTrades: strat?.metrics?.totalTrades ?? 0,
                    winRate: strat?.metrics?.winRate ?? 0,
                    maxDrawdownPct: strat?.metrics?.maxDrawdownPct ?? 0,
                    systemScore: 0,
                    isMock: meta.isMock,
                    source: meta.source,
                });
            }

            if (btIdRef.current !== btId) return;
            setRows([...accumulated]);
            setBtProgress({ done: end, total });

            if (end < total) {
                await new Promise(r => setTimeout(r, 0));
                await runChunk(end);
            } else {
                setAnalyzing(false);
            }
        };

        runChunk(0);
    }, [rawDataMap, btBuy, btSell, btTP, btSL, positionMode]);

    const sectors = useMemo(() => {
        const unique = new Set(BIST_STOCKS.map((stock) => stock.sector));
        return ['Hepsi', ...Array.from(unique)];
    }, []);

    const sortedRows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const withSystemScore = rows.map((row) => {
            const tradeScore = Math.min(row.totalTrades, 25) / 25 * 20;
            const rawScore =
                (row.strategyReturn * 0.55) +
                (row.winRate * 0.3) +
                tradeScore -
                (row.maxDrawdownPct * 0.35);

            return {
                ...row,
                systemScore: Number(rawScore.toFixed(2)),
            };
        });

        const filtered = withSystemScore.filter((row) => {
            const cleanSymbol = row.symbol.replace('.IS', '');
            const meta = getStockMeta(cleanSymbol);
            const text = `${cleanSymbol} ${meta?.name || ''}`.toLowerCase();
            const passText = normalizedSearch ? text.includes(normalizedSearch) : true;
            const passSector = sector === 'Hepsi' ? true : meta?.sector === sector;
            const passTradeCount = row.totalTrades >= minTrades;
            const passWinRate = row.winRate >= minWinRate;
            const passWatchlist = watchlistOnly ? isInWatchlist(cleanSymbol) : true;
            return passText && passSector && passTradeCount && passWinRate && passWatchlist;
        });

        return filtered.sort((a, b) => {
            const aVal = sortKey === 'symbol' ? a.symbol : Number(a[sortKey] ?? 0);
            const bVal = sortKey === 'symbol' ? b.symbol : Number(b[sortKey] ?? 0);

            if (sortKey === 'symbol') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [rows, search, sector, minTrades, minWinRate, watchlistOnly, sortKey, sortDirection, isInWatchlist]);

    const leaders = useMemo(() => {
        if (!rows.length) {
            return { topGainer: null, topLoser: null, topSystem: [] };
        }

        const byPerformance = [...rows].sort((a, b) => b.changePercent - a.changePercent);
        const bySystem = [...sortedRows].sort((a, b) => b.systemScore - a.systemScore);

        return {
            topGainer: byPerformance[0],
            topLoser: byPerformance[byPerformance.length - 1],
            topSystem: bySystem.slice(0, 3),
        };
    }, [rows, sortedRows]);

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortKey(key);
        setSortDirection('desc');
    };

    const saveFilterPreset = () => {
        localStorage.setItem(FILTER_PRESET_KEY, JSON.stringify({ sector, timeframe, minTrades, minWinRate, watchlistOnly }));
        localStorage.setItem(BACKTEST_SETTINGS_KEY, JSON.stringify({ buyThreshold: btBuy, sellThreshold: btSell, takeProfit: btTP, stopLoss: btSL }));
    };

    const resetFilters = () => {
        setSearch('');
        setSector('Hepsi');
        setTimeframe('1d');
        setMinTrades(1);
        setMinWinRate(30);
        setWatchlistOnly(false);
        setSortKey('systemScore');
        setSortDirection('desc');
    };

    const resetBtSettings = () => {
        setBtTP(DEFAULT_BACKTEST_SETTINGS.takeProfit);
        setBtSL(DEFAULT_BACKTEST_SETTINGS.stopLoss);
        setBtBuy(DEFAULT_BACKTEST_SETTINGS.buyThreshold);
        setBtSell(DEFAULT_BACKTEST_SETTINGS.sellThreshold);
    };

    const addScreenerAlarm = async () => {
        const name = alarmName.trim() || `Alarm ${screenerAlarms.length + 1}`;
        if (Notification.permission === 'default') await Notification.requestPermission();
        const alarm = { id: Date.now(), name, sector, minTrades, minWinRate };
        const updated = [...screenerAlarms, alarm];
        setScreenerAlarms(updated);
        saveScreenerAlarms(updated);
        setAlarmName('');
    };

    const removeScreenerAlarm = (id) => {
        const updated = screenerAlarms.filter(a => a.id !== id);
        setScreenerAlarms(updated);
        saveScreenerAlarms(updated);
    };

    if (loading && rows.length === 0) {
        return (
            <div className="screener-page center-content">
                <Loader2 className="spinner" size={36} />
                <p>İlk hisseler yükleniyor…</p>
                {progress.total > 0 && (
                    <div className="screener-progress-wrap">
                        <div
                            className="screener-progress-bar"
                            style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                        />
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="screener-page center-content">
                <div className="glass-panel screener-error">
                    <p className="negative-text">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="screener-page animate-fade-in">
            <div className="screener-header">
                <div>
                    <h1>BIST Screener</h1>
                    <p className="text-muted">Tum hisseleri sektor, timeframe ve strateji getirisina gore filtrele.</p>
                </div>
                <span className="result-count glass-panel">{sortedRows.length} sonuc</span>
            </div>

            <div className="screener-leaders">
                <div className="glass-panel leader-card">
                    <span className="text-muted">Gunluk Lider</span>
                    <strong className="positive-text">{leaders.topGainer?.symbol?.replace('.IS', '') || '-'}</strong>
                    <span>{leaders.topGainer ? formatPercent(leaders.topGainer.changePercent) : '-'}</span>
                </div>
                <div className="glass-panel leader-card">
                    <span className="text-muted">Gunluk En Zayif</span>
                    <strong className="negative-text">{leaders.topLoser?.symbol?.replace('.IS', '') || '-'}</strong>
                    <span>{leaders.topLoser ? formatPercent(leaders.topLoser.changePercent) : '-'}</span>
                </div>
                <div className="glass-panel leader-card system-leader-card">
                    <span className="text-muted">Sisteme Gore En Kazancli (Top 3)</span>
                    <div className="system-leader-list">
                        {leaders.topSystem.length > 0 ? leaders.topSystem.map((item) => (
                            <div className="system-leader-row" key={item.symbol}>
                                <strong>{item.symbol.replace('.IS', '')}</strong>
                                <span className={item.systemScore >= 0 ? 'positive-text' : 'negative-text'}>
                                    {item.systemScore.toFixed(1)} puan
                                </span>
                            </div>
                        )) : <span>-</span>}
                    </div>
                </div>
            </div>

            {showBtSettings && (
                <div className="glass-panel screener-bt-panel animate-slide-down">
                    <div className="bt-panel-header">
                        <strong><SlidersHorizontal size={14} /> Backtest Parametreleri</strong>
                        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Değiştirildiğinde tüm hisseler yeniden hesaplanır</span>
                        <button className="reset-btn" onClick={resetBtSettings} style={{ marginLeft: 'auto' }}>Varsayılana Dön</button>
                    </div>
                    <div className="bt-panel-inputs">
                        <label className="bt-label">TP %
                            <input type="number" value={btTP}   onChange={e => setBtTP(Number(e.target.value))}   min="0" max="100" className="bt-input" />
                        </label>
                        <label className="bt-label">SL %
                            <input type="number" value={btSL}   onChange={e => setBtSL(Number(e.target.value))}   min="0" max="100" className="bt-input" />
                        </label>
                        <label className="bt-label">AL Eşiği
                            <input type="number" value={btBuy}  onChange={e => setBtBuy(Number(e.target.value))}  min="0" max="100" className="bt-input" />
                        </label>
                        <label className="bt-label">SAT Eşiği
                            <input type="number" value={btSell} onChange={e => setBtSell(Number(e.target.value))} min="-100" max="0" className="bt-input" />
                        </label>
                        <div className="bt-pos-group">
                            <span className="bt-label">Pozisyon Yönü</span>
                            <div className="bt-pos-toggles">
                                <button
                                    className={`bt-pos-btn ${positionMode === 'long' ? 'active-long' : ''}`}
                                    onClick={() => setPositionMode('long')}
                                >
                                    🟢 Sadece Long
                                </button>
                                <button
                                    className={`bt-pos-btn ${positionMode === 'both' ? 'active-both' : ''}`}
                                    onClick={() => setPositionMode('both')}
                                >
                                    ⚡ Long + Short
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel screener-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Sembol veya sirket adi ara"
                    />
                </div>
                <select value={sector} onChange={(e) => setSector(e.target.value)}>
                    {sectors.map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    {TIMEFRAME_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
                <input
                    type="number"
                    min="0"
                    value={minTrades}
                    onChange={(e) => setMinTrades(Number(e.target.value))}
                    className="toolbar-number"
                    placeholder="Min Islem"
                    title="Minimum islem sayisi"
                />
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={minWinRate}
                    onChange={(e) => setMinWinRate(Number(e.target.value))}
                    className="toolbar-number"
                    placeholder="Min Win Rate"
                    title="Minimum kazanma orani"
                />
                <label className="watchlist-only">
                    <input
                        type="checkbox"
                        checked={watchlistOnly}
                        onChange={(e) => setWatchlistOnly(e.target.checked)}
                    />
                    Sadece Favoriler
                </label>
                <button className="bt-settings-toggle" onClick={() => setShowBtSettings(p => !p)}>
                    <SlidersHorizontal size={14} /> Backtest Ayarları {showBtSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button className="preset-btn" onClick={saveFilterPreset}>Kaydet</button>
                <button className="reset-btn" onClick={resetFilters}>Sıfırla</button>
                <button
                    className={`alarm-bell-btn ${screenerAlarms.length > 0 ? 'has-alarms' : ''}`}
                    onClick={() => setShowAlarmPanel(p => !p)}
                    title="Filtre Alarmları"
                >
                    {screenerAlarms.length > 0 ? <BellRing size={15} /> : <Bell size={15} />}
                    {screenerAlarms.length > 0 && <span className="alarm-count-badge">{screenerAlarms.length}</span>}
                </button>
                {loading && progress.total > 0 && (
                    <div className="analyzing-chip">
                        <Loader2 size={14} className="spin-icon" />
                        {progress.loaded}/{progress.total} çekiliyor
                    </div>
                )}
            </div>

            {showAlarmPanel && (
                <div className="glass-panel screener-alarm-panel animate-slide-down">
                    <div className="alarm-panel-hd">
                        <strong><Bell size={14} /> Filtre Alarmları</strong>
                        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Her 5 dakikada bir kontrol edilir</span>
                        <button onClick={() => setShowAlarmPanel(false)} style={{ marginLeft: 'auto' }}><X size={14} /></button>
                    </div>
                    <div className="alarm-add-row-sc">
                        <input
                            className="alarm-name-input"
                            placeholder="Alarm adı (opsiyonel)"
                            value={alarmName}
                            onChange={e => setAlarmName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addScreenerAlarm()}
                        />
                        <button className="preset-btn" onClick={addScreenerAlarm}>
                            <Plus size={14} /> Mevcut Filtreyi Kaydet
                        </button>
                    </div>
                    <div className="alarm-list-sc">
                        {screenerAlarms.length === 0 && (
                            <p className="text-muted" style={{ fontSize: '0.82rem' }}>Henüz alarm yok. Filtre ayarla ve kaydet.</p>
                        )}
                        {screenerAlarms.map(alarm => (
                            <div key={alarm.id} className="alarm-sc-item">
                                <Bell size={13} />
                                <span className="alarm-sc-name">{alarm.name}</span>
                                <span className="text-muted alarm-sc-detail">
                                    {alarm.sector !== 'Hepsi' ? alarm.sector : 'Tüm Sektörler'} · min {alarm.minTrades} işlem · win≥{alarm.minWinRate}%
                                </span>
                                <button className="alarm-sc-remove" onClick={() => removeScreenerAlarm(alarm.id)}><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {analyzing && rows.length > 0 && (
                <div className="screener-loading-banner">
                    <div className="slb-top">
                        <Loader2 size={14} className="spin-icon" />
                        <span>
                            <strong>{btProgress.done}</strong> / {btProgress.total} hisse analiz edildi — arka planda yüklenmeye devam ediyor
                        </span>
                    </div>
                    <div className="slb-bar-track">
                        <div
                            className="slb-bar-fill"
                            style={{ width: btProgress.total ? `${(btProgress.done / btProgress.total) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            )}

            <div className="glass-panel screener-table-wrap">
                <table className="screener-table">
                    <thead>
                        <tr>
                            <th>Sirket</th>
                            <th>
                                <button className="sort-btn" onClick={() => toggleSort('price')}>
                                    Fiyat <ArrowUpDown size={14} />
                                </button>
                            </th>
                            <th>
                                <button className="sort-btn" onClick={() => toggleSort('changePercent')}>
                                    Degisim <ArrowUpDown size={14} />
                                </button>
                            </th>
                            <th>
                                <button className="sort-btn" onClick={() => toggleSort('strategyReturn')}>
                                    Sistem Getiri <ArrowUpDown size={14} />
                                </button>
                            </th>
                            <th>
                                <button className="sort-btn" onClick={() => toggleSort('systemScore')}>
                                    Sistem Skoru <ArrowUpDown size={14} />
                                </button>
                            </th>
                            <th>
                                <button className="sort-btn" onClick={() => toggleSort('winRate')}>
                                    Win Rate <ArrowUpDown size={14} />
                                </button>
                            </th>
                            <th>Sektör</th>
                            <th>İşlem</th>
                            <th>Fav</th>
                            <th>Grafik</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row) => {
                            const cleanSymbol = row.symbol.replace('.IS', '');
                            const meta = getStockMeta(cleanSymbol);
                            const isPositive = row.changePercent >= 0;

                            return (
                                <tr key={row.symbol}>
                                    <td>
                                        <div className="company-cell">
                                            <StockLogo
                                                symbol={cleanSymbol}
                                                name={meta?.name}
                                                className="company-logo"
                                            />
                                            <div>
                                                <strong>{cleanSymbol}</strong>
                                                <p className="text-muted">{meta?.name || 'Borsa Istanbul'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{formatCurrency(row.price)}</td>
                                    <td className={isPositive ? 'positive-text' : 'negative-text'}>{formatPercent(row.changePercent)}</td>
                                    <td className={row.strategyReturn >= 0 ? 'positive-text' : 'negative-text'}>{formatPercent(row.strategyReturn)}</td>
                                    <td>{row.systemScore.toFixed(1)}</td>
                                    <td>{formatPercent(row.winRate).replace('+', '')}</td>
                                    <td>{meta?.sector || 'N/A'}</td>
                                    <td>{row.totalTrades}</td>
                                    <td>
                                        <button
                                            className={`watch-btn ${isInWatchlist(cleanSymbol) ? 'active' : ''}`}
                                            onClick={() => toggleSymbol(cleanSymbol)}
                                            title="Favorilere ekle / kaldir"
                                        >
                                            <Star size={14} fill={isInWatchlist(cleanSymbol) ? 'currentColor' : 'none'} />
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="chart-btn"
                                            onClick={() => navigate(`/stock/${cleanSymbol}`)}
                                            title={`${cleanSymbol} grafiğini aç`}
                                        >
                                            <LineChart size={15} />
                                            <span className="chart-btn-text">Grafik</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan="10" className="screener-empty">
                                    Filtrelere uygun sonuc bulunamadi. Filtreleri gevsetip tekrar deneyin.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Screener;
