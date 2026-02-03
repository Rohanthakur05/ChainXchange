import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import Badge from '../components/ui/Badge/Badge';
import styles from './Markets.module.css';

const Markets = () => {
    const [coins, setCoins] = useState([]);
    const [watchlist, setWatchlist] = useState([]); // Array of strings
    const [loading, setLoading] = useState(true);
    const [togglingCoin, setTogglingCoin] = useState(null); // Track which coin is being toggled
    const [searchParams, setSearchParams] = useSearchParams();

    const activeFilter = searchParams.get('filter') || 'all';
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                // Fetch Markets and Profile in parallel
                const [marketsRes, profileRes] = await Promise.all([
                    api.get('/crypto'),
                    api.get('/auth/profile').catch(() => ({ data: { user: { watchlist: [] } } })) // Handle auth error gracefully
                ]);

                const data = Array.isArray(marketsRes.data) ? marketsRes.data : marketsRes.data.coins || [];
                setCoins(data);
                setWatchlist(profileRes.data?.user?.watchlist || []);
            } catch (err) {
                console.error("Error fetching markets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarkets();
    }, []);

    const toggleWatchlist = async (e, coinId) => {
        e.preventDefault();
        e.stopPropagation();

        // Prevent double-clicks
        if (togglingCoin === coinId) return;

        setTogglingCoin(coinId);

        // Optimistic update
        const isWatched = watchlist.includes(coinId);
        const previousWatchlist = [...watchlist];
        let newWatchlist;
        if (isWatched) {
            newWatchlist = watchlist.filter(id => id !== coinId);
        } else {
            newWatchlist = [...watchlist, coinId];
        }
        setWatchlist(newWatchlist);

        try {
            await api.post('/auth/watchlist/toggle', { coinId });
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
            // Revert on error
            setWatchlist(previousWatchlist);
        } finally {
            setTogglingCoin(null);
        }
    };

    const filteredAndSortedCoins = useMemo(() => {
        let result = [...coins];

        // 1. Filter by search query
        if (searchQuery) {
            result = result.filter(coin =>
                coin.name.toLowerCase().includes(searchQuery) ||
                coin.symbol.toLowerCase().includes(searchQuery)
            );
        }

        // 2. Apply category filter/sort
        if (activeFilter === 'watchlist') {
            result = result.filter(coin => watchlist.includes(coin.id));
        } else if (activeFilter === 'gainers') {
            result.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
        } else if (activeFilter === 'losers') {
            result.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
        }

        return result;
    }, [coins, activeFilter, searchQuery, watchlist]);

    const handleFilterChange = (filter) => {
        setSearchParams(prev => {
            if (filter === 'all') {
                prev.delete('filter');
            } else {
                prev.set('filter', filter);
            }
            return prev;
        }, { replace: true });
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading markets...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Markets</h1>
                <p className={styles.subtitle}>Real-time prices and market analysis</p>
            </div>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('all')}
                >
                    All Assets
                </button>
                <button
                    className={`${styles.filterBtn} ${activeFilter === 'gainers' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('gainers')}
                >
                    <TrendingUp size={14} style={{ marginRight: 6 }} />Top Gainers
                </button>
                <button
                    className={`${styles.filterBtn} ${activeFilter === 'losers' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('losers')}
                >
                    <TrendingDown size={14} style={{ marginRight: 6 }} />Top Losers
                </button>
                <button
                    className={`${styles.filterBtn} ${activeFilter === 'watchlist' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('watchlist')}
                >
                    <Star size={14} style={{ marginRight: 6 }} />Watchlist
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}></th>
                            <th>Asset</th>
                            <th>Price</th>
                            <th>24h Change</th>
                            <th className={styles.capCell}>Market Cap</th>
                            <th className={styles.actionCell}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedCoins.length > 0 ? filteredAndSortedCoins.map((coin) => {
                            const isWatched = watchlist.includes(coin.id);
                            return (
                                <tr key={coin.id}>
                                    <td>
                                        <div
                                            onClick={(e) => toggleWatchlist(e, coin.id)}
                                            style={{
                                                cursor: togglingCoin === coin.id ? 'wait' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                opacity: togglingCoin === coin.id ? 0.5 : 1,
                                                transition: 'opacity 0.2s'
                                            }}
                                            title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
                                        >
                                            <Star
                                                size={16}
                                                fill={isWatched ? "#F0B90B" : "none"}
                                                color={isWatched ? "#F0B90B" : "var(--text-secondary)"}
                                                style={togglingCoin === coin.id ? { animation: 'pulse 0.5s infinite' } : {}}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.assetCell}>
                                            <img src={coin.image} alt={coin.name} className={styles.assetIcon} />
                                            <div className={styles.assetInfo}>
                                                <span className={styles.assetName}>{coin.name}</span>
                                                <span className={styles.assetSymbol}>{coin.symbol.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={styles.price}>${coin.current_price?.toLocaleString()}</td>
                                    <td>
                                        <Badge variant={(coin.price_change_percentage_24h || 0) >= 0 ? 'success' : 'danger'}>
                                            {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                                            {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                        </Badge>
                                    </td>
                                    <td className={styles.capCell}>${(coin.market_cap || 0).toLocaleString()}</td>
                                    <td className={styles.actionCell}>
                                        <Link to={`/markets/${coin.id}`}>
                                            <Button size="sm" variant="secondary">View</Button>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No assets found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table >
            </div >
        </div >
    );
};

export default Markets;
