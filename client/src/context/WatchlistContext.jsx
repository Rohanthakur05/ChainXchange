import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const WatchlistContext = createContext(null);

export const WatchlistProvider = ({ children }) => {
    const [watchlists, setWatchlists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all watchlists on mount
    const fetchWatchlists = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/watchlist');
            const data = response.data?.watchlists || response.data || [];
            setWatchlists(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch watchlists:', err);
            setError(err.message);
            // Don't clear watchlists on error to preserve cached data
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWatchlists();
    }, [fetchWatchlists]);

    // Create a new watchlist
    const createWatchlist = useCallback(async (name, initialCoinId = null) => {
        // Optimistic: create temp watchlist
        const tempId = `temp-${Date.now()}`;
        const optimisticWatchlist = {
            _id: tempId,
            name,
            coins: initialCoinId ? [initialCoinId] : [],
            createdAt: new Date().toISOString()
        };

        setWatchlists(prev => [...prev, optimisticWatchlist]);

        try {
            const response = await api.post('/watchlist', { name });
            const newWatchlist = response.data?.watchlist || response.data;

            // If there's an initial coin, add it
            if (initialCoinId && newWatchlist._id) {
                await api.post(`/watchlist/${newWatchlist._id}/coins`, { coinId: initialCoinId });
                newWatchlist.coins = [initialCoinId];
            }

            // Replace temp with real
            setWatchlists(prev =>
                prev.map(w => w._id === tempId ? newWatchlist : w)
            );

            return { success: true, watchlist: newWatchlist };
        } catch (err) {
            // Rollback
            setWatchlists(prev => prev.filter(w => w._id !== tempId));
            console.error('Failed to create watchlist:', err);
            return { success: false, error: err.response?.data?.message || 'Failed to create watchlist' };
        }
    }, []);

    // Add coin to a watchlist
    const addCoinToWatchlist = useCallback(async (watchlistId, coinId) => {
        // Optimistic update
        setWatchlists(prev =>
            prev.map(w => {
                if (w._id === watchlistId && !w.coins.includes(coinId)) {
                    return { ...w, coins: [...w.coins, coinId] };
                }
                return w;
            })
        );

        try {
            await api.post(`/watchlist/${watchlistId}/coins`, { coinId });
            return { success: true };
        } catch (err) {
            // Rollback
            setWatchlists(prev =>
                prev.map(w => {
                    if (w._id === watchlistId) {
                        return { ...w, coins: w.coins.filter(c => c !== coinId) };
                    }
                    return w;
                })
            );
            console.error('Failed to add coin:', err);
            return { success: false, error: err.response?.data?.message || 'Failed to add coin' };
        }
    }, []);

    // Remove coin from a watchlist
    const removeCoinFromWatchlist = useCallback(async (watchlistId, coinId) => {
        // Store original for rollback
        const originalWatchlists = watchlists;

        // Optimistic update
        setWatchlists(prev =>
            prev.map(w => {
                if (w._id === watchlistId) {
                    return { ...w, coins: w.coins.filter(c => c !== coinId) };
                }
                return w;
            })
        );

        try {
            await api.delete(`/watchlist/${watchlistId}/coins/${coinId}`);
            return { success: true };
        } catch (err) {
            // Rollback
            setWatchlists(originalWatchlists);
            console.error('Failed to remove coin:', err);
            return { success: false, error: err.response?.data?.message || 'Failed to remove coin' };
        }
    }, [watchlists]);

    // Delete a watchlist
    const deleteWatchlist = useCallback(async (watchlistId) => {
        const originalWatchlists = watchlists;

        setWatchlists(prev => prev.filter(w => w._id !== watchlistId));

        try {
            await api.delete(`/watchlist/${watchlistId}`);
            return { success: true };
        } catch (err) {
            setWatchlists(originalWatchlists);
            console.error('Failed to delete watchlist:', err);
            return { success: false, error: err.response?.data?.message || 'Failed to delete watchlist' };
        }
    }, [watchlists]);

    // Check if a coin is in a specific watchlist
    const isCoinInWatchlist = useCallback((coinId, watchlistId = null) => {
        if (watchlistId) {
            const watchlist = watchlists.find(w => w._id === watchlistId);
            return watchlist?.coins?.includes(coinId) || false;
        }
        // Check if coin is in ANY watchlist
        return watchlists.some(w => w.coins?.includes(coinId));
    }, [watchlists]);

    // Get all watchlists that contain a specific coin
    const getCoinWatchlists = useCallback((coinId) => {
        return watchlists.filter(w => w.coins?.includes(coinId));
    }, [watchlists]);

    const value = {
        watchlists,
        loading,
        error,
        fetchWatchlists,
        createWatchlist,
        addCoinToWatchlist,
        removeCoinFromWatchlist,
        deleteWatchlist,
        isCoinInWatchlist,
        getCoinWatchlists
    };

    return (
        <WatchlistContext.Provider value={value}>
            {children}
        </WatchlistContext.Provider>
    );
};

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (!context) {
        throw new Error('useWatchlist must be used within a WatchlistProvider');
    }
    return context;
};

export default WatchlistContext;
