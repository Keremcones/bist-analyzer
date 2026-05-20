import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMultipleStocks, fetchStockData } from '../services/api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
    TrendingUp, TrendingDown, ArrowRight, Loader2, RefreshCcw, BarChart3,
    Star, SlidersHorizontal, Bell, BellRing, X, Plus, Activity, DollarSign
} from 'lucide-react';
import './Dashboard.css';
import { BIST_STOCKS, getStockMeta } from '../constants/stocks';
import StockLogo from '../components/ui/StockLogo';
import { useWatchlist } from '../context/WatchlistContext';

const POPULAR_STOCKS = ['THYAO', 'AKBNK', 'EREGL', 'ASELS', 'KCHOL', 'TUPRS', 'GARAN', 'SISE', 'BIMAS', 'SAHOL', 'YKBNK', 'FROTO'];

const MACRO_SYMBOLS = [
    { symbol: 'USDTRY=X', label: 'USD/TRY', prefix: '₺' },
    { symbol: 'EURTRY=X', label: 'EUR/TRY', prefix: '₺' },
    { symbol: 'GC=F',     label: 'Altın',   prefix: '$' },
    { symbol: 'XU100.IS', label: 'BIST 100', prefix: '' },
];

const ALARM_KEY = 'bist_price_alarms_v1';

const loadAlarms = () => {
    try { return JSON.parse(localStorage.getItem(ALARM_KEY) || '[]'); } catch { return []; }
};
const saveAlarms = (alarms) => localStorage.setItem(ALARM_KEY, JSON.stringify(alarms));

const getMarketStatus = () => {
    const now = new Date();
    const trOffset = 3 * 60;
    const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const trMin = (utcMin + trOffset) % (24 * 60);
    const day = (now.getUTCDay() + (utcMin + trOffset >= 24 * 60 ? 1 : 0)) % 7;
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && trMin >= 600 && trMin < 1080; // 10:00 – 18:00
    const trHH = String(Math.floor(trMin / 60)).padStart(2, '0');
    const trMM = String(trMin % 60).padStart(2, '0');
    return { isOpen, timeStr: `${trHH}:${trMM}` };
};

const Dashboard = () => {
    const [macroData, setMacroData] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sectorFilter, setSectorFilter] = useState('Hepsi');
    const [watchlistOnly, setWatchlistOnly] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [marketStatus, setMarketStatus] = useState(getMarketStatus());
    const { watchlist, toggleSymbol, isInWatchlist } = useWatchlist();
    const navigate = useNavigate();

    // Alarm state
    const [alarms, setAlarms] = useState(loadAlarms);
    const [showAlarmPanel, setShowAlarmPanel] = useState(false);
    const [newAlarmSymbol, setNewAlarmSymbol] = useState('');
    const [newAlarmPrice, setNewAlarmPrice] = useState('');
    const [newAlarmDir, setNewAlarmDir] = useState('above');
    const [triggeredAlarms, setTriggeredAlarms] = useState([]);
    const [notifPermission, setNotifPermission] = useState(Notification.permission);
    const alarmsRef = useRef(alarms);
    useEffect(() => { alarmsRef.current = alarms; }, [alarms]);

    // Clock tick
    useEffect(() => {
        const t = setInterval(() => setMarketStatus(getMarketStatus()), 30000);
        return () => clearInterval(t);
    }, []);

    const loadDashboardData = useCallback(async (refreshMode = false) => {
        try {
            setError(null);
            refreshMode ? setIsRefreshing(true) : setLoading(true);
            const data = await fetchMultipleStocks(POPULAR_STOCKS);
            setStocks(data);
            setLastUpdatedAt(new Date());
        } catch (err) {
            setError('Veriler yüklenirken bir hata oluştu');
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

    useEffect(() => {
        const fetchMacro = async () => {
            const results = await Promise.allSettled(
                MACRO_SYMBOLS.map(m => fetchStockData(m.symbol, '5d', '1d'))
            );
            const enriched = MACRO_SYMBOLS.map((m, i) => {
                const res = results[i];
                if (res.status !== 'fulfilled' || !res.value?.meta) return { ...m, price: null, change: null };
                const { currentPrice, previousClose } = res.value.meta;
                const change = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : null;
                return { ...m, price: currentPrice, change };
            });
            setMacroData(enriched);
        };
        fetchMacro();
    }, []);

    const checkAlarms = useCallback((currentStocks, currentAlarms) => {
        if (!currentStocks.length || !currentAlarms.length) return;
        const fired = [];
        currentAlarms.forEach(alarm => {
            const stock = currentStocks.find(s =>
                s.symbol === alarm.symbol || s.symbol === `${alarm.symbol}.IS`
            );
            if (!stock) return;
            const hit = alarm.direction === 'above'
                ? stock.price >= alarm.targetPrice
                : stock.price <= alarm.targetPrice;
            if (hit) {
                fired.push({ ...alarm, currentPrice: stock.price });
                if (Notification.permission === 'granted') {
                    new Notification(`🔔 ${alarm.symbol} Fiyat Alarmı`, {
                        body: `${alarm.symbol} ${alarm.direction === 'above' ? '↑' : '↓'} ${alarm.targetPrice.toLocaleString('tr-TR')} ₺ hedefine ulaştı! Anlık: ${stock.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
                        icon: '/logo.svg',
                    });
                }
            }
        });
        if (fired.length) setTriggeredAlarms(fired);
    }, []);

    // Check alarms when stocks load
    useEffect(() => {
        checkAlarms(stocks, alarms);
    }, [stocks, alarms, checkAlarms]);

    // Periyodik alarm kontrolü — her 2 dakikada bir fiyat çek
    useEffect(() => {
        if (!alarms.length) return;
        const id = setInterval(async () => {
            if (!alarmsRef.current.length) return;
            try {
                const symbols = [...new Set(alarmsRef.current.map(a => a.symbol))];
                const fresh = await fetchMultipleStocks(symbols);
                checkAlarms(fresh, alarmsRef.current);
            } catch { /* sessiz hata */ }
        }, 2 * 60 * 1000);
        return () => clearInterval(id);
    }, [alarms.length, checkAlarms]);

    const addAlarm = async () => {
        const sym = newAlarmSymbol.trim().toUpperCase();
        const price = parseFloat(newAlarmPrice);
        if (!sym || isNaN(price) || price <= 0) return;

        // Bildirim izni iste
        if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            setNotifPermission(perm);
        }

        const updated = [...alarms, { id: Date.now(), symbol: sym, targetPrice: price, direction: newAlarmDir }];
        setAlarms(updated);
        saveAlarms(updated);
        setNewAlarmSymbol('');
        setNewAlarmPrice('');
    };

    const removeAlarm = (id) => {
        const updated = alarms.filter(a => a.id !== id);
        setAlarms(updated);
        saveAlarms(updated);
    };

    const dismissTriggered = (id) => setTriggeredAlarms(prev => prev.filter(a => a.id !== id));

    const handleStockClick = (symbol) => navigate(`/stock/${symbol.replace('.IS', '')}`);

    const sectors = useMemo(() => {
        const sectorSet = new Set(POPULAR_STOCKS.map(s => getStockMeta(s)?.sector).filter(Boolean));
        return ['Hepsi', ...Array.from(sectorSet)];
    }, []);

    const filteredStocks = useMemo(() => {
        let items = stocks;
        if (sectorFilter !== 'Hepsi') items = items.filter(s => getStockMeta(s.symbol)?.sector === sectorFilter);
        if (watchlistOnly) items = items.filter(s => isInWatchlist(s.symbol));
        return items;
    }, [stocks, sectorFilter, watchlistOnly, isInWatchlist]);

    const marketSummary = useMemo(() => {
        if (!stocks.length) return { gainers: 0, losers: 0, averageChange: 0 };
        const gainers = stocks.filter(s => s.changePercent >= 0).length;
        const losers = stocks.length - gainers;
        const averageChange = stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length;
        return { gainers, losers, averageChange };
    }, [stocks]);

    const sectorMomentum = useMemo(() => {
        const grouped = new Map();
        stocks.forEach(stock => {
            const sector = getStockMeta(stock.symbol)?.sector || 'Diğer';
            if (!grouped.has(sector)) grouped.set(sector, []);
            grouped.get(sector).push(stock.changePercent);
        });
        return Array.from(grouped.entries())
            .map(([name, changes]) => ({
                name,
                avgChange: changes.reduce((s, v) => s + v, 0) / changes.length,
                count: changes.length
            }))
            .sort((a, b) => b.avgChange - a.avgChange);
    }, [stocks]);

    const topMovers = useMemo(() => {
        const sorted = [...filteredStocks].sort((a, b) => b.changePercent - a.changePercent);
        return { winners: sorted.slice(0, 3), losers: sorted.slice(-3).reverse() };
    }, [filteredStocks]);

    const watchlistStocks = useMemo(() => stocks.filter(s => isInWatchlist(s.symbol)), [stocks, isInWatchlist]);

    return (
        <div className="dashboard-page animate-fade-in">
            {/* Triggered Alarm Banners */}
            {triggeredAlarms.map(alarm => (
                <div key={alarm.id} className="alarm-banner glass-panel">
                    <BellRing size={16} className="alarm-bell-icon" />
                    <span>
                        <strong>{alarm.symbol}</strong> hedef fiyata ulaştı!
                        Hedef: <strong>{formatCurrency(alarm.targetPrice)}</strong>
                        &nbsp;→ Anlık: <strong>{formatCurrency(alarm.currentPrice)}</strong>
                    </span>
                    <button onClick={() => dismissTriggered(alarm.id)}><X size={14} /></button>
                </div>
            ))}

            <div className="dashboard-header">
                <div>
                    <h1>Piyasa Özeti</h1>
                    <p className="text-muted">Popüler BIST hisselerinin anlık durumu.</p>
                </div>
                <div className="dashboard-actions">
                    <div className={`market-status glass-panel ${marketStatus.isOpen ? 'market-open' : 'market-closed'}`}>
                        <span className={`status-dot ${marketStatus.isOpen ? '' : 'closed'}`}></span>
                        {marketStatus.isOpen ? 'Piyasa Açık' : 'Piyasa Kapalı'}
                        <span className="market-time">{marketStatus.timeStr}</span>
                    </div>
                    <button className="alarm-toggle-btn glass-panel" onClick={() => setShowAlarmPanel(p => !p)}>
                        <Bell size={16} />
                        {alarms.length > 0 && <span className="alarm-count">{alarms.length}</span>}
                    </button>
                    <button className="refresh-btn glass-panel" onClick={() => loadDashboardData(true)} disabled={isRefreshing}>
                        <RefreshCcw size={16} className={isRefreshing ? 'spin-icon' : ''} />
                        Yenile
                    </button>
                </div>
            </div>

            {/* Alarm Panel */}
            {showAlarmPanel && (
                <div className="alarm-panel glass-panel animate-slide-down">
                    <div className="alarm-panel-header">
                        <h3><Bell size={16} /> Fiyat Alarmları</h3>
                        <button onClick={() => setShowAlarmPanel(false)}><X size={16} /></button>
                    </div>

                    <div className="alarm-browser-warning">
                        <span>⚠️</span>
                        <span>Bu alarmlar <strong>yalnızca tarayıcı açıkken</strong> çalışır. Tarayıcı veya sekme kapatılırsa bildirim gelmez.</span>
                        {notifPermission === 'denied' && (
                            <span className="notif-blocked">🔕 Bildirimler engellendi — tarayıcı ayarlarından izin ver.</span>
                        )}
                        {notifPermission === 'default' && (
                            <span className="notif-hint">Alarm ekleyince bildirim izni istenecek.</span>
                        )}
                        {notifPermission === 'granted' && (
                            <span className="notif-ok">✓ Bildirimler aktif</span>
                        )}
                    </div>
                    <div className="alarm-add-row">
                        <select
                            value={newAlarmSymbol}
                            onChange={e => setNewAlarmSymbol(e.target.value)}
                            className="alarm-input"
                        >
                            <option value="">Hisse seç</option>
                            {BIST_STOCKS.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
                        </select>
                        <input
                            type="number"
                            placeholder="Hedef fiyat"
                            value={newAlarmPrice}
                            onChange={e => setNewAlarmPrice(e.target.value)}
                            className="alarm-input alarm-price"
                        />
                        <select value={newAlarmDir} onChange={e => setNewAlarmDir(e.target.value)} className="alarm-input">
                            <option value="above">Üstüne çıkınca</option>
                            <option value="below">Altına düşünce</option>
                        </select>
                        <button className="alarm-add-btn" onClick={addAlarm}><Plus size={16} /> Ekle</button>
                    </div>
                    <div className="alarm-list">
                        {alarms.length === 0 && <p className="text-muted alarm-empty">Henüz alarm yok.</p>}
                        {alarms.map(alarm => (
                            <div key={alarm.id} className="alarm-item">
                                <span className="alarm-symbol">{alarm.symbol}</span>
                                <span className="alarm-condition text-muted">
                                    {alarm.direction === 'above' ? '↑ üstünde' : '↓ altında'} {formatCurrency(alarm.targetPrice)}
                                </span>
                                <button className="alarm-remove" onClick={() => removeAlarm(alarm.id)}><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Macro Indicators */}
            {macroData.length > 0 && (
                <section className="macro-panel glass-panel">
                    <div className="macro-label"><DollarSign size={14} /> Makro Göstergeler</div>
                    <div className="macro-chips">
                        {macroData.map(m => (
                            <div key={m.symbol} className="macro-chip">
                                <span className="macro-chip-label">{m.label}</span>
                                {m.price != null ? (
                                    <>
                                        <span className="macro-chip-price">
                                            {m.prefix}{m.symbol === 'XU100.IS'
                                                ? Math.round(m.price).toLocaleString('tr-TR')
                                                : m.symbol === 'GC=F'
                                                    ? m.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                                    : m.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {m.change != null && (
                                            <span className={`macro-chip-change ${m.change >= 0 ? 'positive-text' : 'negative-text'}`}>
                                                {m.change >= 0 ? '+' : ''}{m.change.toFixed(2)}%
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="macro-chip-price text-muted">—</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Market Pulse */}
            <section className="market-pulse glass-panel">
                <div className="pulse-top">
                    <div className="pulse-badge">
                        <Activity size={14} />
                        Piyasa Nabzı
                    </div>
                    <button className="wallet-chip" onClick={() => navigate('/screener')}>
                        <SlidersHorizontal size={14} /> Hisse Tarama
                    </button>
                </div>
                <div className="pulse-stats">
                    <div className="pulse-stat">
                        <span className="pulse-label">Yükselenler</span>
                        <strong className="positive-text pulse-value">{marketSummary.gainers}</strong>
                    </div>
                    <div className="pulse-divider" />
                    <div className="pulse-stat">
                        <span className="pulse-label">Düşenler</span>
                        <strong className="negative-text pulse-value">{marketSummary.losers}</strong>
                    </div>
                    <div className="pulse-divider" />
                    <div className="pulse-stat">
                        <span className="pulse-label">Ort. Değişim</span>
                        <strong className={`pulse-value ${marketSummary.averageChange >= 0 ? 'positive-text' : 'negative-text'}`}>
                            {formatPercent(marketSummary.averageChange)}
                        </strong>
                    </div>
                    <div className="pulse-divider" />
                    <div className="pulse-stat pulse-breadth">
                        <span className="pulse-label">Piyasa Genişliği</span>
                        <div className="breadth-bar">
                            <div
                                className="breadth-fill-up"
                                style={{ width: stocks.length ? `${(marketSummary.gainers / stocks.length) * 100}%` : '0%' }}
                            />
                            <div className="breadth-fill-down" style={{ flex: 1 }} />
                        </div>
                        <span className="text-muted breadth-label">
                            {stocks.length ? Math.round((marketSummary.gainers / stocks.length) * 100) : 0}% yükseliş
                        </span>
                    </div>
                </div>
            </section>

            <div className="summary-grid">
                <div className="summary-card glass-panel">
                    <span className="summary-title">Yükselenler</span>
                    <strong className="summary-value positive-text">{marketSummary.gainers}</strong>
                </div>
                <div className="summary-card glass-panel">
                    <span className="summary-title">Düşenler</span>
                    <strong className="summary-value negative-text">{marketSummary.losers}</strong>
                </div>
                <div className="summary-card glass-panel">
                    <span className="summary-title">Ort. Değişim</span>
                    <strong className={`summary-value ${marketSummary.averageChange >= 0 ? 'positive-text' : 'negative-text'}`}>
                        {formatPercent(marketSummary.averageChange)}
                    </strong>
                </div>
                <div className="summary-card glass-panel">
                    <span className="summary-title">Favoriler</span>
                    <strong className="summary-value">{watchlist.length}</strong>
                </div>
            </div>

            {/* Watchlist Summary */}
            {watchlistStocks.length > 0 && (
                <section className="watchlist-summary glass-panel">
                    <div className="watchlist-summary-header">
                        <h3><Star size={16} /> Favorilerim</h3>
                        <span className="text-muted">{watchlistStocks.length} hisse</span>
                    </div>
                    <div className="watchlist-chips">
                        {watchlistStocks.map(stock => {
                            const isPos = stock.changePercent >= 0;
                            return (
                                <button
                                    key={stock.symbol}
                                    className={`watchlist-chip glass-panel ${isPos ? 'chip-pos' : 'chip-neg'}`}
                                    onClick={() => handleStockClick(stock.symbol)}
                                >
                                    <span className="chip-symbol">{stock.symbol}</span>
                                    <span className="chip-price">{formatCurrency(stock.price)}</span>
                                    <span className={`chip-change ${isPos ? 'positive-text' : 'negative-text'}`}>
                                        {formatPercent(stock.changePercent)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="dashboard-toolbar glass-panel">
                <div className="toolbar-left">
                    <BarChart3 size={18} />
                    <span>Sektör Filtresi</span>
                </div>
                <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="sector-select">
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="watchlist-toggle">
                    <input type="checkbox" checked={watchlistOnly} onChange={e => setWatchlistOnly(e.target.checked)} />
                    Sadece Favoriler
                </label>
                <span className="last-update text-muted">
                    Son güncelleme: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('tr-TR') : '-'}
                </span>
            </div>

            <div className="sector-momentum glass-panel">
                <div className="sector-momentum-header">
                    <h3>Sektörel Momentum</h3>
                    <span className="text-muted">Sektör ort. değişimine göre sıralı</span>
                </div>
                <div className="sector-momentum-grid">
                    {sectorMomentum.map(item => {
                        const absolute = Math.min(Math.abs(item.avgChange), 8);
                        const fillWidth = `${(absolute / 8) * 100}%`;
                        const positive = item.avgChange >= 0;
                        return (
                            <div key={item.name} className="sector-momentum-item">
                                <div className="sector-top-row">
                                    <strong>{item.name}</strong>
                                    <span className={positive ? 'positive-text' : 'negative-text'}>{formatPercent(item.avgChange)}</span>
                                </div>
                                <div className="sector-bar-track">
                                    <div className={`sector-bar-fill ${positive ? 'up' : 'down'}`} style={{ width: fillWidth }} />
                                </div>
                                <span className="text-muted sector-count">{item.count} hisse</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="movers-grid">
                <div className="glass-panel movers-card">
                    <h3>Günün Güçlü Hisseleri</h3>
                    {topMovers.winners.map(item => (
                        <button key={item.symbol} className="mover-row" onClick={() => handleStockClick(item.symbol)}>
                            <span>{item.symbol.replace('.IS', '')}</span>
                            <strong className="positive-text">{formatPercent(item.changePercent)}</strong>
                        </button>
                    ))}
                </div>
                <div className="glass-panel movers-card">
                    <h3>Günün Zayıf Hisseleri</h3>
                    {topMovers.losers.map(item => (
                        <button key={item.symbol} className="mover-row" onClick={() => handleStockClick(item.symbol)}>
                            <span>{item.symbol.replace('.IS', '')}</span>
                            <strong className="negative-text">{formatPercent(item.changePercent)}</strong>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading-state glass-panel">
                    <Loader2 className="spinner" size={40} />
                    <p>Piyasa verileri getiriliyor...</p>
                </div>
            ) : error ? (
                <div className="error-state glass-panel">
                    <p className="negative-text">{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-btn">Tekrar Dene</button>
                </div>
            ) : (
                <div className="stocks-grid">
                    {filteredStocks.map(stock => {
                        const isPositive = stock.changePercent >= 0;
                        const cleanSymbol = stock.symbol.replace('.IS', '');
                        const stockMeta = getStockMeta(cleanSymbol);
                        return (
                            <div key={stock.symbol} className="stock-card glass-panel" onClick={() => handleStockClick(stock.symbol)}>
                                <div className="stock-card-header">
                                    <div className="stock-info-main">
                                        <StockLogo symbol={cleanSymbol} name={stockMeta?.name} alt={cleanSymbol} className="stock-logo-small" />
                                        <div>
                                            <h3 className="stock-symbol">{cleanSymbol}</h3>
                                            <p className="stock-sector text-muted">{stockMeta?.sector || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="stock-card-actions">
                                        <button
                                            className={`watch-btn ${isInWatchlist(cleanSymbol) ? 'active' : ''}`}
                                            onClick={e => { e.stopPropagation(); toggleSymbol(cleanSymbol); }}
                                            title="Favorilere ekle / kaldır"
                                        >
                                            <Star size={15} fill={isInWatchlist(cleanSymbol) ? 'currentColor' : 'none'} />
                                        </button>
                                        <div className={`trend-badge ${isPositive ? 'trend-up' : 'trend-down'}`}>
                                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            {formatPercent(stock.changePercent)}
                                        </div>
                                    </div>
                                </div>
                                <div className="stock-card-body">
                                    <div className="price-info">
                                        <span className="current-price">{formatCurrency(stock.price)}</span>
                                    </div>
                                    <div className="stock-action">
                                        <span>Analiz Et</span>
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredStocks.length === 0 && (
                        <div className="dashboard-empty glass-panel">
                            <h3>Filtreye uygun hisse bulunamadı</h3>
                            <p className="text-muted">Sektör veya favori filtresini değiştirerek tekrar deneyin.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
