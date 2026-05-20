import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Download, RefreshCw, Activity, TrendingUp } from 'lucide-react';
import { fetchStockData } from '../services/api';
import { BIST_STOCKS, getStockMeta } from '../constants/stocks';
import { formatCurrency, formatPercent } from '../utils/formatters';
import StockLogo from '../components/ui/StockLogo';
import { loadPortfolio, savePortfolio, genId } from '../utils/portfolioStorage';
import './Portfoy.css';

const EMPTY_FORM = { symbol: '', buyPrice: '', quantity: '', buyDate: '', notes: '' };

export default function Portfoy() {
    const [positions, setPositions] = useState(() => loadPortfolio());
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchPrices = useCallback(async (posList) => {
        if (!posList.length) return;
        setLoading(true);
        try {
            const uniqueSymbols = [...new Set(posList.map((p) => p.symbol))];
            const results = await Promise.all(
                uniqueSymbols.map((sym) =>
                    fetchStockData(sym, '5d', '1d').catch(() => null)
                )
            );
            const map = {};
            uniqueSymbols.forEach((sym, i) => {
                const data = results[i];
                if (data && data.quotes && data.quotes.length > 0) {
                    const last = data.quotes[data.quotes.length - 1];
                    map[sym] = last.close ?? last.open ?? null;
                }
            });
            setPrices(map);
        } catch (err) {
            console.error('Fiyat güncellenirken hata:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrices(positions);
    }, [positions, fetchPrices]);

    const handleAddPosition = () => {
        const { symbol, buyPrice, quantity, buyDate, notes } = form;
        if (!symbol || !buyPrice || !quantity) return;
        const bp = parseFloat(buyPrice);
        const qty = parseFloat(quantity);
        if (isNaN(bp) || isNaN(qty) || bp <= 0 || qty <= 0) return;

        const newPos = {
            id: genId(),
            symbol,
            buyPrice: bp,
            quantity: qty,
            buyDate,
            notes,
        };
        const updated = [...positions, newPos];
        setPositions(updated);
        savePortfolio(updated);
        setForm(EMPTY_FORM);
        setShowForm(false);
    };

    const handleRemove = (id) => {
        const updated = positions.filter((p) => p.id !== id);
        setPositions(updated);
        savePortfolio(updated);
    };

    // Enriched positions
    const enriched = positions.map((pos) => {
        const currentPrice = prices[pos.symbol] ?? null;
        const cost = pos.buyPrice * pos.quantity;
        const value = currentPrice != null ? currentPrice * pos.quantity : null;
        const pnl = value != null ? value - cost : null;
        const pnlPct = pnl != null ? (pnl / cost) * 100 : null;
        const meta = getStockMeta(pos.symbol);
        return { ...pos, currentPrice, cost, value, pnl, pnlPct, meta };
    });

    const totalCost = enriched.reduce((sum, p) => sum + p.cost, 0);
    const totalValue = enriched.reduce(
        (sum, p) => sum + (p.value ?? p.cost),
        0
    );
    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const withPnlPct = enriched.filter((p) => p.pnlPct != null);
    const best =
        withPnlPct.length > 0
            ? withPnlPct.reduce((a, b) => (a.pnlPct > b.pnlPct ? a : b))
            : null;
    const worst =
        withPnlPct.length > 0
            ? withPnlPct.reduce((a, b) => (a.pnlPct < b.pnlPct ? a : b))
            : null;

    // Sector allocation
    const sectorMap = {};
    enriched.forEach((p) => {
        const sector = p.meta?.sector ?? 'Diğer';
        const val = p.value ?? p.cost;
        if (!sectorMap[sector]) sectorMap[sector] = 0;
        sectorMap[sector] += val;
    });
    const sectorAlloc = Object.entries(sectorMap)
        .map(([sector, value]) => ({
            sector,
            value,
            pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

    // CSV export
    const handleExportCSV = () => {
        const header = [
            'Sembol',
            'Alış Fiyatı',
            'Güncel Fiyat',
            'Adet',
            'Maliyet',
            'Değer',
            'K/Z',
            'K/Z %',
            'Alış Tarihi',
        ].join(',');
        const rows = enriched.map((p) =>
            [
                p.symbol,
                p.buyPrice,
                p.currentPrice ?? '',
                p.quantity,
                p.cost.toFixed(2),
                p.value != null ? p.value.toFixed(2) : '',
                p.pnl != null ? p.pnl.toFixed(2) : '',
                p.pnlPct != null ? p.pnlPct.toFixed(2) : '',
                p.buyDate ?? '',
            ].join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfoy.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const updateForm = (field, value) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="portfoy-page">
            {/* Header */}
            <div className="portfoy-header glass-panel">
                <div>
                    <h2 className="portfoy-title">
                        <TrendingUp size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Portföyüm
                    </h2>
                    <p className="portfoy-subtitle">
                        {positions.length} pozisyon takip ediliyor
                    </p>
                </div>
                <div className="portfoy-header-actions">
                    <button
                        className="pf-refresh-btn"
                        onClick={() => fetchPrices(positions)}
                        disabled={loading}
                        title="Fiyatları Güncelle"
                    >
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                        <span>Güncelle</span>
                    </button>
                    {positions.length > 0 && (
                        <button className="pf-export-btn" onClick={handleExportCSV} title="CSV İndir">
                            <Download size={15} />
                            <span>CSV</span>
                        </button>
                    )}
                    <button
                        className="pf-add-btn"
                        onClick={() => setShowForm((v) => !v)}
                    >
                        <Plus size={15} />
                        <span>Pozisyon Ekle</span>
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="glass-panel pf-form">
                    <h3 className="pf-form-title">Yeni Pozisyon</h3>
                    <div className="pf-form-grid">
                        <div className="pf-field">
                            <label className="pf-label">Hisse Senedi</label>
                            <select
                                className="pf-input"
                                value={form.symbol}
                                onChange={(e) => updateForm('symbol', e.target.value)}
                            >
                                <option value="">Seçiniz…</option>
                                {BIST_STOCKS.map((s) => (
                                    <option key={s.symbol} value={s.symbol}>
                                        {s.symbol} — {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="pf-field">
                            <label className="pf-label">Alış Fiyatı (₺)</label>
                            <input
                                className="pf-input"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.buyPrice}
                                onChange={(e) => updateForm('buyPrice', e.target.value)}
                            />
                        </div>
                        <div className="pf-field">
                            <label className="pf-label">Adet</label>
                            <input
                                className="pf-input"
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={form.quantity}
                                onChange={(e) => updateForm('quantity', e.target.value)}
                            />
                        </div>
                        <div className="pf-field">
                            <label className="pf-label">Alış Tarihi</label>
                            <input
                                className="pf-input"
                                type="date"
                                value={form.buyDate}
                                onChange={(e) => updateForm('buyDate', e.target.value)}
                            />
                        </div>
                        <div className="pf-field pf-notes">
                            <label className="pf-label">Notlar</label>
                            <input
                                className="pf-input"
                                type="text"
                                placeholder="İsteğe bağlı not…"
                                value={form.notes}
                                onChange={(e) => updateForm('notes', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pf-form-actions">
                        <button
                            className="pf-cancel-btn"
                            onClick={() => {
                                setShowForm(false);
                                setForm(EMPTY_FORM);
                            }}
                        >
                            İptal
                        </button>
                        <button
                            className="pf-confirm-btn"
                            onClick={handleAddPosition}
                            disabled={!form.symbol || !form.buyPrice || !form.quantity}
                        >
                            <Plus size={14} />
                            Ekle
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            {positions.length > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div className="pf-summary-grid">
                        <div className="pf-summary-card glass-panel">
                            <span className="pf-card-label">Toplam Değer</span>
                            <span className="pf-card-value">{formatCurrency(totalValue)}</span>
                            <span className="pf-card-sub">
                                Maliyet: {formatCurrency(totalCost)}
                            </span>
                        </div>
                        <div
                            className={`pf-summary-card glass-panel ${
                                totalPnl >= 0 ? 'card-pos' : 'card-neg'
                            }`}
                        >
                            <span className="pf-card-label">Toplam K/Z</span>
                            <span
                                className="pf-card-value"
                                style={{ color: totalPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
                                {formatCurrency(totalPnl)}
                            </span>
                            <span
                                className="pf-card-sub"
                                style={{ color: totalPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
                                {formatPercent(totalPnlPct)}
                            </span>
                        </div>
                        <div className="pf-summary-card glass-panel card-pos">
                            <span className="pf-card-label">En İyi</span>
                            {best ? (
                                <>
                                    <span className="pf-card-value" style={{ color: 'var(--success)' }}>
                                        {best.symbol}
                                    </span>
                                    <span className="pf-card-sub" style={{ color: 'var(--success)' }}>
                                        {formatPercent(best.pnlPct)}
                                    </span>
                                </>
                            ) : (
                                <span className="pf-card-value">—</span>
                            )}
                        </div>
                        <div className="pf-summary-card glass-panel card-neg">
                            <span className="pf-card-label">En Kötü</span>
                            {worst ? (
                                <>
                                    <span className="pf-card-value" style={{ color: 'var(--danger)' }}>
                                        {worst.symbol}
                                    </span>
                                    <span className="pf-card-sub" style={{ color: 'var(--danger)' }}>
                                        {formatPercent(worst.pnlPct)}
                                    </span>
                                </>
                            ) : (
                                <span className="pf-card-value">—</span>
                            )}
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="glass-panel pf-table-panel">
                        <div className="pf-table-header">
                            <h3 className="pf-section-title">Pozisyonlar</h3>
                        </div>
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th>Hisse</th>
                                        <th className="num-col">Alış</th>
                                        <th className="num-col">Güncel</th>
                                        <th className="num-col hide-sm">Adet</th>
                                        <th className="num-col hide-sm">Maliyet</th>
                                        <th className="num-col">Değer</th>
                                        <th className="num-col">K/Z</th>
                                        <th className="num-col">K/Z %</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enriched.map((pos) => (
                                        <tr
                                            key={pos.id}
                                            className={
                                                pos.pnl == null
                                                    ? ''
                                                    : pos.pnl >= 0
                                                    ? 'pos-profit'
                                                    : 'pos-loss'
                                            }
                                        >
                                            <td>
                                                <div className="pf-company-cell">
                                                    <StockLogo
                                                        symbol={pos.symbol}
                                                        name={pos.meta?.name}
                                                        size={32}
                                                        className="pf-logo"
                                                    />
                                                    <div>
                                                        <div className="pf-sym">{pos.symbol}</div>
                                                        <div className="pf-name">{pos.meta?.name ?? ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="num-col">
                                                {formatCurrency(pos.buyPrice)}
                                            </td>
                                            <td className="num-col">
                                                {pos.currentPrice != null
                                                    ? formatCurrency(pos.currentPrice)
                                                    : '—'}
                                            </td>
                                            <td className="num-col hide-sm">
                                                {pos.quantity.toLocaleString('tr-TR')}
                                            </td>
                                            <td className="num-col hide-sm">
                                                {formatCurrency(pos.cost)}
                                            </td>
                                            <td className="num-col">
                                                {pos.value != null
                                                    ? formatCurrency(pos.value)
                                                    : '—'}
                                            </td>
                                            <td
                                                className="num-col"
                                                style={{
                                                    color:
                                                        pos.pnl == null
                                                            ? 'inherit'
                                                            : pos.pnl >= 0
                                                            ? 'var(--success)'
                                                            : 'var(--danger)',
                                                }}
                                            >
                                                {pos.pnl != null ? formatCurrency(pos.pnl) : '—'}
                                            </td>
                                            <td
                                                className="num-col"
                                                style={{
                                                    color:
                                                        pos.pnlPct == null
                                                            ? 'inherit'
                                                            : pos.pnlPct >= 0
                                                            ? 'var(--success)'
                                                            : 'var(--danger)',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {pos.pnlPct != null
                                                    ? formatPercent(pos.pnlPct)
                                                    : '—'}
                                            </td>
                                            <td>
                                                <button
                                                    className="pf-remove-btn"
                                                    onClick={() => handleRemove(pos.id)}
                                                    title="Pozisyonu sil"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sector Allocation */}
                    {sectorAlloc.length > 0 && (
                        <div className="glass-panel pf-sector-panel">
                            <h3 className="pf-section-title">Sektör Dağılımı</h3>
                            <div className="pf-sector-bars">
                                {sectorAlloc.map(({ sector, value, pct }) => (
                                    <div key={sector} className="pf-sector-row">
                                        <span className="pf-sector-name">{sector}</span>
                                        <div className="pf-sector-bar-track">
                                            <div
                                                className="pf-sector-bar-fill"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="pf-sector-pct">
                                            {pct.toFixed(1)}%
                                        </span>
                                        <span className="pf-sector-value">
                                            {formatCurrency(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                !showForm && (
                    <div className="glass-panel pf-empty">
                        <Activity size={48} color="var(--text-muted)" strokeWidth={1.2} />
                        <div>
                            <p className="pf-empty-title">Portföyünüz boş</p>
                            <p className="pf-empty-sub">
                                BIST hisselerinizi takip etmek için ilk pozisyonunuzu ekleyin.
                            </p>
                        </div>
                        <button
                            className="pf-add-btn"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus size={15} />
                            İlk Pozisyonu Ekle
                        </button>
                    </div>
                )
            )}
        </div>
    );
}
