import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import styles from './CoinSelector.module.css';

/**
 * CoinSelector - Search and select coins for comparison
 * 
 * Features:
 * - Search coins by name/symbol
 * - Show selected coins as chips
 * - Enforce max selection limit
 * - Fetch search results from CoinGecko
 */
const CoinSelector = ({ onClose }) => {
    const { selectedCoinIds, coinData, addCoin, removeCoin, maxCoins } = useCompare();
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
                );
                const data = await response.json();

                // Filter to top 10 results, exclude already selected
                const filtered = (data.coins || [])
                    .filter(c => !selectedCoinIds.includes(c.id))
                    .slice(0, 10);

                setSearchResults(filtered);
            } catch (err) {
                console.error('Search failed:', err);
                setSearchResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, selectedCoinIds]);

    const handleSelect = (coin) => {
        if (selectedCoinIds.length < maxCoins) {
            addCoin(coin.id);
            setQuery('');
            setSearchResults([]);
        }
    };

    const canAddMore = selectedCoinIds.length < maxCoins;

    return (
        <div className={styles.container}>
            {/* Selected coins chips */}
            {selectedCoinIds.length > 0 && (
                <div className={styles.chips}>
                    {selectedCoinIds.map(coinId => {
                        const coin = coinData[coinId];
                        return (
                            <div key={coinId} className={styles.chip}>
                                {coin?.image && (
                                    <img src={coin.image} alt="" className={styles.chipImage} />
                                )}
                                <span>{coin?.symbol?.toUpperCase() || coinId}</span>
                                <button
                                    className={styles.chipRemove}
                                    onClick={() => removeCoin(coinId)}
                                    aria-label={`Remove ${coinId}`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search input */}
            {canAddMore && (
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder={`Add coin to compare (${selectedCoinIds.length}/${maxCoins})`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {loading && <span className={styles.spinner} />}
                </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
                <div className={styles.results}>
                    {searchResults.map(coin => (
                        <button
                            key={coin.id}
                            className={styles.resultItem}
                            onClick={() => handleSelect(coin)}
                        >
                            <img
                                src={coin.thumb}
                                alt={coin.name}
                                className={styles.resultImage}
                            />
                            <span className={styles.resultName}>{coin.name}</span>
                            <span className={styles.resultSymbol}>{coin.symbol}</span>
                            <Plus size={16} className={styles.addIcon} />
                        </button>
                    ))}
                </div>
            )}

            {/* Limit reached message */}
            {!canAddMore && (
                <div className={styles.limitMessage}>
                    Maximum {maxCoins} coins reached
                </div>
            )}
        </div>
    );
};

export default CoinSelector;
