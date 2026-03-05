import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    TrendingUp,
    Wallet,
    Activity,
    BarChart2,
    Zap,
    DollarSign,
    ChevronRight,
    ArrowRight,
    Star,
} from 'lucide-react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import Button from '../components/ui/Button/Button';
import styles from './Trade.module.css';

/**
 * Trade Page — Professional Trading Dashboard
 *
 * Per Information Architecture:
 * - Shows overview trading stats, holdings, and recent activity
 * - Entry to actual coin trading happens via Markets → CryptoDetail
 * - Visual upgrade only — all existing data flow preserved
 */
const Trade = () => {
    const [recentTrades, setRecentTrades] = useState([]);
    const [holdings, setHoldings] = useState([]);
    const [wallet, setWallet] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTimeframe, setActiveTimeframe] = useState('1D');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTradeData = async () => {
            try {
                // Fetch recent transactions
                const txResponse = await api.get('/crypto/transactions');
                const transactions = txResponse.data?.transactions || [];
                setRecentTrades(transactions.slice(0, 8));

                // Fetch holdings for quick trade / open positions
                const portfolioResponse = await api.get('/crypto/portfolio');
                setHoldings(portfolioResponse.data?.holdings || []);

                // Fetch wallet balance
                const profileResponse = await api.get('/auth/profile');
                setWallet(profileResponse.data?.user?.wallet || 0);
            } catch (err) {
                console.error('Failed to load trade data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTradeData();
    }, []);

    // Derived stats
    const buyingPower = wallet * 0.5;
    const totalPnL = recentTrades.reduce((acc, t) => {
        const value = (t.quantity || 0) * (t.price || 0);
        return t.type === 'sell' ? acc + value : acc - value;
    }, 0);

    // Loading state
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <span>Loading trading hub...</span>
                </div>
            </div>
        );
    }

    const timeframes = ['1H', '4H', '1D', '1W'];

    return (
        <div className={styles.container}>

            {/* ═══════════════════════════════════════════
                SECTION 1 — MARKET HEADER
            ═══════════════════════════════════════════ */}
            <section className={styles.marketHeader}>
                <div className={styles.marketHeaderLeft}>
                    <div className={styles.assetPill}>
                        <span className={styles.assetDot}></span>
                        Live
                    </div>
                    <div className={styles.assetInfo}>
                        <h1 className={styles.assetPair}>Trading Hub</h1>
                        <p className={styles.assetSubtitle}>Your positions, history & quick actions</p>
                    </div>
                </div>
                <div className={styles.marketStats}>
                    <div className={styles.marketStat}>
                        <span className={styles.marketStatLabel}>Portfolio Value</span>
                        <span className={styles.marketStatValue}>
                            ${(wallet + holdings.reduce((a, h) => a + ((h.quantity || 0) * (h.avgBuyPrice || 0)), 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className={styles.marketStatDivider}></div>
                    <div className={styles.marketStat}>
                        <span className={styles.marketStatLabel}>Open Positions</span>
                        <span className={styles.marketStatValue}>{holdings.length}</span>
                    </div>
                    <div className={styles.marketStatDivider}></div>
                    <div className={styles.marketStat}>
                        <span className={styles.marketStatLabel}>Total Trades</span>
                        <span className={styles.marketStatValue}>{recentTrades.length}</span>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 2 — CHART AREA
            ═══════════════════════════════════════════ */}
            <section className={styles.chartSection}>
                <div className={styles.chartHeader}>
                    <div className={styles.chartTitleGroup}>
                        <BarChart2 size={18} className={styles.chartIcon} />
                        <span className={styles.chartTitle}>Portfolio Performance</span>
                        <span className={`${styles.chartBadge} ${totalPnL >= 0 ? styles.chartBadgePositive : styles.chartBadgeNegative}`}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                        </span>
                    </div>
                    <div className={styles.timeControls}>
                        {timeframes.map(tf => (
                            <button
                                key={tf}
                                className={`${styles.timeBtn} ${activeTimeframe === tf ? styles.timeBtnActive : ''}`}
                                onClick={() => setActiveTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.chartBody}>
                    {/* Decorative SVG Sparkline */}
                    <svg className={styles.chartSvg} viewBox="0 0 800 200" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,150 C50,140 80,120 120,100 C160,80 200,90 240,70 C280,50 320,75 360,60 C400,45 430,80 480,55 C530,30 560,65 600,40 C640,15 680,50 720,35 C750,25 780,30 800,20"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M0,150 C50,140 80,120 120,100 C160,80 200,90 240,70 C280,50 320,75 360,60 C400,45 430,80 480,55 C530,30 560,65 600,40 C640,15 680,50 720,35 C750,25 780,30 800,20 L800,200 L0,200 Z"
                            fill="url(#chartGradient)"
                        />
                    </svg>
                    <div className={styles.chartAxisY}>
                        <span>High</span>
                        <span>Mid</span>
                        <span>Low</span>
                    </div>
                    <div className={styles.chartPlaceholder}>
                        <BarChart2 size={40} className={styles.chartPlaceholderIcon} />
                        <span>Select a coin from <Link to="/markets" className={styles.chartLink}>Markets</Link> to view live charts</span>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 3 — TRADING STATS CARDS (4 cards)
            ═══════════════════════════════════════════ */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
                        <Wallet size={20} />
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Available Balance</span>
                        <span className={styles.statValue}>${wallet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
                        <Zap size={20} />
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Buying Power</span>
                        <span className={styles.statValue}>${buyingPower.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Active Positions</span>
                        <span className={styles.statValue}>{holdings.length}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrap} ${totalPnL >= 0 ? styles.statIconGreen : styles.statIconRed}`}>
                        <DollarSign size={20} />
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Total PnL</span>
                        <span className={`${styles.statValue} ${totalPnL >= 0 ? styles.positive : styles.negative}`}>
                            {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 4 — QUICK TRADE PANEL (Holdings)
            ═══════════════════════════════════════════ */}
            {holdings.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <TrendingUp size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>Quick Trade</h2>
                        </div>
                        <span className={styles.sectionHint}>Click any asset to trade</span>
                    </div>

                    <div className={styles.quickTradeGrid}>
                        {holdings.slice(0, 6).map((holding) => (
                            <Link
                                key={holding.coinId}
                                to={`/markets/${holding.coinId}`}
                                className={styles.quickTradeCard}
                            >
                                <div className={styles.quickTradeTop}>
                                    <div className={styles.quickTradeSymbolWrap}>
                                        <span className={styles.quickTradeSymbol}>
                                            {(holding.coinSymbol || holding.coinId).toUpperCase()}
                                        </span>
                                        <span className={styles.quickTradeName}>{holding.coinId}</span>
                                    </div>
                                    <ChevronRight size={16} className={styles.quickTradeArrow} />
                                </div>
                                <div className={styles.quickTradeBottom}>
                                    <span className={styles.quickTradeQty}>
                                        {holding.quantity?.toFixed(6)} units
                                    </span>
                                    <span className={styles.quickTradeCta}>Trade</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══════════════════════════════════════════
                SECTION 5 — OPEN POSITIONS
            ═══════════════════════════════════════════ */}
            {holdings.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <Star size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>Open Positions</h2>
                        </div>
                        <Link to="/portfolio" className={styles.viewAllLink}>
                            View Portfolio <ArrowRight size={13} />
                        </Link>
                    </div>

                    <div className={styles.positionsTable}>
                        <div className={styles.positionsTableHead}>
                            <span>Asset</span>
                            <span>Quantity</span>
                            <span>Avg. Entry</span>
                            <span>Est. Value</span>
                            <span></span>
                        </div>
                        {holdings.map((holding) => (
                            <div key={holding.coinId} className={styles.positionRow}>
                                <div className={styles.positionAsset}>
                                    <div className={styles.positionAssetDot}></div>
                                    <div>
                                        <span className={styles.positionSymbol}>
                                            {(holding.coinSymbol || holding.coinId).toUpperCase()}
                                        </span>
                                        <span className={styles.positionId}>{holding.coinId}</span>
                                    </div>
                                </div>
                                <span className={styles.positionQty}>
                                    {holding.quantity?.toFixed(6)}
                                </span>
                                <span className={styles.positionEntry}>
                                    {holding.avgBuyPrice
                                        ? `$${holding.avgBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                        : '—'}
                                </span>
                                <span className={styles.positionValue}>
                                    {holding.avgBuyPrice
                                        ? `$${((holding.quantity || 0) * holding.avgBuyPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                        : '—'}
                                </span>
                                <Link
                                    to={`/markets/${holding.coinId}`}
                                    className={styles.positionTradeBtn}
                                >
                                    Trade
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══════════════════════════════════════════
                SECTION 6 — RECENT TRADES TABLE
            ═══════════════════════════════════════════ */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleGroup}>
                        <Clock size={18} className={styles.sectionIcon} />
                        <h2 className={styles.sectionTitle}>Recent Trades</h2>
                    </div>
                    <Link to="/portfolio" className={styles.viewAllLink}>
                        View All <ArrowRight size={13} />
                    </Link>
                </div>

                {recentTrades.length > 0 ? (
                    <div className={styles.tradesTableWrap}>
                        <table className={styles.tradesTable}>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Price</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTrades.map((trade, index) => {
                                    const isBuy = trade.type === 'buy';
                                    const total = ((trade.quantity || 0) * (trade.price || 0));
                                    return (
                                        <tr key={trade._id || index} className={styles.tradeRow}>
                                            <td>
                                                <div className={styles.tradeAssetCell}>
                                                    <div className={`${styles.tradeIconBubble} ${isBuy ? styles.tradeIconBuy : styles.tradeIconSell}`}>
                                                        {isBuy
                                                            ? <ArrowDownRight size={14} />
                                                            : <ArrowUpRight size={14} />
                                                        }
                                                    </div>
                                                    <span className={styles.tradeAssetName}>
                                                        {trade.coinId?.toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.tradeBadge} ${isBuy ? styles.tradeBadgeBuy : styles.tradeBadgeSell}`}>
                                                    {isBuy ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.tradeTotal} ${isBuy ? styles.negative : styles.positive}`}>
                                                    {isBuy ? '-' : '+'}${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.tradePrice}>
                                                    ${trade.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.tradeDate}>
                                                    {new Date(trade.timestamp).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: '2-digit',
                                                    })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <BarChart2 size={40} className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>No trades yet</p>
                        <p className={styles.emptySubtitle}>Start exploring markets to make your first trade.</p>
                        <Button onClick={() => navigate('/markets')}>Browse Markets</Button>
                    </div>
                )}
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 7 — EXPLORE MARKETS CTA
            ═══════════════════════════════════════════ */}
            <div className={styles.ctaBanner}>
                <div className={styles.ctaGlow}></div>
                <div className={styles.ctaContent}>
                    <div className={styles.ctaTextGroup}>
                        <h3 className={styles.ctaTitle}>Looking for new assets to trade?</h3>
                        <p className={styles.ctaSubtitle}>
                            Discover hundreds of cryptocurrencies and start trading instantly.
                        </p>
                    </div>
                    <button className={styles.ctaButton} onClick={() => navigate('/markets')}>
                        Explore Markets
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default Trade;
