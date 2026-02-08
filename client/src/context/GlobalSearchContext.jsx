import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';

const GlobalSearchContext = createContext(null);

export const useGlobalSearch = () => {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
    }
    return context;
};

export const GlobalSearchProvider = ({ children }) => {
    // Modal state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data state
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);

    // Define these BEFORE any useEffect that uses them (fixes TDZ error)
    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
        setSearchQuery('');
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
    }, []);

    // Fetch coins data once on mount
    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
                setCoins(data);
            } catch (err) {
                console.error('Failed to fetch coins for search', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCoins();
    }, []);

    // Lock body scroll when modal is open
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

    // Note: Hotkey '/' is now handled by KeyboardShortcutContext for centralized management

    // Filter coins based on search query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            // Return top 8 coins when query is empty (popular assets)
            return coins.slice(0, 8);
        }

        const query = searchQuery.toLowerCase().trim();
        return coins.filter(coin =>
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
        coins
    };

    return (
        <GlobalSearchContext.Provider value={value}>
            {children}
        </GlobalSearchContext.Provider>
    );
};

export default GlobalSearchContext;
