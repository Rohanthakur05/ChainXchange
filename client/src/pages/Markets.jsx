import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import api from '../utils/api';
import { useWatchlist } from '../context/WatchlistContext';
import Button from '../components/ui/Button/Button';
import Badge from '../components/ui/Badge/Badge';
import WatchlistStarButton from '../components/watchlist/WatchlistStarButton/WatchlistStarButton';
import { CATEGORIES, filterCoinsByCategory } from '../config/categoryData';
import styles from './Markets.module.css';

const Markets = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    // Get watchlists from context
    const { watchlists } = useWatchlist();

    // Active filters from URL
    const activeFilter = searchParams.get('filter') || 'all';
    const activeWatchlist = searchParams.get('watchlist') || null; // watchlist ID
    const activeCategory = searchParams.get('category') || 'all';
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';

    // Fetch market data
    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
                setCoins(data);
            } catch (err) {
                console.error("Error fetching markets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarkets();
    }, []);

    // Filter and sort coins based on active tab
    const filteredAndSortedCoins = useMemo(() => {
        let result = [...coins];

        // 1. Filter by search query
        if (searchQuery) {
            result = result.filter(coin =>
                coin.name.toLowerCase().includes(searchQuery) ||
                coin.symbol.toLowerCase().includes(searchQuery)
            );
        }

        // 2. Apply category filter
        if (activeCategory !== 'all') {
            result = filterCoinsByCategory(result, activeCategory);
        }

        // 3. Apply watchlist filter (if a specific watchlist is selected)
        if (activeWatchlist) {
            const selectedWatchlist = watchlists.find(wl => wl._id === activeWatchlist);
            if (selectedWatchlist) {
                result = result.filter(coin => selectedWatchlist.coins?.includes(coin.id));
            } else {
                // Watchlist was deleted, show empty
                result = [];
            }
        } else {
            // Apply default filters
            if (activeFilter === 'gainers') {
                result.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            } else if (activeFilter === 'losers') {
                result.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
            }
        }

        return result;
    }, [coins, activeFilter, activeWatchlist, activeCategory, searchQuery, watchlists]);

    // Handle default filter change
    const handleFilterChange = (filter) => {
        setSearchParams(prev => {
            prev.delete('watchlist'); // Clear watchlist when selecting default filter
            if (filter === 'all') {
                prev.delete('filter');
            } else {
                prev.set('filter', filter);
            }
            return prev;
        }, { replace: true });
    };

    // Handle watchlist tab selection
    const handleWatchlistSelect = (watchlistId) => {
        setSearchParams(prev => {
            prev.delete('filter'); // Clear default filter
            prev.set('watchlist', watchlistId);
            return prev;
        }, { replace: true });
    };

    // Handle category change
    const handleCategoryChange = (category) => {
        setSearchParams(prev => {
            if (category === 'all') {
                prev.delete('category');
            } else {
                prev.set('category', category);
            }
            return prev;
        }, { replace: true });
    };

    // Check if a default filter is active (no watchlist selected)
    const isDefaultFilter = !activeWatchlist;

    if (loading) return <div style={{ padding: '2rem' }}>Loading markets...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Markets</h1>
                <p className={styles.subtitle}>Real-time prices and market analysis</p>
            </div>

            {/* Main Filter Tabs (Default + Watchlists) */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    {/* Default Tabs */}
                    <button
                        className={`${styles.tab} ${isDefaultFilter && activeFilter === 'all' ? styles.activeTab : ''}`}
                        onClick={() => handleFilterChange('all')}
                    >
                        All Assets
                    </button>
                    <button
                        className={`${styles.tab} ${isDefaultFilter && activeFilter === 'gainers' ? styles.activeTab : ''}`}
                        onClick={() => handleFilterChange('gainers')}
                    >
                        <TrendingUp size={14} />
                        Top Gainers
                    </button>
                    <button
                        className={`${styles.tab} ${isDefaultFilter && activeFilter === 'losers' ? styles.activeTab : ''}`}
                        onClick={() => handleFilterChange('losers')}
                    >
                        <TrendingDown size={14} />
                        Top Losers
                    </button>

                    {/* Divider */}
                    {watchlists.length > 0 && <div className={styles.tabDivider} />}

                    {/* Dynamic Watchlist Tabs */}
                    {watchlists.map(wl => (
                        <button
                            key={wl._id}
                            className={`${styles.tab} ${styles.watchlistTab} ${activeWatchlist === wl._id ? styles.activeTab : ''}`}
                            onClick={() => handleWatchlistSelect(wl._id)}
                            title={`${wl.name} (${wl.coins?.length || 0} coins)`}
                        >
                            <Star size={14} fill={activeWatchlist === wl._id ? 'currentColor' : 'none'} />
                            <span className={styles.tabLabel}>{wl.name}</span>
                            <span className={styles.tabCount}>{wl.coins?.length || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Filters */}
            <div className={styles.categoryFilters}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                        key={key}
                        className={`${styles.categoryBtn} ${activeCategory === key ? styles.activeCat : ''}`}
                        onClick={() => handleCategoryChange(key)}
                    >
                        <span className={styles.categoryIcon}>{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Markets Table */}
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
                        {filteredAndSortedCoins.length > 0 ? filteredAndSortedCoins.map((coin) => (
                            <tr key={coin.id}>
                                <td>
                                    <WatchlistStarButton coin={coin} size={16} />
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
                        )) : (
                            <tr>
                                <td colSpan={6}>
                                    <div className={styles.emptyState}>
                                        {activeWatchlist ? (
                                            <>
                                                <Star size={32} className={styles.emptyIcon} />
                                                <p>This watchlist is empty</p>
                                                <span className={styles.emptyHint}>
                                                    Click the ⭐ on any coin to add it
                                                </span>
                                            </>
                                        ) : (
                                            <p>No coins found</p>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Markets;
