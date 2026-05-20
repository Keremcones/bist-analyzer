import React, { useState } from 'react';
import {
    Save, RotateCcw, Shield, Zap, TrendingUp,
    SlidersHorizontal, BarChart3, Filter, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
    loadGlobalStrategy, saveGlobalStrategy,
    DEFAULT_STRATEGY, RISK_PROFILES,
} from '../utils/strategyStorage';
import './Strateji.css';

const SliderRow = ({ label, value, onChange, min, max, step = 1, format = v => v }) => (
    <div className="str-slider-row">
        <div className="str-slider-top">
            <span className="str-slider-label">{label}</span>
            <span className="str-slider-value">{format(value)}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="str-slider"
        />
        <div className="str-slider-minmax">
            <span>{format(min)}</span>
            <span>{format(max)}</span>
        </div>
    </div>
);

const NumInput = ({ label, hint, value, onChange, min, max, step = 1, suffix = '' }) => (
    <label className="str-num-label">
        <span className="str-num-name">{label}</span>
        {hint && <span className="str-num-hint">{hint}</span>}
        <div className="str-num-wrap">
            <input
                type="number"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                min={min} max={max} step={step}
                className="str-num-input"
            />
            {suffix && <span className="str-num-suffix">{suffix}</span>}
        </div>
    </label>
);

const Toggle = ({ checked, onChange }) => (
    <button
        className={`str-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        type="button"
    >
        <span className="str-toggle-knob" />
    </button>
);

const ToggleRow = ({ title, desc, checked, onChange, children }) => (
    <div className="str-toggle-row">
        <div className="str-toggle-info">
            <strong>{title}</strong>
            {desc && <p className="str-toggle-desc">{desc}</p>}
        </div>
        <Toggle checked={checked} onChange={onChange} />
        {children}
    </div>
);

const Strateji = () => {
    const [strategy, setStrategy] = useState(() => loadGlobalStrategy());
    const [saved, setSaved] = useState(false);

    const set = (key, value) =>
        setStrategy(prev => ({ ...prev, [key]: value, riskProfile: 'custom' }));

    const applyProfile = (profileKey) => {
        const p = RISK_PROFILES[profileKey];
        if (!p) return;
        setStrategy(prev => ({
            ...prev,
            buyThreshold:        p.buyThreshold,
            sellThreshold:       p.sellThreshold,
            takeProfit:          p.takeProfit,
            stopLoss:            p.stopLoss,
            positionMode:        p.positionMode,
            exitOnSignal:        p.exitOnSignal,
            adxFilterEnabled:    p.adxFilterEnabled,
            adxMinStrength:      p.adxMinStrength,
            trailingStopEnabled: p.trailingStopEnabled,
            volumeFilterEnabled: p.volumeFilterEnabled,
            riskProfile:         profileKey,
        }));
    };

    const handleSave = () => {
        saveGlobalStrategy(strategy);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleReset = () => setStrategy({ ...DEFAULT_STRATEGY });

    const ActionBar = () => (
        <div className="str-action-bar">
            <button className="str-reset-btn" onClick={handleReset} type="button">
                <RotateCcw size={14} /> Varsayılana Dön
            </button>
            <button
                className={`str-save-btn ${saved ? 'saved' : ''}`}
                onClick={handleSave}
                type="button"
            >
                {saved ? <><CheckCircle size={14} /> Kaydedildi!</> : <><Save size={14} /> Stratejiyi Kaydet</>}
            </button>
        </div>
    );

    return (
        <div className="strateji-page animate-fade-in">
            {/* Header */}
            <div className="strateji-header glass-panel">
                <div>
                    <h1>Global Strateji</h1>
                    <p className="text-muted">Tüm sitede kullanılacak sinyal, risk ve indikatör parametrelerini buradan yapılandır.</p>
                </div>
                <ActionBar />
            </div>

            {/* ── 1. Risk Profili ────────────────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <Shield size={17} className="str-section-icon" />
                    <h2>Risk Profili</h2>
                </div>
                <p className="str-section-desc">Hazır profil seç — tüm parametreler otomatik ayarlanır. Ya da aşağıdan özelleştir.</p>
                <div className="str-profile-grid">
                    {Object.entries(RISK_PROFILES).map(([key, p]) => (
                        <button
                            key={key}
                            type="button"
                            className={`str-profile-card ${strategy.riskProfile === key ? 'active' : ''}`}
                            style={{ '--profile-color': p.color }}
                            onClick={() => applyProfile(key)}
                        >
                            <span className="str-profile-icon">{p.icon}</span>
                            <strong>{p.label}</strong>
                            <p>{p.description}</p>
                            <div className="str-profile-stats">
                                <span>TP {p.takeProfit}%</span>
                                <span>SL {p.stopLoss}%</span>
                                <span>{p.positionMode === 'both' ? 'L+S' : p.positionMode === 'short' ? 'Short' : 'Long'}</span>
                            </div>
                        </button>
                    ))}
                    <div className={`str-profile-card custom-card ${strategy.riskProfile === 'custom' ? 'active' : ''}`}>
                        <span className="str-profile-icon">🎛️</span>
                        <strong>Özel</strong>
                        <p>Aşağıdan kendin ayarla</p>
                        <div className="str-profile-stats">
                            <span>TP {strategy.takeProfit}%</span>
                            <span>SL {strategy.stopLoss}%</span>
                            <span>{strategy.positionMode === 'both' ? 'L+S' : strategy.positionMode === 'short' ? 'Short' : 'Long'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. Sinyal Eşikleri ─────────────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <Zap size={17} className="str-section-icon" />
                    <h2>Sinyal Eşikleri</h2>
                </div>
                <p className="str-section-desc">Algoritma skoru -100 ile +100 arasındadır. AL için minimum, SAT için maksimum değeri belirle.</p>
                <div className="str-sliders">
                    <SliderRow
                        label="AL Eşiği — alım skoru en az bu değerde olmalı"
                        value={strategy.buyThreshold}
                        onChange={v => set('buyThreshold', v)}
                        min={5} max={80}
                        format={v => `+${v}`}
                    />
                    <SliderRow
                        label="SAT Eşiği — satış skoru en fazla bu değerde olmalı"
                        value={strategy.sellThreshold}
                        onChange={v => set('sellThreshold', v)}
                        min={-80} max={-5}
                        format={v => `${v}`}
                    />
                </div>
                <div className="str-threshold-visual">
                    <div className="str-tv-bar">
                        <div
                            className="str-tv-sell"
                            style={{ width: `${(Math.abs(strategy.sellThreshold) / 80) * 40}%` }}
                        />
                        <div className="str-tv-neutral" />
                        <div
                            className="str-tv-buy"
                            style={{ width: `${(strategy.buyThreshold / 80) * 40}%` }}
                        />
                    </div>
                    <div className="str-tv-labels">
                        <span className="negative-text">SAT ({strategy.sellThreshold})</span>
                        <span className="text-muted">Nötr Bölge</span>
                        <span className="positive-text">AL (+{strategy.buyThreshold})</span>
                    </div>
                </div>
            </div>

            {/* ── 3. Risk Yönetimi ───────────────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <TrendingUp size={17} className="str-section-icon" />
                    <h2>Risk Yönetimi</h2>
                </div>
                <div className="str-grid-2">
                    <NumInput
                        label="Kar Al (Take Profit)"
                        hint="Fiyat bu kadar yükselince pozisyonu kapat"
                        value={strategy.takeProfit}
                        onChange={v => set('takeProfit', v)}
                        min={0.1} max={50} step={0.1} suffix="%"
                    />
                    <NumInput
                        label="Zarar Durdur (Stop Loss)"
                        hint="Fiyat bu kadar düşünce zararı kes"
                        value={strategy.stopLoss}
                        onChange={v => set('stopLoss', v)}
                        min={0.1} max={50} step={0.1} suffix="%"
                    />
                </div>
                <div className="str-toggles-stack">
                    <ToggleRow
                        title="Sinyal Dönüşünde Çık"
                        desc="TP/SL dışında, ters sinyal üretildiğinde pozisyonu kapat"
                        checked={strategy.exitOnSignal}
                        onChange={v => set('exitOnSignal', v)}
                    />
                    <ToggleRow
                        title="Trailing Stop"
                        desc="Zarar durdur seviyesi fiyat yükseldikçe yukarı kayar"
                        checked={strategy.trailingStopEnabled}
                        onChange={v => set('trailingStopEnabled', v)}
                    />
                    {strategy.trailingStopEnabled && (
                        <div className="str-sub-input">
                            <NumInput
                                label="Trailing Stop Mesafesi"
                                hint="Fiyatın zirvesinden ne kadar geride duracak"
                                value={strategy.trailingStopPct}
                                onChange={v => set('trailingStopPct', v)}
                                min={0.1} max={20} step={0.1} suffix="%"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── 4. Pozisyon Yönü ───────────────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <BarChart3 size={17} className="str-section-icon" />
                    <h2>Pozisyon Yönü</h2>
                </div>
                <div className="str-pos-grid">
                    {[
                        { val: 'long',  label: '🟢 Sadece Long',  desc: 'Yalnızca alım yönünde pozisyon aç' },
                        { val: 'short', label: '🔴 Sadece Short', desc: 'Yalnızca satım yönünde pozisyon aç' },
                        { val: 'both',  label: '⚡ Long + Short', desc: 'Her iki yönde de işlem yap' },
                    ].map(m => (
                        <button
                            key={m.val}
                            type="button"
                            className={`str-pos-card ${strategy.positionMode === m.val ? 'active' : ''}`}
                            onClick={() => set('positionMode', m.val)}
                        >
                            <strong>{m.label}</strong>
                            <span>{m.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 5. İndikatör Periyotları ───────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <SlidersHorizontal size={17} className="str-section-icon" />
                    <h2>İndikatör Periyotları</h2>
                </div>
                <p className="str-section-desc">EMA, RSI ve ADX hesaplamalarında kullanılan bar sayıları. Grafik gösterimini ve sinyal üretimini etkiler.</p>
                <div className="str-grid-3">
                    <NumInput label="EMA 1 (Hızlı)" hint="Kısa vadeli trend" value={strategy.ema1Period} onChange={v => set('ema1Period', v)} min={3} max={50} suffix="bar" />
                    <NumInput label="EMA 2 (Orta)" hint="Orta vadeli trend" value={strategy.ema2Period} onChange={v => set('ema2Period', v)} min={5} max={100} suffix="bar" />
                    <NumInput label="EMA 3 (Yavaş)" hint="Uzun vadeli trend" value={strategy.ema3Period} onChange={v => set('ema3Period', v)} min={10} max={200} suffix="bar" />
                    <NumInput label="RSI Periyodu" hint="Momentum gücü" value={strategy.rsiPeriod} onChange={v => set('rsiPeriod', v)} min={3} max={50} suffix="bar" />
                    <NumInput label="ADX Periyodu" hint="Trend kuvveti ölçümü" value={strategy.adxPeriod} onChange={v => set('adxPeriod', v)} min={3} max={50} suffix="bar" />
                    <NumInput label="ADX Min. Güç" hint="Filtre için eşik değer" value={strategy.adxMinStrength} onChange={v => set('adxMinStrength', v)} min={5} max={60} />
                </div>
            </div>

            {/* ── 6. Gelişmiş Filtreler ──────────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <Filter size={17} className="str-section-icon" />
                    <h2>Gelişmiş Filtreler</h2>
                </div>
                <div className="str-toggles-stack">
                    <ToggleRow
                        title="ADX Trend Filtresi"
                        desc={`Sadece ADX > ${strategy.adxMinStrength} olduğunda işlem aç — zayıf yatay piyasalardan kaçınır`}
                        checked={strategy.adxFilterEnabled}
                        onChange={v => set('adxFilterEnabled', v)}
                    />
                    <ToggleRow
                        title="Hacim Filtresi"
                        desc="Sadece günlük hacim ortalamanın üzerindeyken sinyal üret — düşük hacimli yanıltıcı hareketleri filtreler"
                        checked={strategy.volumeFilterEnabled}
                        onChange={v => set('volumeFilterEnabled', v)}
                    />
                </div>
            </div>

            {/* ── 7. Screener Varsayılanları ─────────────────────── */}
            <div className="glass-panel strateji-section">
                <div className="str-section-header">
                    <SlidersHorizontal size={17} className="str-section-icon" />
                    <h2>Screener Varsayılanları</h2>
                </div>
                <p className="str-section-desc">Screener sayfası ilk açıldığında kullanılacak filtre değerleri.</p>
                <div className="str-grid-2">
                    <div className="str-num-label">
                        <span className="str-num-name">Varsayılan Zaman Dilimi</span>
                        <div className="str-tf-group">
                            {['15m', '1h', '4h', '1d'].map(tf => (
                                <button
                                    key={tf}
                                    type="button"
                                    className={`str-tf-btn ${strategy.defaultTimeframe === tf ? 'active' : ''}`}
                                    onClick={() => set('defaultTimeframe', tf)}
                                >{tf}</button>
                            ))}
                        </div>
                    </div>
                    <NumInput
                        label="Min. İşlem Sayısı"
                        hint="Bu sayıdan az işlem yapan hisseleri gizle"
                        value={strategy.screenerMinTrades}
                        onChange={v => set('screenerMinTrades', v)}
                        min={0} max={100}
                    />
                    <NumInput
                        label="Min. Kazanma Oranı"
                        hint="Bu oranın altındaki hisseleri gizle"
                        value={strategy.screenerMinWinRate}
                        onChange={v => set('screenerMinWinRate', v)}
                        min={0} max={100} suffix="%"
                    />
                </div>
            </div>

            {/* Uyarı */}
            <div className="str-warning glass-panel">
                <AlertTriangle size={15} className="str-warning-icon" />
                <p>Kaydedilen ayarlar <strong>Screener</strong> ve <strong>Grafik</strong> sayfalarının varsayılan değerlerini günceller. Değişikliklerin tam etkisi için sayfaları yenile.</p>
            </div>

            <ActionBar />
        </div>
    );
};

export default Strateji;
