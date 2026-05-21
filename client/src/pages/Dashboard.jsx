import React, { useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useToast } from '../components/ui/Toast';
import { useMarketsData } from '../hooks/useMarketsData';
import MarketsSkeleton from '../components/markets/MarketsSkeleton';

import MarketPulseBar from '../components/dashboard/MarketPulseBar/MarketPulseBar';
import MoversPanel from '../components/dashboard/MoversPanel/MoversPanel';
import WatchlistPanel from '../components/dashboard/WatchlistPanel/WatchlistPanel';

const NewsWidget = lazy(() => import('../components/dashboard/NewsWidget/NewsWidget'));

import styles from './Dashboard.module.css';

const Dashboard = () => {
    const { coins, loading, isRefreshing, error, isFallback, reload } = useMarketsData();
    const [fearGreedValue, setFearGreedValue] = React.useState(50);
    const { watchlists } = useWatchlist();
    const toast = useToast();
    const fallbackToastShown = useRef(false);

    useEffect(() => {
        if (isFallback && !fallbackToastShown.current) {
            fallbackToastShown.current = true;
            toast.warning(
                'Live prices delayed',
                'Showing cached market data. Pulling fresh prices in the background.'
            );
        }
    }, [isFallback, toast]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        fetch('https://api.alternative.me/fng/?limit=1', { signal: controller.signal })
            .then((r) => r.json())
            .then((data) => {
                if (data.data?.[0]) {
                    setFearGreedValue(parseInt(data.data[0].value, 10));
                }
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    console.warn('[ChainXchange] fear-greed — request failed', err.message);
                }
            })
            .finally(() => clearTimeout(timer));
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, []);

    const watchlistCoins = useMemo(() => {
        if (coins.length === 0 || watchlists.length === 0) return [];
        const allWatchlistCoinIds = watchlists.reduce(
            (acc, wl) => [...acc, ...(wl.coins || [])],
            []
        );
        const uniqueIds = [...new Set(allWatchlistCoinIds)];
        return coins.filter((coin) => uniqueIds.includes(coin.id));
    }, [coins, watchlists]);

    const { btcData, ethData, gainers, losers, leaders } = useMemo(() => {
        const btc = coins.find((c) => c.id === 'bitcoin');
        const eth = coins.find((c) => c.id === 'ethereum');
        const sortedGainers = coins
            .filter((c) => (c.price_change_percentage_24h || 0) > 0)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        const sortedLosers = coins
            .filter((c) => (c.price_change_percentage_24h || 0) < 0)
            .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
        return {
            btcData: btc
                ? { price: btc.current_price, change: btc.price_change_percentage_24h }
                : null,
            ethData: eth
                ? { price: eth.current_price, change: eth.price_change_percentage_24h }
                : null,
            gainers: sortedGainers,
            losers: sortedLosers,
            leaders: coins.slice(0, 6),
        };
    }, [coins]);

    if (loading) {
        return (
            <div className={styles.container}>
                <MarketsSkeleton />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {(error || isFallback || isRefreshing) && (
                <div className={styles.banner}>
                    <AlertCircle size={16} />
                    <span>
                        {isRefreshing
                            ? 'Refreshing market prices…'
                            : error || 'Showing cached market prices'}
                    </span>
                    <button type="button" className={styles.retryBtn} onClick={reload}>
                        <RefreshCw size={14} />
                        Retry
                    </button>
                </div>
            )}

            <MarketPulseBar fearGreedValue={fearGreedValue} btcData={btcData} ethData={ethData} />
            <MoversPanel gainers={gainers} losers={losers} limit={5} />

            <div className={styles.bottomSection}>
                <WatchlistPanel watchlist={watchlistCoins} />
                <Suspense fallback={<div className={styles.widgetFallback}>Loading news…</div>}>
                    <NewsWidget />
                </Suspense>
            </div>

            <section className={styles.leadersSection}>
                <h2 className={styles.sectionTitle}>Market Leaders</h2>
                <div className={styles.leadersGrid}>
                    {leaders.map((coin) => (
                        <Link key={coin.id} to={`/markets/${coin.id}`} className={styles.leaderCard}>
                            <img src={coin.image} alt={coin.name} className={styles.leaderIcon} />
                            <div className={styles.leaderInfo}>
                                <span className={styles.leaderSymbol}>
                                    {coin.symbol?.toUpperCase()}
                                </span>
                                <span className={styles.leaderPrice}>
                                    $
                                    {coin.current_price?.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: coin.current_price < 1 ? 4 : 2,
                                    })}
                                </span>
                            </div>
                            <span
                                className={`${styles.leaderChange} ${
                                    (coin.price_change_percentage_24h || 0) >= 0
                                        ? styles.positive
                                        : styles.negative
                                }`}
                            >
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

export default React.memo(Dashboard);
