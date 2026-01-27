import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import Badge from '../ui/Badge/Badge';
import styles from './WatchlistWidget.module.css';

const WatchlistWidget = () => {
    const [watchlist, setWatchlist] = useState([]);
    const [marketData, setMarketData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get User Profile for Watchlist IDs
                const profileRes = await api.get('/auth/profile');
                const userWatchlist = profileRes.data.user?.watchlist || [];
                setWatchlist(userWatchlist);

                if (userWatchlist.length > 0) {
                    // 2. Get Market Data (Top 100 is usually cached/fast)
                    // Optimization: We could add a specific endpoint for filtered list, 
                    // but reusing /crypto is fine for < 100 items.
                    const marketRes = await api.get('/crypto');
                    const allCoins = Array.isArray(marketRes.data) ? marketRes.data : marketRes.data.coins || [];

                    // Filter coins that are in watchlist
                    const watchedCoins = allCoins.filter(c => userWatchlist.includes(c.id));
                    setMarketData(watchedCoins);
                }
            } catch (err) {
                console.error('Failed to load watchlist', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className={styles.widget}><div className={styles.loading}>Loading watchlist...</div></div>;

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <Star size={18} className={styles.icon} />
                    <h3>Your Watchlist</h3>
                </div>
                <Link to="/markets?filter=watchlist" className={styles.link}>
                    View All <ArrowRight size={14} />
                </Link>
            </div>

            {watchlist.length === 0 ? (
                <div className={styles.empty}>
                    <p>No assets watched yet.</p>
                    <Link to="/markets" className={styles.emptyLink}>Discover Assets</Link>
                </div>
            ) : (
                <div className={styles.list}>
                    {marketData.map(coin => (
                        <Link to={`/markets/${coin.id}`} key={coin.id} className={styles.item}>
                            <div className={styles.colName}>
                                <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                                <div>
                                    <span className={styles.symbol}>{coin.symbol.toUpperCase()}</span>
                                    <span className={styles.name}>{coin.name}</span>
                                </div>
                            </div>
                            <div className={styles.colPrice}>
                                <span className={styles.price}>${coin.current_price?.toLocaleString()}</span>
                            </div>
                            <div className={styles.colChange}>
                                <Badge variant={coin.price_change_percentage_24h >= 0 ? 'success' : 'danger'} size="sm">
                                    {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                                    {coin.price_change_percentage_24h?.toFixed(2)}%
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {/* Handle case where IDs exist but market data missing (e.g. not in top 100) */}
                    {marketData.length < watchlist.length && (
                        <div className={styles.hiddenCount}>
                            + {watchlist.length - marketData.length} other assets (view in Markets)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WatchlistWidget;
