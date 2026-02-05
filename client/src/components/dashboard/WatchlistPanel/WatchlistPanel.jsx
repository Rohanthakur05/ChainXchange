import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronRight, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './WatchlistPanel.module.css';

/**
 * WatchlistPanel - Prominent watchlist with quick trade actions
 * Props:
 * - watchlist: array of coin objects
 * - onRemove: function(coinId) - remove from watchlist
 */
const WatchlistPanel = ({ watchlist = [], onRemove }) => {
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

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                    <Star size={18} className={styles.icon} />
                    <h3>My Watchlist</h3>
                    {watchlist.length > 0 && (
                        <span className={styles.count}>{watchlist.length}</span>
                    )}
                </div>
                <Link to="/markets" className={styles.addBtn}>
                    <Plus size={14} />
                    Add Coins
                </Link>
            </div>

            <div className={styles.watchlistContent}>
                {watchlist.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Star size={32} className={styles.emptyIcon} />
                        <p>Your watchlist is empty</p>
                        <Link to="/markets" className={styles.browseLink}>
                            Browse Markets
                        </Link>
                    </div>
                ) : (
                    <div className={styles.coinList}>
                        {watchlist.map((coin) => {
                            const change = coin.price_change_percentage_24h || 0;
                            const isPositive = change >= 0;

                            return (
                                <div key={coin.id} className={styles.coinRow}>
                                    <Link to={`/markets/${coin.id}`} className={styles.coinInfo}>
                                        <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                                        <div className={styles.coinDetails}>
                                            <span className={styles.symbol}>{coin.symbol?.toUpperCase()}</span>
                                            <span className={styles.name}>{coin.name}</span>
                                        </div>
                                    </Link>

                                    <div className={styles.priceInfo}>
                                        <span className={styles.price}>{formatPrice(coin.current_price)}</span>
                                        <span className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
                                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {formatChange(change)}
                                        </span>
                                    </div>

                                    <Link to={`/trade/${coin.id}`} className={styles.tradeBtn}>
                                        Trade
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {watchlist.length > 0 && (
                <div className={styles.panelFooter}>
                    <Link to="/portfolio" className={styles.viewAll}>
                        Manage Watchlist <ChevronRight size={14} />
                    </Link>
                </div>
            )}
        </div>
    );
};

export default WatchlistPanel;
