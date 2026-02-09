import React from 'react';
import { X, Filter } from 'lucide-react';
import Button from '../../ui/Button/Button';
import styles from './HistoryFilters.module.css';

/**
 * HistoryFilters - Filter controls for trade history
 * 
 * Features:
 * - Date range picker (from/to)
 * - Coin selector dropdown
 * - Buy/Sell type toggle
 * - Clear all filters button
 * 
 * @param {Object} filters - Current filter state
 * @param {Function} onFilterChange - Callback to update filters
 * @param {Function} onClear - Callback to clear all filters
 * @param {Array} coins - Available coins for dropdown
 * @param {boolean} hasActiveFilters - Whether any filter is active
 */
const HistoryFilters = ({
    filters,
    onFilterChange,
    onClear,
    coins = [],
    hasActiveFilters = false
}) => {
    return (
        <div className={styles.filterBar}>
            <div className={styles.filterIcon}>
                <Filter size={16} />
                <span>Filters</span>
            </div>

            {/* Date Range - From */}
            <div className={styles.filterGroup}>
                <label className={styles.label}>From</label>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={filters.fromDate || ''}
                    onChange={(e) => onFilterChange({ fromDate: e.target.value })}
                />
            </div>

            {/* Date Range - To */}
            <div className={styles.filterGroup}>
                <label className={styles.label}>To</label>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={filters.toDate || ''}
                    onChange={(e) => onFilterChange({ toDate: e.target.value })}
                />
            </div>

            {/* Coin Selector */}
            <div className={styles.filterGroup}>
                <label className={styles.label}>Asset</label>
                <select
                    className={styles.select}
                    value={filters.coin || 'all'}
                    onChange={(e) => onFilterChange({ coin: e.target.value })}
                >
                    <option value="all">All Assets</option>
                    {coins.map(coin => (
                        <option key={coin.id} value={coin.id}>
                            {coin.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Type Filter - Segmented Buttons */}
            <div className={styles.filterGroup}>
                <label className={styles.label}>Type</label>
                <div className={styles.typeButtons}>
                    <button
                        type="button"
                        className={`${styles.typeBtn} ${filters.type === 'all' ? styles.active : ''}`}
                        onClick={() => onFilterChange({ type: 'all' })}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`${styles.typeBtn} ${styles.buyBtn} ${filters.type === 'buy' ? styles.active : ''}`}
                        onClick={() => onFilterChange({ type: 'buy' })}
                    >
                        Buy
                    </button>
                    <button
                        type="button"
                        className={`${styles.typeBtn} ${styles.sellBtn} ${filters.type === 'sell' ? styles.active : ''}`}
                        onClick={() => onFilterChange({ type: 'sell' })}
                    >
                        Sell
                    </button>
                </div>
            </div>

            {/* Clear Button - Only show when filters are active */}
            {hasActiveFilters && (
                <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={onClear}
                    title="Clear all filters"
                >
                    <X size={14} />
                    <span>Clear</span>
                </button>
            )}
        </div>
    );
};

export default HistoryFilters;
