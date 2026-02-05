import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import styles from './MoversPanel.module.css';

/**
 * MoversPanel - Side-by-side display of top gainers and losers
 * Props:
 * - gainers: array of coin objects
 * - losers: array of coin objects  
 * - limit: number of items to show (default 5)
 */
const MoversPanel = ({ gainers = [], losers = [], limit = 5 }) => {
    const formatPrice = (price) => {
        if (!price) return '$0.00';
        if (price < 0.01) return `$${price.toFixed(6)}`;
        if (price < 1) return `$${price.toFixed(4)}`;
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatChange = (change) => {
        if (!change && change !== 0) return '0.00%';
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    const MoverRow = ({ coin, rank, isGainer }) => (
        <Link to={`/markets/${coin.id}`} className={styles.moverRow}>
            <span className={styles.rank}>#{rank}</span>
            <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
            <div className={styles.coinInfo}>
                <span className={styles.symbol}>{coin.symbol?.toUpperCase()}</span>
                <span className={styles.name}>{coin.name}</span>
            </div>
            <span className={styles.price}>{formatPrice(coin.current_price)}</span>
            <span className={`${styles.change} ${isGainer ? styles.positive : styles.negative}`}>
                {isGainer ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatChange(coin.price_change_percentage_24h)}
            </span>
        </Link>
    );

    return (
        <div className={styles.moversContainer}>
            {/* Gainers Panel */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <TrendingUp size={18} className={styles.iconGain} />
                        <h3>Top Gainers</h3>
                    </div>
                    <Link to="/markets?filter=gainers" className={styles.viewAll}>
                        View All <ChevronRight size={14} />
                    </Link>
                </div>
                <div className={styles.moversList}>
                    {gainers.slice(0, limit).map((coin, idx) => (
                        <MoverRow key={coin.id} coin={coin} rank={idx + 1} isGainer={true} />
                    ))}
                    {gainers.length === 0 && (
                        <div className={styles.emptyState}>No gainers found</div>
                    )}
                </div>
            </div>

            {/* Losers Panel */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <TrendingDown size={18} className={styles.iconLoss} />
                        <h3>Top Losers</h3>
                    </div>
                    <Link to="/markets?filter=losers" className={styles.viewAll}>
                        View All <ChevronRight size={14} />
                    </Link>
                </div>
                <div className={styles.moversList}>
                    {losers.slice(0, limit).map((coin, idx) => (
                        <MoverRow key={coin.id} coin={coin} rank={idx + 1} isGainer={false} />
                    ))}
                    {losers.length === 0 && (
                        <div className={styles.emptyState}>No losers found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoversPanel;
