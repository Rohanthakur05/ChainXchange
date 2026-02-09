import React from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { useNavigate } from 'react-router-dom';
import styles from './CompareTable.module.css';

/**
 * CompareTable - Side-by-side coin comparison display
 * 
 * Features:
 * - Displays metrics for 2-4 coins
 * - Highlights best/worst values
 * - Responsive card layout on mobile
 * - Links to coin detail pages
 */
const CompareTable = () => {
    const { selectedCoinIds, coinData, loading, removeCoin } = useCompare();
    const navigate = useNavigate();

    if (selectedCoinIds.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No coins selected</p>
                <span>Add coins from the Markets page to compare</span>
            </div>
        );
    }

    if (loading) {
        return <div className={styles.loading}>Loading comparison data...</div>;
    }

    // Get ordered coin data
    const coins = selectedCoinIds
        .map(id => coinData[id])
        .filter(Boolean);

    if (coins.length === 0) {
        return <div className={styles.loading}>Loading comparison data...</div>;
    }

    // Metrics configuration
    const metrics = [
        { key: 'current_price', label: 'Price', format: formatPrice, highlight: 'none' },
        { key: 'market_cap', label: 'Market Cap', format: formatLargeNumber, highlight: 'high' },
        { key: 'total_volume', label: '24h Volume', format: formatLargeNumber, highlight: 'high' },
        { key: 'circulating_supply', label: 'Circulating Supply', format: formatSupply, highlight: 'none' },
        { key: 'total_supply', label: 'Total Supply', format: formatSupply, highlight: 'none' },
        { key: 'max_supply', label: 'Max Supply', format: formatSupply, highlight: 'none' },
        { key: 'price_change_24h', label: '24h Change', format: formatPercent, highlight: 'high' },
        { key: 'price_change_7d', label: '7d Change', format: formatPercent, highlight: 'high' },
    ];

    // Find best/worst values for highlighting
    const getBestWorst = (key, highlightType) => {
        if (highlightType === 'none') return { best: null, worst: null };

        const values = coins
            .map(c => ({ id: c.id, value: c[key] }))
            .filter(v => v.value !== null && v.value !== undefined);

        if (values.length < 2) return { best: null, worst: null };

        const sorted = [...values].sort((a, b) => b.value - a.value);
        return {
            best: sorted[0].id,
            worst: sorted[sorted.length - 1].id
        };
    };

    return (
        <div className={styles.container}>
            {/* Header with coin cards */}
            <div className={styles.header}>
                <div className={styles.metricLabel}></div>
                {coins.map(coin => (
                    <div key={coin.id} className={styles.coinHeader}>
                        <button
                            className={styles.removeBtn}
                            onClick={() => removeCoin(coin.id)}
                            aria-label={`Remove ${coin.name}`}
                        >
                            <X size={14} />
                        </button>
                        <img src={coin.image} alt={coin.name} className={styles.coinImage} />
                        <div className={styles.coinName}>{coin.name}</div>
                        <div className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</div>
                        <button
                            className={styles.viewBtn}
                            onClick={() => navigate(`/markets/${coin.id}`)}
                        >
                            <ExternalLink size={12} />
                            View
                        </button>
                    </div>
                ))}
            </div>

            {/* Metrics rows */}
            <div className={styles.metricsGrid}>
                {metrics.map(metric => {
                    const { best, worst } = getBestWorst(metric.key, metric.highlight);

                    return (
                        <div key={metric.key} className={styles.metricRow}>
                            <div className={styles.metricLabel}>{metric.label}</div>
                            {coins.map(coin => {
                                const value = coin[metric.key];
                                const isBest = coin.id === best;
                                const isWorst = coin.id === worst;

                                return (
                                    <div
                                        key={coin.id}
                                        className={`${styles.metricValue} ${isBest ? styles.best : ''} ${isWorst ? styles.worst : ''}`}
                                    >
                                        {metric.format(value, coin)}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Format helpers
function formatPrice(value) {
    if (value === null || value === undefined) return '—';
    if (value >= 1) {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

function formatLargeNumber(value) {
    if (value === null || value === undefined) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
}

function formatSupply(value, coin) {
    if (value === null || value === undefined) return '—';
    const symbol = coin?.symbol?.toUpperCase() || '';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ${symbol}`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ${symbol}`;
    return `${value.toLocaleString()} ${symbol}`;
}

function formatPercent(value) {
    if (value === null || value === undefined) return '—';
    const isPositive = value > 0;
    const isNegative = value < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    return (
        <span className={`${styles.percentValue} ${isPositive ? styles.positive : ''} ${isNegative ? styles.negative : ''}`}>
            <Icon size={14} />
            {Math.abs(value).toFixed(2)}%
        </span>
    );
}

export default CompareTable;
