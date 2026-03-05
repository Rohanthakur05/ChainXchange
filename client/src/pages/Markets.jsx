import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Star, TrendingUp, TrendingDown, GitCompare,
    Search, Globe, BarChart2, Flame, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api from '../utils/api';
import { useWatchlist } from '../context/WatchlistContext';
import { useCompare } from '../context/CompareContext';
import WatchlistStarButton from '../components/watchlist/WatchlistStarButton/WatchlistStarButton';
import { CATEGORIES, filterCoinsByCategory } from '../config/categoryData';
import PriceCell from '../components/markets/PriceCell';
import styles from './Markets.module.css';

/* ─── Inline SVG Sparkline ─── */
const Sparkline = ({ prices = [], positive }) => {
    if (!prices || prices.length < 2) return <span className={styles.sparklineEmpty}>—</span>;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 80, h = 32, pad = 2;
    const pts = prices.map((p, i) => {
        const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
        const y = pad + ((1 - (p - min) / range) * (h - pad * 2));
        return `${x},${y}`;
    }).join(' ');
    const color = positive ? '#22c55e' : '#ef4444';
    const fillId = `sf-${Math.random().toString(36).slice(2, 7)}`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={styles.sparklineSvg}>
            <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline points={`${pts} ${w - pad},${h - pad} ${pad},${h - pad}`} fill={`url(#${fillId})`} />
            <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
};

/* ─── Market Overview Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, colorClass }) => (
    <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${colorClass || ''}`}>
            <Icon size={18} />
        </div>
        <div className={styles.statBody}>
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>{value}</span>
        </div>
    </div>
);

/* ─── Format large numbers ─── */
const fmt = (n) => {
    if (!n) return '—';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
};

const Markets = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [localSearch, setLocalSearch] = useState('');

    const { watchlists } = useWatchlist();
    const { openCompare, selectedCoinIds, toggleCoin } = useCompare();

    const activeFilter = searchParams.get('filter') || 'all';
    const activeWatchlist = searchParams.get('watchlist') || null;
    const activeCategory = searchParams.get('category') || 'all';
    const searchQuery = (searchParams.get('search') || localSearch).toLowerCase();

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
                setCoins(data);
            } catch (err) {
                console.error('Error fetching markets', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarkets();
    }, []);

    /* Global stats derived from coin data */
    const globalStats = useMemo(() => {
        const totalMcap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);
        const totalVol = coins.reduce((s, c) => s + (c.total_volume || 0), 0);
        const btc = coins.find(c => c.id === 'bitcoin');
        const eth = coins.find(c => c.id === 'ethereum');
        const btcDom = btc && totalMcap ? ((btc.market_cap / totalMcap) * 100).toFixed(1) : '—';
        const ethDom = eth && totalMcap ? ((eth.market_cap / totalMcap) * 100).toFixed(1) : '—';
        return { totalMcap, totalVol, btcDom, ethDom };
    }, [coins]);

    /* Top 6 trending coins (highest 24h positive change) */
    const trendingCoins = useMemo(() =>
        [...coins]
            .filter(c => (c.price_change_percentage_24h || 0) > 0)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
            .slice(0, 8),
        [coins]
    );

    const filteredAndSortedCoins = useMemo(() => {
        let result = [...coins];
        const q = localSearch.toLowerCase();
        if (q) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.symbol.toLowerCase().includes(q)
            );
        }
        if (activeCategory !== 'all') result = filterCoinsByCategory(result, activeCategory);
        if (activeWatchlist) {
            const wl = watchlists.find(w => w._id === activeWatchlist);
            result = wl ? result.filter(c => wl.coins?.includes(c.id)) : [];
        } else {
            if (activeFilter === 'gainers') result.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            else if (activeFilter === 'losers') result.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
        }
        return result;
    }, [coins, activeFilter, activeWatchlist, activeCategory, localSearch, watchlists]);

    const handleFilterChange = (filter) => {
        setSearchParams(prev => {
            prev.delete('watchlist');
            filter === 'all' ? prev.delete('filter') : prev.set('filter', filter);
            return prev;
        }, { replace: true });
    };

    const handleWatchlistSelect = (id) => {
        setSearchParams(prev => { prev.delete('filter'); prev.set('watchlist', id); return prev; }, { replace: true });
    };

    const handleCategoryChange = (cat) => {
        setSearchParams(prev => { cat === 'all' ? prev.delete('category') : prev.set('category', cat); return prev; }, { replace: true });
    };

    const isDefaultFilter = !activeWatchlist;

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <span>Loading market data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* ════════════════════════════════════════
                HEADER
            ════════════════════════════════════════ */}
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h1 className={styles.title}>Markets</h1>
                    <p className={styles.subtitle}>Real-time prices and global market data</p>
                </div>
                <button className={styles.compareBtn} onClick={openCompare} title="Compare coins">
                    <GitCompare size={15} />
                    Compare
                    {selectedCoinIds.length > 0 && (
                        <span className={styles.compareBadge}>{selectedCoinIds.length}</span>
                    )}
                </button>
            </div>

            {/* ════════════════════════════════════════
                SECTION 1 — MARKET OVERVIEW CARDS
            ════════════════════════════════════════ */}
            <div className={styles.overviewGrid}>
                <StatCard icon={Globe} label="Total Market Cap" value={fmt(globalStats.totalMcap)} colorClass={styles.iconGreen} />
                <StatCard icon={BarChart2} label="24h Trading Volume" value={fmt(globalStats.totalVol)} colorClass={styles.iconBlue} />
                <StatCard icon={TrendingUp} label="BTC Dominance" value={`${globalStats.btcDom}%`} colorClass={styles.iconOrange} />
                <StatCard icon={TrendingUp} label="ETH Dominance" value={`${globalStats.ethDom}%`} colorClass={styles.iconPurple} />
            </div>

            {/* ════════════════════════════════════════
                SECTION 2 — TRENDING COINS STRIP
            ════════════════════════════════════════ */}
            {trendingCoins.length > 0 && (
                <div className={styles.trendingSection}>
                    <div className={styles.trendingHeader}>
                        <Flame size={15} className={styles.trendingIcon} />
                        <span className={styles.trendingLabel}>Trending</span>
                    </div>
                    <div className={styles.trendingScroll}>
                        {trendingCoins.map(coin => {
                            const pct = coin.price_change_percentage_24h || 0;
                            const pos = pct >= 0;
                            return (
                                <Link key={coin.id} to={`/markets/${coin.id}`} className={styles.trendingCard}>
                                    <img src={coin.image} alt={coin.name} className={styles.trendingImg} />
                                    <div className={styles.trendingInfo}>
                                        <span className={styles.trendingSymbol}>{coin.symbol.toUpperCase()}</span>
                                        <span className={styles.trendingPrice}>
                                            ${coin.current_price?.toLocaleString(undefined, { maximumFractionDigits: coin.current_price < 1 ? 4 : 2 })}
                                        </span>
                                    </div>
                                    <span className={`${styles.trendingChange} ${pos ? styles.trendingPos : styles.trendingNeg}`}>
                                        {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {Math.abs(pct).toFixed(2)}%
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════
                SECTION 3/4 — FILTER + SEARCH BAR
            ════════════════════════════════════════ */}
            <div className={styles.controlsRow}>
                {/* Main filter tabs */}
                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${isDefaultFilter && activeFilter === 'all' ? styles.activeTab : ''}`} onClick={() => handleFilterChange('all')}>
                            All Assets
                        </button>
                        <button className={`${styles.tab} ${isDefaultFilter && activeFilter === 'gainers' ? styles.activeTab : ''}`} onClick={() => handleFilterChange('gainers')}>
                            <TrendingUp size={13} /> Top Gainers
                        </button>
                        <button className={`${styles.tab} ${isDefaultFilter && activeFilter === 'losers' ? styles.activeTab : ''}`} onClick={() => handleFilterChange('losers')}>
                            <TrendingDown size={13} /> Top Losers
                        </button>
                        {watchlists.length > 0 && <div className={styles.tabDivider} />}
                        {watchlists.map(wl => (
                            <button
                                key={wl._id}
                                className={`${styles.tab} ${styles.watchlistTab} ${activeWatchlist === wl._id ? styles.activeTab : ''}`}
                                onClick={() => handleWatchlistSelect(wl._id)}
                                title={`${wl.name} (${wl.coins?.length || 0} coins)`}
                            >
                                <Star size={13} fill={activeWatchlist === wl._id ? 'currentColor' : 'none'} />
                                <span className={styles.tabLabel}>{wl.name}</span>
                                <span className={styles.tabCount}>{wl.coins?.length || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search bar */}
                <div className={styles.searchWrap}>
                    <Search size={15} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search cryptocurrencies..."
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Category filters */}
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

            {/* ════════════════════════════════════════
                SECTION 5-10 — MARKETS TABLE
            ════════════════════════════════════════ */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.thStar}></th>
                            <th className={styles.thRank}>#</th>
                            <th>Asset</th>
                            <th>Price</th>
                            <th>24h %</th>
                            <th className={styles.hideTablet}>7d %</th>
                            <th className={styles.hideMobile}>Market Cap</th>
                            <th className={styles.hideMobile}>Volume (24h)</th>
                            <th className={styles.hideTablet}>Last 7 Days</th>
                            <th className={styles.thAction}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedCoins.length > 0 ? filteredAndSortedCoins.map((coin, idx) => {
                            const pct24 = coin.price_change_percentage_24h || 0;
                            const pct7d = coin.price_change_percentage_7d_in_currency || 0;
                            const sparkPrices = coin.sparkline_in_7d?.price || [];
                            const pos24 = pct24 >= 0;
                            const pos7d = pct7d >= 0;
                            return (
                                <tr key={coin.id} className={styles.tableRow}>
                                    <td className={styles.tdStar}>
                                        <WatchlistStarButton coin={coin} size={15} />
                                    </td>
                                    <td className={styles.tdRank}>
                                        <span className={styles.rankNum}>{coin.market_cap_rank || idx + 1}</span>
                                    </td>
                                    <td>
                                        <Link to={`/markets/${coin.id}`} className={styles.assetCell}>
                                            <img src={coin.image} alt={coin.name} className={styles.assetIcon} />
                                            <div className={styles.assetInfo}>
                                                <span className={styles.assetName}>{coin.name}</span>
                                                <span className={styles.assetSymbol}>{coin.symbol.toUpperCase()}</span>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className={styles.tdPrice}>
                                        <PriceCell price={coin.current_price} coinId={coin.id} />
                                    </td>
                                    <td>
                                        <span className={`${styles.changeBadge} ${pos24 ? styles.positive : styles.negative}`}>
                                            {pos24 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(pct24).toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className={styles.hideTablet}>
                                        <span className={`${styles.changeBadge} ${pos7d ? styles.positive : styles.negative}`}>
                                            {pos7d ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(pct7d).toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className={styles.hideMobile}>
                                        <span className={styles.capVol}>{fmt(coin.market_cap)}</span>
                                    </td>
                                    <td className={styles.hideMobile}>
                                        <span className={styles.capVol}>{fmt(coin.total_volume)}</span>
                                    </td>
                                    <td className={styles.hideTablet}>
                                        <Sparkline prices={sparkPrices} positive={pos7d} />
                                    </td>
                                    <td className={styles.tdAction}>
                                        <Link to={`/markets/${coin.id}`} className={styles.tradeBtn}>
                                            Trade <ArrowUpRight size={12} />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={10}>
                                    <div className={styles.emptyState}>
                                        {activeWatchlist ? (
                                            <>
                                                <Star size={32} className={styles.emptyIcon} />
                                                <p>This watchlist is empty</p>
                                                <span className={styles.emptyHint}>Click the ⭐ on any coin to add it</span>
                                            </>
                                        ) : (
                                            <>
                                                <Search size={32} className={styles.emptyIcon} />
                                                <p>No coins found</p>
                                                <span className={styles.emptyHint}>Try a different search or filter</span>
                                            </>
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
