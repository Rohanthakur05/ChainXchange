import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import Badge from '../components/ui/Badge/Badge';
import styles from './Markets.module.css';

const Markets = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const response = await api.get('/crypto');
                // Handle different response structures gracefully
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
                    onClick={() => setActiveFilter('all')}
                >
                    All Assets
                </button>
                <button className={styles.filterBtn}><TrendingUp size={14} style={{ marginRight: 6 }} />Top Gainers</button>
                <button className={styles.filterBtn}><TrendingDown size={14} style={{ marginRight: 6 }} />Top Losers</button>
                <button className={styles.filterBtn}><Star size={14} style={{ marginRight: 6 }} />Watchlist</button>
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
                        {coins.map((coin) => (
                            <tr key={coin.id}>
                                <td><Star size={16} color="var(--text-secondary)" style={{ cursor: 'pointer' }} /></td>
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
                                        <Button size="sm" variant="secondary">Trade</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Markets;
