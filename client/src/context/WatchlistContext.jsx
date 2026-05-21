import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { safeGet, DEFAULT_TIMEOUT_MS } from '../utils/safeRequest';
import {
    logRequestStart,
    logRequestSuccess,
    logRequestFailed,
    logLoadingFinished,
} from '../utils/requestLog';

const LABEL = 'watchlist';

const WatchlistContext = createContext(null);

export const WatchlistProvider = ({ children }) => {
    const [watchlists, setWatchlists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    const fetchIdRef = useRef(0);

    const fetchWatchlists = useCallback(async () => {
        const fetchId = ++fetchIdRef.current;
        logRequestStart(LABEL);
        setLoading(true);

        const safety = setTimeout(() => {
            if (mountedRef.current && fetchId === fetchIdRef.current) {
                setLoading(false);
                logLoadingFinished(LABEL, { reason: 'safety-timeout' });
            }
        }, DEFAULT_TIMEOUT_MS + 500);

        try {
            const response = await safeGet(api, '/watchlist', {
                timeoutMs: DEFAULT_TIMEOUT_MS,
                label: LABEL,
            });
            if (!mountedRef.current || fetchId !== fetchIdRef.current) return;

            const data = response.data?.watchlists || response.data || [];
            setWatchlists(Array.isArray(data) ? data : []);
            setError(null);
            logRequestSuccess(LABEL, { count: Array.isArray(data) ? data.length : 0 });
        } catch (err) {
            if (!mountedRef.current || fetchId !== fetchIdRef.current) return;
            logRequestFailed(LABEL, err);
            setError(err.message || 'Failed to load watchlists');
        } finally {
            clearTimeout(safety);
            if (mountedRef.current && fetchId === fetchIdRef.current) {
                setLoading(false);
                logLoadingFinished(LABEL);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        fetchWatchlists();
        return () => {
            mountedRef.current = false;
            fetchIdRef.current += 1;
        };
    }, [fetchWatchlists]);

    const createWatchlist = useCallback(async (name, initialCoinId = null) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticWatchlist = {
            _id: tempId,
            name,
            coins: initialCoinId ? [initialCoinId] : [],
            createdAt: new Date().toISOString(),
        };

        setWatchlists((prev) => [...prev, optimisticWatchlist]);

        try {
            const response = await api.post('/watchlist', { name });
            const newWatchlist = response.data?.watchlist || response.data;

            if (initialCoinId && newWatchlist._id) {
                await api.post(`/watchlist/${newWatchlist._id}/coins`, { coinId: initialCoinId });
                newWatchlist.coins = [initialCoinId];
            }

            setWatchlists((prev) => prev.map((w) => (w._id === tempId ? newWatchlist : w)));
            return { success: true, watchlist: newWatchlist };
        } catch (err) {
            setWatchlists((prev) => prev.filter((w) => w._id !== tempId));
            console.error('Failed to create watchlist:', err);
            return {
                success: false,
                error: err.response?.data?.message || 'Failed to create watchlist',
            };
        }
    }, []);

    const addCoinToWatchlist = useCallback(async (watchlistId, coinId) => {
        setWatchlists((prev) =>
            prev.map((w) => {
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
            setWatchlists((prev) =>
                prev.map((w) => {
                    if (w._id === watchlistId) {
                        return { ...w, coins: w.coins.filter((c) => c !== coinId) };
                    }
                    return w;
                })
            );
            return { success: false, error: err.response?.data?.message || 'Failed to add coin' };
        }
    }, []);

    const removeCoinFromWatchlist = useCallback(async (watchlistId, coinId) => {
        const originalWatchlists = watchlists;

        setWatchlists((prev) =>
            prev.map((w) => {
                if (w._id === watchlistId) {
                    return { ...w, coins: w.coins.filter((c) => c !== coinId) };
                }
                return w;
            })
        );

        try {
            await api.delete(`/watchlist/${watchlistId}/coins/${coinId}`);
            return { success: true };
        } catch (err) {
            setWatchlists(originalWatchlists);
            return { success: false, error: err.response?.data?.message || 'Failed to remove coin' };
        }
    }, [watchlists]);

    const deleteWatchlist = useCallback(async (watchlistId) => {
        const originalWatchlists = watchlists;
        setWatchlists((prev) => prev.filter((w) => w._id !== watchlistId));

        try {
            await api.delete(`/watchlist/${watchlistId}`);
            return { success: true };
        } catch (err) {
            setWatchlists(originalWatchlists);
            return { success: false, error: err.response?.data?.message || 'Failed to delete watchlist' };
        }
    }, [watchlists]);

    const isCoinInWatchlist = useCallback(
        (coinId, watchlistId = null) => {
            if (watchlistId) {
                const watchlist = watchlists.find((w) => w._id === watchlistId);
                return watchlist?.coins?.includes(coinId) || false;
            }
            return watchlists.some((w) => w.coins?.includes(coinId));
        },
        [watchlists]
    );

    const getCoinWatchlists = useCallback(
        (coinId) => watchlists.filter((w) => w.coins?.includes(coinId)),
        [watchlists]
    );

    return (
        <WatchlistContext.Provider
            value={{
                watchlists,
                loading,
                error,
                fetchWatchlists,
                createWatchlist,
                addCoinToWatchlist,
                removeCoinFromWatchlist,
                deleteWatchlist,
                isCoinInWatchlist,
                getCoinWatchlists,
            }}
        >
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
