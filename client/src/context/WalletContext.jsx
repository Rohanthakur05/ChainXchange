import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../utils/api';
import { safeGet, DEFAULT_TIMEOUT_MS } from '../utils/safeRequest';
import {
    logRequestStart,
    logRequestSuccess,
    logRequestFailed,
    logLoadingFinished,
} from '../utils/requestLog';

const LABEL = 'wallet';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(0);
    const [holdings, setHoldings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    const syncIdRef = useRef(0);

    const syncWallet = useCallback(async () => {
        const syncId = ++syncIdRef.current;
        logRequestStart(LABEL);
        setError(null);
        setLoading(true);

        const safety = setTimeout(() => {
            if (mountedRef.current && syncId === syncIdRef.current) {
                setLoading(false);
                logLoadingFinished(LABEL, { reason: 'safety-timeout' });
            }
        }, DEFAULT_TIMEOUT_MS + 500);

        try {
            const [profileRes, portfolioRes] = await Promise.all([
                safeGet(api, '/auth/profile', { timeoutMs: DEFAULT_TIMEOUT_MS, label: `${LABEL}/profile` }),
                safeGet(api, '/crypto/portfolio', { timeoutMs: DEFAULT_TIMEOUT_MS, label: `${LABEL}/portfolio` }).catch(
                    (err) => {
                        logRequestFailed(`${LABEL}/portfolio`, err);
                        return { data: { holdings: [] } };
                    }
                ),
            ]);

            if (!mountedRef.current || syncId !== syncIdRef.current) return;

            const walletValue = profileRes.data?.user?.wallet;
            const parsedWallet =
                typeof walletValue === 'number' ? walletValue : Number(walletValue) || 0;

            setWallet(parsedWallet);

            const holdingsMap = {};
            (portfolioRes.data?.holdings || []).forEach((h) => {
                if (h.coinId) holdingsMap[h.coinId] = h;
            });
            setHoldings(holdingsMap);
            logRequestSuccess(LABEL, {
                wallet: parsedWallet,
                holdings: Object.keys(holdingsMap).length,
            });
        } catch (err) {
            if (!mountedRef.current || syncId !== syncIdRef.current) return;
            logRequestFailed(LABEL, err);
            setError(err?.userMessage || err?.response?.data?.error || 'Failed to load wallet');
        } finally {
            clearTimeout(safety);
            if (mountedRef.current && syncId === syncIdRef.current) {
                setLoading(false);
                logLoadingFinished(LABEL);
            }
        }
    }, []);

    const executeBuy = useCallback((coinId, quantity, totalCost) => {
        setWallet((prev) => prev - totalCost);
        setHoldings((prev) => ({
            ...prev,
            [coinId]: {
                ...prev[coinId],
                quantity: (prev[coinId]?.quantity || 0) + quantity,
            },
        }));
    }, []);

    const executeSell = useCallback((coinId, quantity, totalEarnings) => {
        setWallet((prev) => prev + totalEarnings);
        setHoldings((prev) => {
            const updated = { ...prev };
            const remaining = (updated[coinId]?.quantity || 0) - quantity;
            if (remaining <= 0) delete updated[coinId];
            else updated[coinId] = { ...updated[coinId], quantity: remaining };
            return updated;
        });
    }, []);

    const getCoinHoldings = useCallback(
        (coinId) => holdings[coinId] || null,
        [holdings]
    );

    useEffect(() => {
        mountedRef.current = true;
        syncWallet();
        return () => {
            mountedRef.current = false;
            syncIdRef.current += 1;
        };
    }, [syncWallet]);

    const value = {
        wallet,
        holdings,
        loading,
        error,
        syncWallet,
        executeBuy,
        executeSell,
        getCoinHoldings,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

export default WalletContext;
