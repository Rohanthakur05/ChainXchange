import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CompareContext = createContext(null);

const MAX_COINS = 4;
const STORAGE_KEY = 'chainx_compare_coins';

/**
 * CompareProvider - Manages coin comparison state
 * 
 * Features:
 * - Select 2-4 coins for comparison
 * - Fetch comparison data from CoinGecko
 * - Cache results for performance
 * - Persist selection to localStorage
 */
export const CompareProvider = ({ children }) => {
    const [selectedCoinIds, setSelectedCoinIds] = useState([]);
    const [coinData, setCoinData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Load persisted selection on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length <= MAX_COINS) {
                    setSelectedCoinIds(parsed);
                }
            }
        } catch (err) {
            console.warn('Failed to load comparison coins:', err);
        }
    }, []);

    // Persist selection changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCoinIds));
    }, [selectedCoinIds]);

    // Fetch coin data when selection changes
    useEffect(() => {
        if (selectedCoinIds.length === 0) {
            setCoinData({});
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${selectedCoinIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch coin data');
                }

                const data = await response.json();

                const dataMap = {};
                data.forEach(coin => {
                    dataMap[coin.id] = {
                        id: coin.id,
                        name: coin.name,
                        symbol: coin.symbol,
                        image: coin.image,
                        current_price: coin.current_price,
                        market_cap: coin.market_cap,
                        total_volume: coin.total_volume,
                        circulating_supply: coin.circulating_supply,
                        total_supply: coin.total_supply,
                        max_supply: coin.max_supply,
                        price_change_24h: coin.price_change_percentage_24h,
                        price_change_7d: coin.price_change_percentage_7d_in_currency,
                        market_cap_rank: coin.market_cap_rank,
                    };
                });

                setCoinData(dataMap);
            } catch (err) {
                console.error('Error fetching comparison data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedCoinIds]);

    /**
     * Add a coin to comparison
     */
    const addCoin = useCallback((coinId) => {
        setSelectedCoinIds(prev => {
            if (prev.includes(coinId) || prev.length >= MAX_COINS) {
                return prev;
            }
            return [...prev, coinId];
        });
    }, []);

    /**
     * Remove a coin from comparison
     */
    const removeCoin = useCallback((coinId) => {
        setSelectedCoinIds(prev => prev.filter(id => id !== coinId));
    }, []);

    /**
     * Toggle a coin in comparison
     */
    const toggleCoin = useCallback((coinId) => {
        setSelectedCoinIds(prev => {
            if (prev.includes(coinId)) {
                return prev.filter(id => id !== coinId);
            }
            if (prev.length >= MAX_COINS) {
                return prev;
            }
            return [...prev, coinId];
        });
    }, []);

    /**
     * Clear all selected coins
     */
    const clearAll = useCallback(() => {
        setSelectedCoinIds([]);
        setCoinData({});
    }, []);

    /**
     * Check if a coin is selected
     */
    const isSelected = useCallback((coinId) => {
        return selectedCoinIds.includes(coinId);
    }, [selectedCoinIds]);

    /**
     * Open comparison modal
     */
    const openCompare = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    /**
     * Close comparison modal
     */
    const closeCompare = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const value = {
        // State
        selectedCoinIds,
        coinData,
        loading,
        error,
        isModalOpen,
        maxCoins: MAX_COINS,

        // Actions
        addCoin,
        removeCoin,
        toggleCoin,
        clearAll,
        isSelected,
        openCompare,
        closeCompare,
    };

    return (
        <CompareContext.Provider value={value}>
            {children}
        </CompareContext.Provider>
    );
};

export const useCompare = () => {
    const context = useContext(CompareContext);
    if (!context) {
        throw new Error('useCompare must be used within CompareProvider');
    }
    return context;
};

export default CompareContext;
