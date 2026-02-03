import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Badge from '../ui/Badge/Badge';
import styles from './MarketTable.module.css';

/**
 * MarketTable - Professional table view for market data
 * Used in "See More" expanded views for Top Gainers/Losers
 */
const MarketTable = ({ coins, variant = 'default', maxHeight = '400px' }) => {
    const isGainer = variant === 'gainers';
    const isLoser = variant === 'losers';

    if (!coins || coins.length === 0) {
        return (
            <div className={styles.empty}>
                No data available
            </div>
        );
    }

    return (
        <div className={styles.tableWrapper} style={{ maxHeight }}>
            <table className={styles.table}>
                <thead className={styles.thead}>
                    <tr>
                        <th className={styles.thName}>Asset</th>
                        <th className={styles.thPrice}>Price</th>
                        <th className={styles.thChange}>24h Change</th>
                        <th className={styles.thRange}>24h Range</th>
                    </tr>
                </thead>
                <tbody>
                    {coins.map((coin) => {
                        const change = coin.price_change_percentage_24h || 0;
                        const isPositive = change >= 0;
                        const low = coin.low_24h || coin.current_price * 0.95;
                        const high = coin.high_24h || coin.current_price * 1.05;
                        const rangePercent = high !== low
                            ? ((coin.current_price - low) / (high - low)) * 100
                            : 50;

                        return (
                            <tr key={coin.id} className={styles.row}>
                                <td className={styles.tdName}>
                                    <Link to={`/markets/${coin.id}`} className={styles.coinLink}>
                                        <img
                                            src={coin.image}
                                            alt={coin.name}
                                            className={styles.coinIcon}
                                            loading="lazy"
                                        />
                                        <div className={styles.coinInfo}>
                                            <span className={styles.coinSymbol}>
                                                {coin.symbol.toUpperCase()}
                                            </span>
                                            <span className={styles.coinName}>{coin.name}</span>
                                        </div>
                                    </Link>
                                </td>
                                <td className={styles.tdPrice}>
                                    <span className={styles.price}>
                                        ${coin.current_price?.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: coin.current_price < 1 ? 6 : 2
                                        })}
                                    </span>
                                </td>
                                <td className={styles.tdChange}>
                                    <Badge
                                        variant={isPositive ? 'success' : 'danger'}
                                        size="sm"
                                    >
                                        {isPositive ? (
                                            <TrendingUp size={12} style={{ marginRight: 4 }} />
                                        ) : (
                                            <TrendingDown size={12} style={{ marginRight: 4 }} />
                                        )}
                                        {isPositive ? '+' : ''}{change.toFixed(2)}%
                                    </Badge>
                                </td>
                                <td className={styles.tdRange}>
                                    <div className={styles.rangeContainer}>
                                        <span className={styles.rangeValue}>
                                            ${low?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                        <div className={styles.rangeBar}>
                                            <div
                                                className={styles.rangeProgress}
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, rangePercent))}%`,
                                                    background: isPositive
                                                        ? 'var(--color-buy)'
                                                        : 'var(--color-sell)'
                                                }}
                                            />
                                            <div
                                                className={styles.rangeMarker}
                                                style={{ left: `${Math.min(100, Math.max(0, rangePercent))}%` }}
                                            />
                                        </div>
                                        <span className={styles.rangeValue}>
                                            ${high?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default MarketTable;
