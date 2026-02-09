import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for managing trade history filters with client-side filtering
 * 
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Filter state, setters, and filtered data
 */
export const useHistoryFilters = (transactions = []) => {
    const [filters, setFiltersState] = useState({
        fromDate: '',
        toDate: '',
        coin: 'all',
        type: 'all', // 'all' | 'buy' | 'sell'
    });

    // Update individual filter fields
    const setFilters = useCallback((updates) => {
        setFiltersState(prev => ({ ...prev, ...updates }));
    }, []);

    // Reset all filters
    const clearFilters = useCallback(() => {
        setFiltersState({
            fromDate: '',
            toDate: '',
            coin: 'all',
            type: 'all',
        });
    }, []);

    // Apply filters to transactions
    const filteredData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        return transactions.filter(tx => {
            // Date range filter (from)
            if (filters.fromDate) {
                const txDate = new Date(tx.timestamp);
                const fromDate = new Date(filters.fromDate);
                if (txDate < fromDate) return false;
            }

            // Date range filter (to) - include full day
            if (filters.toDate) {
                const txDate = new Date(tx.timestamp);
                const toDate = new Date(filters.toDate + 'T23:59:59');
                if (txDate > toDate) return false;
            }

            // Coin filter
            if (filters.coin !== 'all') {
                if (tx.coinId !== filters.coin) return false;
            }

            // Type filter (buy/sell)
            if (filters.type !== 'all') {
                if (tx.type !== filters.type) return false;
            }

            return true;
        });
    }, [transactions, filters]);

    // Check if any filter is active
    const hasActiveFilters = useMemo(() => {
        return filters.fromDate ||
            filters.toDate ||
            filters.coin !== 'all' ||
            filters.type !== 'all';
    }, [filters]);

    // Get unique coins from transactions for dropdown
    const uniqueCoins = useMemo(() => {
        if (!transactions) return [];

        const coinMap = new Map();
        transactions.forEach(tx => {
            if (!coinMap.has(tx.coinId)) {
                coinMap.set(tx.coinId, {
                    id: tx.coinId,
                    name: tx.coinName || tx.coinId
                });
            }
        });

        return Array.from(coinMap.values());
    }, [transactions]);

    return {
        filters,
        setFilters,
        clearFilters,
        filteredData,
        hasActiveFilters,
        uniqueCoins
    };
};

export default useHistoryFilters;
