import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import { safeGet, DEFAULT_TIMEOUT_MS } from '../../utils/safeRequest';
import { fetchMarkets } from '../../services/marketService';
import { logRequestStart, logLoadingFinished } from '../../utils/requestLog';
import Badge from '../ui/Badge/Badge';
import styles from './WatchlistWidget.module.css';

const WatchlistWidget = () => {
    const [watchlist, setWatchlist] = useState([]);
    const [marketData, setMarketData] = useState([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const label = 'watchlist-widget';

        const fetchData = async () => {
            logRequestStart(label);
            const safety = setTimeout(() => {
                if (mountedRef.current) {
                    setLoading(false);
                    logLoadingFinished(label, { reason: 'safety-timeout' });
                }
            }, DEFAULT_TIMEOUT_MS + 500);

            try {
                const profileRes = await safeGet(api, '/auth/profile', {
                    timeoutMs: DEFAULT_TIMEOUT_MS,
                    label: `${label}/profile`,
                });
                const userWatchlist = profileRes.data.user?.watchlist || [];
                if (!mountedRef.current) return;
                setWatchlist(userWatchlist);

                if (userWatchlist.length > 0) {
                    const { coins: allCoins } = await fetchMarkets();
                    if (!mountedRef.current) return;
                    setMarketData(allCoins.filter((c) => userWatchlist.includes(c.id)));
                }
            } catch (err) {
                console.warn('[ChainXchange] watchlist-widget — request failed', err.message);
            } finally {
                clearTimeout(safety);
                if (mountedRef.current) {
                    setLoading(false);
                    logLoadingFinished(label);
                }
            }
        };

        fetchData();
        return () => {
            mountedRef.current = false;
        };
    }, []);

    if (loading) {
        return (
            <div className={styles.widget}>
                <div className={styles.loading}>Loading watchlist…</div>
            </div>
        );
    }

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <Star size={16} className={styles.icon} />
                <h3>My Watchlist</h3>
                <Link to="/markets" className={styles.viewAll}>
                    View All <ArrowRight size={14} />
                </Link>
            </div>

            {watchlist.length === 0 ? (
                <p className={styles.empty}>No coins in watchlist yet.</p>
            ) : (
                <div className={styles.list}>
                    {marketData.map((coin) => (
                        <Link key={coin.id} to={`/markets/${coin.id}`} className={styles.item}>
                            <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                            <div className={styles.info}>
                                <span className={styles.name}>{coin.name}</span>
                                <span className={styles.symbol}>{coin.symbol?.toUpperCase()}</span>
                            </div>
                            <div className={styles.priceInfo}>
                                <span className={styles.price}>
                                    ${coin.current_price?.toLocaleString()}
                                </span>
                                <Badge
                                    variant={
                                        (coin.price_change_percentage_24h || 0) >= 0
                                            ? 'success'
                                            : 'danger'
                                    }
                                >
                                    {(coin.price_change_percentage_24h || 0) >= 0 ? (
                                        <TrendingUp size={12} />
                                    ) : (
                                        <TrendingDown size={12} />
                                    )}
                                    {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {marketData.length < watchlist.length && (
                        <p className={styles.more}>
                            + {watchlist.length - marketData.length} other assets (view in Markets)
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(WatchlistWidget);
