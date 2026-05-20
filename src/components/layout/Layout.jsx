import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Sun, Moon, Search, Menu, X, ScanSearch, Settings2, Briefcase, GitCompare, Grid3x3 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';
import { BIST_STOCKS } from '../../constants/stocks';
import StockLogo from '../ui/StockLogo';
import AppLogo from '../ui/AppLogo';

const Layout = ({ children }) => {
    const { theme, toggleTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const navigate = useNavigate();

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const filteredStocks = searchQuery.trim()
        ? BIST_STOCKS.filter(s =>
            s.symbol.includes(searchQuery.toUpperCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 8)
        : [];

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            const match = filteredStocks[0] || BIST_STOCKS.find(s => s.symbol === searchQuery.trim().toUpperCase());
            if (match) {
                navigate(`/stock/${match.symbol}`);
                setSearchQuery('');
                setShowResults(false);
            }
        }
    };

    const handleSelectStock = (symbol) => {
        navigate(`/stock/${symbol}`);
        setSearchQuery('');
        setShowResults(false);
    };

    const navItems = [
        { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/screener', name: 'Screener', icon: <ScanSearch size={20} /> },
        { path: '/portfoy', name: 'Portföy', icon: <Briefcase size={20} /> },
        { path: '/karsilastirma', name: 'Karşılaştır', icon: <GitCompare size={20} /> },
        { path: '/korelasyon', name: 'Korelasyon', icon: <Grid3x3 size={20} /> },
        { path: '/strateji', name: 'Strateji', icon: <Settings2 size={20} /> },
    ];

    return (
        <div className="app-container" onClick={() => { setShowResults(false); setIsMobileMenuOpen(false); }}>
            {isMobileMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
            )}
            <div className="mobile-header glass-panel">
                <div className="logo">
                    <AppLogo size={32} />
                    <span className="logo-text">BIST Analytics</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleMobileMenu(); }} className="mobile-menu-btn">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="sidebar-header">
                    <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <AppLogo size={40} />
                        <span className="logo-text">BIST Analytics</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-name">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle-btn" onClick={toggleTheme}>
                        {theme === 'dark' ? (
                            <><Sun size={20} /> <span className="toggle-text">Light Mode</span></>
                        ) : (
                            <><Moon size={20} /> <span className="toggle-text">Dark Mode</span></>
                        )}
                    </button>
                </div>
            </aside>

            <main className="main-content animate-fade-in">
                <header className="topbar">
                    <div className="search-container glass-panel" onClick={(e) => e.stopPropagation()}>
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Hisse ara (Örn: THYAO)..."
                            className="search-input"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            onKeyDown={handleSearch}
                        />

                        {showResults && filteredStocks.length > 0 && (
                            <div className="search-results-dropdown glass-panel animate-slide-down">
                                {filteredStocks.map(stock => (
                                    <div
                                        key={stock.symbol}
                                        className="search-result-item"
                                        onMouseDown={() => handleSelectStock(stock.symbol)}
                                    >
                                        <StockLogo
                                            symbol={stock.symbol}
                                            name={stock.name}
                                            alt={stock.symbol}
                                            className="search-result-logo"
                                        />
                                        <div className="search-result-info">
                                            <span className="search-result-symbol">{stock.symbol}</span>
                                            <span className="search-result-name text-muted">{stock.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showResults && searchQuery.trim() && filteredStocks.length === 0 && (
                            <div className="search-results-dropdown glass-panel animate-slide-down">
                                <div className="search-empty">
                                    <strong>Sonuc bulunamadi</strong>
                                    <span className="text-muted">Sembol (THYAO) veya sirket adi ile tekrar ara.</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="command-hint glass-panel">
                        <span>Hizli Islem:</span>
                        <strong>Arama + Enter</strong>
                    </div>
                </header>

                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
