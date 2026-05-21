import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchMarkets, getCachedMarkets } from '../services/marketService';
import { logLoadingFinished } from '../utils/requestLog';

const LABEL = 'global-search';
const GlobalSearchContext = createContext(null);

export const useGlobalSearch = () => {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
    }
    return context;
};

export const GlobalSearchProvider = ({ children }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [coins, setCoins] = useState(() => getCachedMarkets());
    const [loading, setLoading] = useState(false);
    const mountedRef = useRef(true);

    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
        setSearchQuery('');
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        let cancelled = false;

        const refresh = async () => {
            try {
                const result = await fetchMarkets();
                if (!cancelled && mountedRef.current) {
                    setCoins(result.coins?.length ? result.coins : getCachedMarkets());
                }
            } catch (err) {
                if (!cancelled && mountedRef.current) {
                    setCoins(getCachedMarkets());
                }
            } finally {
                if (!cancelled && mountedRef.current) {
                    setLoading(false);
                    logLoadingFinished(LABEL);
                }
            }
        };

        refresh();

        return () => {
            cancelled = true;
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (isSearchOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSearchOpen]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return coins.slice(0, 8);
        }
        const query = searchQuery.toLowerCase().trim();
        return coins.filter(
            (coin) =>
                coin.name.toLowerCase().includes(query) ||
                coin.symbol.toLowerCase().includes(query)
        );
    }, [coins, searchQuery]);

    const value = {
        isSearchOpen,
        openSearch,
        closeSearch,
        searchQuery,
        setSearchQuery,
        searchResults,
        loading,
        coins,
    };

    return (
        <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>
    );
};

export default GlobalSearchContext;
