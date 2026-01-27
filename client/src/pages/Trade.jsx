import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    TrendingUp,
    Wallet,
    Activity
} from 'lucide-react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import Button from '../components/ui/Button/Button';
import styles from './Trade.module.css';

/**
 * Trade Page - Execution Stage
 * 
 * Per Information Architecture:
 * - This is NOT a coin discovery page (that's Markets)
 * - Shows recent trading activity and quick actions
 * - Entry point to actual trading happens via coin selection from Markets
 */
const Trade = () => {
    const [recentTrades, setRecentTrades] = useState([]);
    const [holdings, setHoldings] = useState([]);
    const [wallet, setWallet] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTradeData = async () => {
            try {
                // Fetch recent transactions
                const txResponse = await api.get('/crypto/transactions');
                const transactions = txResponse.data?.transactions || [];
                setRecentTrades(transactions.slice(0, 5));

                // Fetch holdings for quick trade
                const portfolioResponse = await api.get('/crypto/portfolio');
                setHoldings(portfolioResponse.data?.holdings || []);

                // Fetch wallet
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

    if (loading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Trade</h1>
                    <p className={styles.subtitle}>Loading trading hub...</p>
                </header>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Trade</h1>
                <p className={styles.subtitle}>Your trading activity and quick actions</p>
            </header>

            {/* Quick Stats */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Wallet size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Available Balance</span>
                        <span className={styles.statValue}>${wallet.toLocaleString()}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Active Positions</span>
                        <span className={styles.statValue}>{holdings.length}</span>
                    </div>
                </div>
            </div>

            {/* Quick Trade - Your Holdings */}
            {holdings.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <TrendingUp size={18} />
                            Quick Trade
                        </h2>
                        <span className={styles.sectionHint}>Trade your current positions</span>
                    </div>
                    <div className={styles.holdingsGrid}>
                        {holdings.slice(0, 6).map((holding) => (
                            <Link
                                key={holding.coinId}
                                to={`/markets/${holding.coinId}`}
                                className={styles.holdingCard}
                            >
                                <div className={styles.holdingInfo}>
                                    <span className={styles.holdingSymbol}>
                                        {holding.coinSymbol?.toUpperCase() || holding.coinId.toUpperCase()}
                                    </span>
                                    <span className={styles.holdingQty}>
                                        {holding.quantity?.toFixed(4)} units
                                    </span>
                                </div>
                                <Badge variant="neutral">Trade →</Badge>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Trades */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Clock size={18} />
                        Recent Trades
                    </h2>
                    <Link to="/portfolio" className={styles.viewAllLink}>
                        View All
                    </Link>
                </div>

                {recentTrades.length > 0 ? (
                    <div className={styles.tradesList}>
                        {recentTrades.map((trade, index) => (
                            <div key={trade._id || index} className={styles.tradeItem}>
                                <div className={styles.tradeIcon}>
                                    {trade.type === 'buy' ? (
                                        <ArrowDownRight className={styles.buyIcon} />
                                    ) : (
                                        <ArrowUpRight className={styles.sellIcon} />
                                    )}
                                </div>
                                <div className={styles.tradeInfo}>
                                    <span className={styles.tradeAction}>
                                        {trade.type === 'buy' ? 'Bought' : 'Sold'} {trade.coinId?.toUpperCase()}
                                    </span>
                                    <span className={styles.tradeTime}>
                                        {new Date(trade.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={styles.tradeAmount}>
                                    <span className={trade.type === 'buy' ? styles.negative : styles.positive}>
                                        {trade.type === 'buy' ? '-' : '+'}${(trade.quantity * trade.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className={styles.tradeQty}>
                                        {trade.quantity?.toFixed(4)} units @ ${trade.price?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No recent trades</p>
                        <Button onClick={() => navigate('/markets')}>
                            Browse Markets
                        </Button>
                    </div>
                )}
            </section>

            {/* CTA to Markets */}
            <div className={styles.ctaSection}>
                <p className={styles.ctaText}>Looking for new assets to trade?</p>
                <Button onClick={() => navigate('/markets')} size="lg">
                    Explore Markets
                </Button>
            </div>
        </div>
    );
};

export default Trade;
