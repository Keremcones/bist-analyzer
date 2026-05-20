import React, { useState } from 'react';
import { Save, Settings, Shield, Bell, RotateCcw } from 'lucide-react';
import './Profile.css';

const Profile = () => {
    const [shortPeriod, setShortPeriod] = useState(() => Number(localStorage.getItem('bist_default_short')) || 20);
    const [longPeriod, setLongPeriod] = useState(() => Number(localStorage.getItem('bist_default_long')) || 50);
    const [riskProfile, setRiskProfile] = useState(() => localStorage.getItem('bist_risk_profile') || 'Dengeli');
    const [notifySignals, setNotifySignals] = useState(() => localStorage.getItem('bist_notify_signals') === 'true');
    const [savedMessage, setSavedMessage] = useState('');

    const handleSave = () => {
        localStorage.setItem('bist_default_short', shortPeriod);
        localStorage.setItem('bist_default_long', longPeriod);
        localStorage.setItem('bist_risk_profile', riskProfile);
        localStorage.setItem('bist_notify_signals', String(notifySignals));
        setSavedMessage('Ayarlar başarıyla kaydedildi!');

        setTimeout(() => {
            setSavedMessage('');
        }, 3000);
    };

    const resetDefaults = () => {
        setShortPeriod(20);
        setLongPeriod(50);
        setRiskProfile('Dengeli');
        setNotifySignals(true);
    };

    return (
        <div className="profile-page animate-fade-in">
            <div className="profile-header">
                <h1>Profil & Ayarlar</h1>
                <p className="text-muted">Kişisel tercihlerinizi ve varsayılan strateji ayarlarınızı yönetin.</p>
            </div>

            <div className="profile-grid">
                <div className="profile-card glass-panel">
                    <div className="card-header">
                        <Settings className="card-icon" size={24} />
                        <h2>Varsayılan Backtest Ayarları</h2>
                    </div>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                        Hisse detay sayfasına girdiğinizde varsayılan olarak kullanılacak Hareketli Ortalama (SMA) periyotlarını belirleyin.
                    </p>

                    <div className="settings-form">
                        <div className="form-group">
                            <label>Kısa Periyot (Gün)</label>
                            <input
                                type="number"
                                value={shortPeriod}
                                onChange={(e) => setShortPeriod(Number(e.target.value))}
                                min="5"
                                max="100"
                                className="setting-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Uzun Periyot (Gün)</label>
                            <input
                                type="number"
                                value={longPeriod}
                                onChange={(e) => setLongPeriod(Number(e.target.value))}
                                min="10"
                                max="250"
                                className="setting-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Risk Profili</label>
                            <select
                                value={riskProfile}
                                onChange={(e) => setRiskProfile(e.target.value)}
                                className="setting-input"
                            >
                                <option value="Koruyucu">Koruyucu</option>
                                <option value="Dengeli">Dengeli</option>
                                <option value="Agresif">Agresif</option>
                            </select>
                        </div>

                        <label className="toggle-row">
                            <span className="toggle-left"><Bell size={16} /> Sinyal Bildirimleri</span>
                            <input
                                type="checkbox"
                                checked={notifySignals}
                                onChange={(e) => setNotifySignals(e.target.checked)}
                            />
                        </label>

                        <div className="profile-actions">
                            <button className="save-btn" onClick={handleSave}>
                                <Save size={18} />
                                Ayarlari Kaydet
                            </button>
                            <button className="secondary-btn" onClick={resetDefaults}>
                                <RotateCcw size={16} /> Varsayilanlara Don
                            </button>
                        </div>

                        {savedMessage && <p className="success-msg animate-fade-in">{savedMessage}</p>}
                    </div>
                </div>

                <div className="profile-card glass-panel">
                    <div className="card-header">
                        <Shield className="card-icon" size={24} />
                        <h2>Hesap Durumu</h2>
                    </div>
                    <div className="account-info">
                        <div className="info-row">
                            <span className="info-label">Kullanıcı Tipi:</span>
                            <span className="info-value">Premium Anonim</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Veri Sağlayıcı:</span>
                            <span className="info-value">Yahoo Finance API</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Yerel Depolama:</span>
                            <span className="info-value">Aktif (Veriler tarayıcıda saklanır)</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Risk Profili:</span>
                            <span className="info-value">{riskProfile}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
