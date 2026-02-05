import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useWatchlist } from '../context/WatchlistContext';

// New Dashboard Components
import MarketPulseBar from '../components/dashboard/MarketPulseBar/MarketPulseBar';
import MoversPanel from '../components/dashboard/MoversPanel/MoversPanel';
import WatchlistPanel from '../components/dashboard/WatchlistPanel/WatchlistPanel';
import NewsWidget from '../components/dashboard/NewsWidget/NewsWidget';

import styles from './Dashboard.module.css';

const Dashboard = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fearGreedValue, setFearGreedValue] = useState(50);

    // Get watchlist from context - single source of truth
    const { watchlists, loading: watchlistLoading } = useWatchlist();

    // Fetch coins data
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

    // Fetch Fear & Greed Index
    useEffect(() => {
        const fetchFearGreed = async () => {
            try {
                const response = await fetch('https://api.alternative.me/fng/?limit=1');
                const data = await response.json();
                if (data.data && data.data[0]) {
                    setFearGreedValue(parseInt(data.data[0].value));
                }
            } catch (err) {
                console.error('Failed to fetch Fear & Greed:', err);
            }
        };
        fetchFearGreed();
    }, []);

    // Get watchlist coins by matching IDs from context with coin data
    const watchlistCoins = useMemo(() => {
        if (coins.length === 0 || watchlists.length === 0) return [];

        // Collect all coin IDs from all watchlists
        const allWatchlistCoinIds = watchlists.reduce((acc, wl) => {
            return [...acc, ...(wl.coins || [])];
        }, []);

        // Remove duplicates
        const uniqueIds = [...new Set(allWatchlistCoinIds)];

        // Match with coin data
        return coins.filter(coin => uniqueIds.includes(coin.id));
    }, [coins, watchlists]);

    // Memoize data processing
    const { btcData, ethData, gainers, losers, leaders } = useMemo(() => {
        const btc = coins.find(c => c.id === 'bitcoin');
        const eth = coins.find(c => c.id === 'ethereum');

        const sortedGainers = coins
            .filter(c => (c.price_change_percentage_24h || 0) > 0)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);

        const sortedLosers = coins
            .filter(c => (c.price_change_percentage_24h || 0) < 0)
            .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);

        return {
            btcData: btc ? { price: btc.current_price, change: btc.price_change_percentage_24h } : null,
            ethData: eth ? { price: eth.current_price, change: eth.price_change_percentage_24h } : null,
            gainers: sortedGainers,
            losers: sortedLosers,
            leaders: coins.slice(0, 6)
        };
    }, [coins]);

    // Loading State
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <span>Loading market data...</span>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <p>Failed to load cryptocurrency data. Please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Row 1: Market Pulse Bar */}
            <MarketPulseBar
                fearGreedValue={fearGreedValue}
                btcData={btcData}
                ethData={ethData}
            />

            {/* Row 2: Market Movers (Side-by-Side) */}
            <MoversPanel
                gainers={gainers}
                losers={losers}
                limit={5}
            />

            {/* Row 3: Watchlist + News */}
            <div className={styles.bottomSection}>
                <WatchlistPanel watchlist={watchlistCoins} />
                <NewsWidget />
            </div>

            {/* Row 4: Market Leaders Strip */}
            <section className={styles.leadersSection}>
                <h2 className={styles.sectionTitle}>Market Leaders</h2>
                <div className={styles.leadersGrid}>
                    {leaders.map((coin) => (
                        <Link key={coin.id} to={`/markets/${coin.id}`} className={styles.leaderCard}>
                            <img src={coin.image} alt={coin.name} className={styles.leaderIcon} />
                            <div className={styles.leaderInfo}>
                                <span className={styles.leaderSymbol}>{coin.symbol?.toUpperCase()}</span>
                                <span className={styles.leaderPrice}>
                                    ${coin.current_price?.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: coin.current_price < 1 ? 4 : 2
                                    })}
                                </span>
                            </div>
                            <span className={`${styles.leaderChange} ${(coin.price_change_percentage_24h || 0) >= 0 ? styles.positive : styles.negative
                                }`}>
                                {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                                {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
