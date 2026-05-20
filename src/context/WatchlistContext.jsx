/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'bist_watchlist_symbols_v1';
const WatchlistContext = createContext();

const getInitialWatchlist = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export function WatchlistProvider({ children }) {
    const [watchlist, setWatchlist] = useState(() => getInitialWatchlist());

    const persist = (nextList) => {
        setWatchlist(nextList);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    };

    const toggleSymbol = (symbol) => {
        const normalized = symbol.replace('.IS', '').toUpperCase();
        const exists = watchlist.includes(normalized);
        if (exists) {
            persist(watchlist.filter((item) => item !== normalized));
            return;
        }
        persist([...watchlist, normalized]);
    };

    const isInWatchlist = (symbol) => watchlist.includes(symbol.replace('.IS', '').toUpperCase());

    return <WatchlistContext.Provider value={{ watchlist, toggleSymbol, isInWatchlist }}>{children}</WatchlistContext.Provider>;
}

export const useWatchlist = () => useContext(WatchlistContext);
