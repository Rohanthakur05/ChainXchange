import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import Badge from '../components/ui/Badge/Badge';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';
import styles from './Portfolio.module.css';

const COLORS = ['#00C853', '#2962FF', '#FFD600', '#FF3D00', '#AB47BC', '#00ACC1'];

const Portfolio = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPortfolio = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/crypto/portfolio');
            setData(response.data);
        } catch (err) {
            console.error("Failed to load portfolio", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading portfolio...</div>;

    if (error) {
        return (
            <div style={{ padding: '2rem' }}>
                <h1>Portfolio</h1>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    marginTop: '1rem',
                    textAlign: 'center'
                }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Failed to load portfolio data. Please try again.
                    </p>
                    <Button onClick={fetchPortfolio}>Retry</Button>
                </div>
            </div>
        );
    }

    if (!data) return <div style={{ padding: '2rem' }}>No portfolio data available.</div>;

    const { portfolioValue, totalProfitLoss, totalProfitLossPercentage, holdings, user } = data;

    // Prepare Pie Chart Data
    const pieData = holdings.map(h => ({ name: h.symbol.toUpperCase(), value: h.currentValue }));

    return (
        <div className={styles.portfolioContainer}>
            <header className={styles.header}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Portfolio Overview</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your crypto assets and track performance.</p>
            </header>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Total Balance</div>
                        <div className={styles.statValue}>${portfolioValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Badge variant={totalProfitLoss >= 0 ? 'success' : 'danger'}>
                            {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLossPercentage?.toFixed(2)}%
                        </Badge>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>All Time</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Available Cash (USD)</div>
                        <div className={styles.statValue}>${user.wallet?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className={styles.iconWrapper} style={{ alignSelf: 'flex-end', opacity: 0.5 }}>
                        <Wallet size={24} />
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Total Profit/Loss</div>
                        <div className={styles.statValue} style={{ color: totalProfitLoss >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                            {totalProfitLoss >= 0 ? '+' : ''}${Math.abs(totalProfitLoss)?.toLocaleString()}
                        </div>
                    </div>
                    <div className={styles.iconWrapper} style={{ alignSelf: 'flex-end', opacity: 0.5 }}>
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            {/* Charts & Allocation */}
            <div className={styles.chartsSection}>
                <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.chartTitle}>Asset Allocation</div>
                    {holdings.length > 0 ? (
                        <div className={styles.chartWrapper} style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ReTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                            No assets to display.
                        </div>
                    )}
                </div>
            </div>

            {/* Asset Cards */}
            <div className={styles.assetsSection}>
                <h2 style={{ marginBottom: '1rem' }}>Your Assets</h2>
                {holdings.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>You don't hold any assets.</p>
                        <Link to="/markets"><Button variant="primary">Start Trading</Button></Link>
                    </div>
                ) : (
                    <div className={styles.assetsGrid}>
                        {holdings.map((holding) => (
                            <div key={holding.coinId} className={styles.assetCard}>
                                <div className={styles.assetHeader}>
                                    <div className={styles.assetInfo}>
                                        <img src={holding.image} alt={holding.crypto} className={styles.assetIcon} />
                                        <div>
                                            <span className={styles.assetName}>{holding.crypto}</span>
                                            <span className={styles.assetSymbol}>{holding.symbol}</span>
                                        </div>
                                    </div>
                                    <Badge variant={holding.profitLoss >= 0 ? 'success' : 'danger'}>
                                        {holding.profitLoss >= 0 ? '+' : ''}{holding.profitLossPercentage?.toFixed(2)}%
                                    </Badge>
                                </div>
                                <div className={styles.assetDetails}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Quantity</span>
                                        <span className={styles.detailValue}>{holding.quantity}</span>
                                    </div>
                                    <div className={styles.detailItem} style={{ textAlign: 'right' }}>
                                        <span className={styles.detailLabel}>Market Value</span>
                                        <span className={styles.detailValue}>${holding.currentValue?.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <Link to={`/markets/${holding.coinId}`}>
                                        <Button block size="sm" variant="secondary">Trade</Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
