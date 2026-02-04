import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronRight, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import WatchlistWidget from '../components/dashboard/WatchlistWidget';
import FearGreedWidget from '../components/dashboard/FearGreedWidget/FearGreedWidget';
import NewsWidget from '../components/dashboard/NewsWidget/NewsWidget';
import MarketTable from '../components/dashboard/MarketTable';
import styles from './Dashboard.module.css';

const CARDS_TO_SHOW = 6; // Groww-style: show 6 cards initially

const Dashboard = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Toggle states for See More
    const [showGainersTable, setShowGainersTable] = useState(false);
    const [showLosersTable, setShowLosersTable] = useState(false);

    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
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

    // Memoize data splitting
    const { marketLeaders, topGainers, topLosers, allGainers, allLosers } = useMemo(() => {
        const leaders = coins.slice(0, 6); // Top 6 market leaders

        // All gainers and losers for table view
        const gainers = coins
            .filter(c => (c.price_change_percentage_24h || 0) > 0)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);

        const losers = coins
            .filter(c => (c.price_change_percentage_24h || 0) < 0)
            .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);

        return {
            marketLeaders: leaders,
            topGainers: gainers.slice(0, CARDS_TO_SHOW),
            topLosers: losers.slice(0, CARDS_TO_SHOW),
            allGainers: gainers,
            allLosers: losers
        };
    }, [coins]);

    // Reusable Card Component
    const CoinCard = ({ coin }) => {
        const change = coin.price_change_percentage_24h || 0;
        const isPositive = change >= 0;

        return (
            <Link to={`/markets/${coin.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                    <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                    <div className={styles.coinInfo}>
                        <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
                        <span className={styles.coinName}>{coin.name}</span>
                    </div>
                </div>
                <div className={styles.cardBody}>
                    <span className={styles.price}>
                        ${coin.current_price?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: coin.current_price < 1 ? 6 : 2
                        })}
                    </span>
                    <Badge variant={isPositive ? 'success' : 'danger'} size="sm">
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span style={{ marginLeft: 4 }}>
                            {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    </Badge>
                </div>
            </Link>
        );
    };

    // Loading State
    if (loading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>Loading market overview...</p>
                </header>
                <div className={styles.cardGrid}>
                    {[...Array(6)].map((_, i) => (
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

            {/* Top Section: Widgets + Market Leaders */}
            <div className={styles.topSection}>
                <div className={styles.widgetsColumn}>
                    <FearGreedWidget />
                    <WatchlistWidget />
                    <NewsWidget />
                </div>

                <section className={styles.leadersColumn} aria-label="Market Leaders">
                    <h2 className={styles.sectionTitle}>Market Leaders</h2>
                    <div className={styles.cardGrid}>
                        {marketLeaders.map((coin) => (
                            <CoinCard key={coin.id} coin={coin} />
                        ))}
                    </div>
                </section>
            </div>

            {/* Top Gainers Section */}
            {topGainers.length > 0 && (
                <section className={styles.section} aria-label="Top Gainers">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <TrendingUp size={18} className={styles.sectionIconGain} />
                            <h2 className={styles.sectionTitle}>Top Gainers</h2>
                            <span className={styles.sectionCount}>
                                {allGainers.length} assets
                            </span>
                        </div>
                        <button
                            className={styles.seeMoreBtn}
                            onClick={() => setShowGainersTable(!showGainersTable)}
                        >
                            {showGainersTable ? (
                                <>Show Less <ChevronUp size={16} /></>
                            ) : (
                                <>See More <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>

                    {showGainersTable ? (
                        <MarketTable
                            coins={allGainers}
                            variant="gainers"
                            maxHeight="400px"
                        />
                    ) : (
                        <div className={styles.cardGrid}>
                            {topGainers.map((coin) => (
                                <CoinCard key={coin.id} coin={coin} />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Top Losers Section */}
            {topLosers.length > 0 && (
                <section className={styles.section} aria-label="Top Losers">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <TrendingDown size={18} className={styles.sectionIconLoss} />
                            <h2 className={styles.sectionTitle}>Top Losers</h2>
                            <span className={styles.sectionCount}>
                                {allLosers.length} assets
                            </span>
                        </div>
                        <button
                            className={styles.seeMoreBtn}
                            onClick={() => setShowLosersTable(!showLosersTable)}
                        >
                            {showLosersTable ? (
                                <>Show Less <ChevronUp size={16} /></>
                            ) : (
                                <>See More <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>

                    {showLosersTable ? (
                        <MarketTable
                            coins={allLosers}
                            variant="losers"
                            maxHeight="400px"
                        />
                    ) : (
                        <div className={styles.cardGrid}>
                            {topLosers.map((coin) => (
                                <CoinCard key={coin.id} coin={coin} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default Dashboard;

