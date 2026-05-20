import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WatchlistProvider } from './context/WatchlistContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Screener from './pages/Screener';
import Strateji from './pages/Strateji';
import Portfoy from './pages/Portfoy';
import Karsilastirma from './pages/Karsilastirma';
import Korelasyon from './pages/Korelasyon';

function App() {
  return (
    <ThemeProvider>
      <WatchlistProvider>
        <ErrorBoundary>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/screener" element={<Screener />} />
                <Route path="/strateji" element={<Strateji />} />
                <Route path="/portfoy" element={<Portfoy />} />
                <Route path="/karsilastirma" element={<Karsilastirma />} />
                <Route path="/korelasyon" element={<Korelasyon />} />
                <Route path="/stock/:symbol" element={<StockDetail />} />
              </Routes>
            </Layout>
          </Router>
        </ErrorBoundary>
      </WatchlistProvider>
    </ThemeProvider>
  );
}

export default App;
