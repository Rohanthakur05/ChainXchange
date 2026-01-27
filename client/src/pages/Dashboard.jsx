import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import WatchlistWidget from '../components/dashboard/WatchlistWidget';
import styles from './Dashboard.module.css';

const Dashboard = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
                // Keep previous data if fetch returns empty (prevents flash of empty content)
                if (data.length > 0) {
                    setCoins(data);
                }
            } catch (err) {
                console.error('Failed to load dashboard data', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCoins();
    }, []);

    // Memoize data splitting to prevent unnecessary re-calculations
    const { top8Coins, topGainers, topLosers } = useMemo(() => {
        const top8 = coins.slice(0, 8);
        const remaining = coins.slice(8);

        // Top Gainers: positive change, sorted highest first
        const gainers = remaining
            .filter(c => (c.price_change_percentage_24h || 0) > 0)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
            .slice(0, 10);

        // Top Losers: negative change, sorted lowest first
        const losers = remaining
            .filter(c => (c.price_change_percentage_24h || 0) < 0)
            .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
            .slice(0, 10);

        return { top8Coins: top8, topGainers: gainers, topLosers: losers };
    }, [coins]);

    // Loading State
    if (loading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>Loading market overview...</p>
                </header>
                <div className={styles.topCoinsGrid}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={styles.skeletonCard} />
                    ))}
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>Unable to load market data</p>
                </header>
                <div className={styles.errorState}>
                    <p>Failed to load cryptocurrency data. Please try again later.</p>
                </div>
            </div>
        );
    }

    // Empty State
    if (coins.length === 0) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>No market data available</p>
                </header>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <p className={styles.subtitle}>Real-time market overview and top performing assets</p>
            </header>

            {/* Top Section: Watchlist + Market Leaders */}
            <div className={styles.topSection}>
                <div className={styles.watchlistColumn}>
                    <WatchlistWidget />
                </div>

                <section className={styles.leadersColumn} aria-label="Top 8 Cryptocurrencies">
                    <h2 className={styles.sectionTitle}>Market Leaders</h2>
                    <div className={styles.topCoinsGrid}>
                        {top8Coins.map((coin) => (
                            <Link
                                key={coin.id}
                                to={`/markets/${coin.id}`}
                                className={styles.gridCard}
                            >
                                <div className={styles.cardHeader}>
                                    <img
                                        src={coin.image}
                                        alt={coin.name}
                                        className={styles.coinIcon}
                                    />
                                    <div className={styles.coinInfo}>
                                        <span className={styles.coinName}>{coin.name}</span>
                                        <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>
                                            ${coin.current_price?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className={styles.changeRow}>
                                        <Badge variant={(coin.price_change_percentage_24h || 0) >= 0 ? 'success' : 'danger'}>
                                            {(coin.price_change_percentage_24h || 0) >= 0 ? (
                                                <TrendingUp size={12} style={{ marginRight: 4 }} />
                                            ) : (
                                                <TrendingDown size={12} style={{ marginRight: 4 }} />
                                            )}
                                            {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                                            {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                        </Badge>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {/* Section 2: Top Gainers */}
            {topGainers.length > 0 && (
                <section className={styles.segmentedSection} aria-label="Top Gainers">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <TrendingUp size={18} className={styles.sectionIconGain} />
                            <h2 className={styles.sectionTitle}>Top Gainers</h2>
                        </div>
                    </div>
                    <div className={styles.horizontalScroll}>
                        {topGainers.map((coin) => (
                            <Link
                                key={coin.id}
                                to={`/markets/${coin.id}`}
                                className={styles.compactCard}
                            >
                                <div className={styles.compactHeader}>
                                    <img
                                        src={coin.image}
                                        alt={coin.name}
                                        className={styles.compactIcon}
                                        loading="lazy"
                                    />
                                    <span className={styles.compactSymbol}>
                                        {coin.symbol.toUpperCase()}
                                    </span>
                                </div>
                                <div className={styles.compactPrice}>
                                    ${coin.current_price?.toLocaleString()}
                                </div>
                                <Badge variant="success" className={styles.compactBadge}>
                                    +{(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                </Badge>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Section 3: Top Losers */}
            {topLosers.length > 0 && (
                <section className={styles.segmentedSection} aria-label="Top Losers">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <TrendingDown size={18} className={styles.sectionIconLoss} />
                            <h2 className={styles.sectionTitle}>Top Losers</h2>
                        </div>
                    </div>
                    <div className={styles.horizontalScroll}>
                        {topLosers.map((coin) => (
                            <Link
                                key={coin.id}
                                to={`/markets/${coin.id}`}
                                className={styles.compactCard}
                            >
                                <div className={styles.compactHeader}>
                                    <img
                                        src={coin.image}
                                        alt={coin.name}
                                        className={styles.compactIcon}
                                        loading="lazy"
                                    />
                                    <span className={styles.compactSymbol}>
                                        {coin.symbol.toUpperCase()}
                                    </span>
                                </div>
                                <div className={styles.compactPrice}>
                                    ${coin.current_price?.toLocaleString()}
                                </div>
                                <Badge variant="danger" className={styles.compactBadge}>
                                    {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                </Badge>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;
