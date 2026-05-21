import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchMarkets,
    getCachedMarkets,
    abortMarketsFetch,
} from '../services/marketService';
import { logLoadingFinished } from '../utils/requestLog';
import { DEFAULT_TIMEOUT_MS } from '../utils/safeRequest';

const LABEL = 'useMarketsData';
const UI_MAX_WAIT_MS = DEFAULT_TIMEOUT_MS + 500;

/**
 * Markets hook — always has displayable data (cache/fallback), never blocks forever.
 */
export function useMarketsData({ immediate = true } = {}) {
    const [coins, setCoins] = useState(() => getCachedMarkets());
    const [loading, setLoading] = useState(immediate);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [isFallback, setIsFallback] = useState(false);
    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);

    const finishLoading = useCallback((requestId) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setLoading(false);
        setIsRefreshing(false);
        logLoadingFinished(LABEL, { requestId });
    }, []);

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current;
        if (force) setIsRefreshing(true);
        else setLoading(true);
        setError(null);

        const safety = setTimeout(() => finishLoading(requestId), UI_MAX_WAIT_MS);

        try {
            const result = await fetchMarkets({ force });
            if (!mountedRef.current || requestId !== requestIdRef.current) return;

            const nextCoins = result.coins?.length ? result.coins : getCachedMarkets();
            setCoins(nextCoins);
            setIsFallback(Boolean(result.isFallback));
            if (result.error) {
                setError(
                    result.error?.userMessage ||
                        result.error?.message ||
                        'Using cached market data'
                );
            }
        } catch (err) {
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            if (err?.message === 'Aborted') return;
            setError(err?.userMessage || err?.message || 'Failed to load market data');
            setCoins(getCachedMarkets());
            setIsFallback(true);
        } finally {
            clearTimeout(safety);
            finishLoading(requestId);
        }
    }, [finishLoading]);

    useEffect(() => {
        mountedRef.current = true;
        if (!immediate) {
            return () => {
                mountedRef.current = false;
                abortMarketsFetch();
            };
        }

        load();

        return () => {
            mountedRef.current = false;
            requestIdRef.current += 1;
            abortMarketsFetch();
        };
    }, [immediate, load]);

    return {
        coins,
        loading: loading && coins.length === 0,
        isRefreshing,
        error,
        isFallback,
        reload: () => load(true),
    };
}

export default useMarketsData;
