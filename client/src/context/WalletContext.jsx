import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

/**
 * WalletContext - Global state management for user wallet
 * 
 * Provides:
 * - Single source of truth for wallet balance
 * - Optimistic updates after trades
 * - Re-sync capability from server
 * - Holdings data cached per-coin
 */
const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(0);
    const [holdings, setHoldings] = useState({});  // { coinId: { quantity, averageBuyPrice, ... } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch wallet and holdings from server
    const syncWallet = useCallback(async () => {
        console.log('[WalletContext] Starting sync...');
        try {
            setError(null);
            setLoading(true);

            const [profileRes, portfolioRes] = await Promise.all([
                api.get('/auth/profile'),
                api.get('/crypto/portfolio').catch((err) => {
                    console.warn('[WalletContext] Portfolio fetch failed:', err.message);
                    return { data: { holdings: [] } };
                })
            ]);

            // Debug: Log the exact response structure
            console.log('[WalletContext] Profile response:', profileRes.data);
            console.log('[WalletContext] User object:', profileRes.data?.user);
            console.log('[WalletContext] Wallet value:', profileRes.data?.user?.wallet);

            // Extract wallet - ensure it's a number
            const walletValue = profileRes.data?.user?.wallet;
            const parsedWallet = typeof walletValue === 'number' ? walletValue : Number(walletValue) || 0;

            console.log('[WalletContext] Setting wallet to:', parsedWallet);
            setWallet(parsedWallet);

            // Convert holdings array to map for easy lookup
            const holdingsMap = {};
            const holdingsArray = portfolioRes.data?.holdings || [];
            holdingsArray.forEach(h => {
                if (h.coinId) {
                    holdingsMap[h.coinId] = h;
                }
            });
            setHoldings(holdingsMap);
            console.log('[WalletContext] Sync complete. Wallet:', parsedWallet, 'Holdings:', Object.keys(holdingsMap).length);
        } catch (err) {
            console.error('[WalletContext] Sync failed:', err);
            console.error('[WalletContext] Error details:', err.response?.data);
            setError(err.response?.data?.error || 'Failed to load wallet');
        } finally {
            setLoading(false);
        }
    }, []);

    // Optimistic update after buy
    const executeBuy = useCallback((coinId, quantity, totalCost) => {
        // Deduct from wallet
        setWallet(prev => prev - totalCost);

        // Add to holdings
        setHoldings(prev => ({
            ...prev,
            [coinId]: {
                ...prev[coinId],
                quantity: (prev[coinId]?.quantity || 0) + quantity
            }
        }));
    }, []);

    // Optimistic update after sell
    const executeSell = useCallback((coinId, quantity, totalEarnings) => {
        // Credit to wallet
        setWallet(prev => prev + totalEarnings);

        // Reduce holdings
        setHoldings(prev => {
            const updated = { ...prev };
            const current = updated[coinId]?.quantity || 0;
            const remaining = current - quantity;

            if (remaining <= 0) {
                delete updated[coinId];
            } else {
                updated[coinId] = {
                    ...updated[coinId],
                    quantity: remaining
                };
            }
            return updated;
        });
    }, []);

    // Get holdings for specific coin
    const getCoinHoldings = useCallback((coinId) => {
        return holdings[coinId] || null;
    }, [holdings]);

    // Initial sync on mount
    useEffect(() => {
        syncWallet();
    }, [syncWallet]);

    const value = {
        wallet,
        holdings,
        loading,
        error,
        syncWallet,
        executeBuy,
        executeSell,
        getCoinHoldings
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

// Custom hook for using wallet context
export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

export default WalletContext;
