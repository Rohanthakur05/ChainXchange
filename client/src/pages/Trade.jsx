import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../utils/api';
import Input from '../components/ui/Input/Input';
import Badge from '../components/ui/Badge/Badge';
import Button from '../components/ui/Button/Button';
import styles from './Trade.module.css';

const Trade = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const response = await api.get('/crypto');
                const data = Array.isArray(response.data) ? response.data : response.data.coins || [];
                setCoins(data);
            } catch (err) {
                console.error('Failed to load coins', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCoins();
    }, []);

    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Select Coin to Trade</h1>
                <p className={styles.subtitle}>Loading available assets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Trade</h1>
                <div className={styles.errorState}>
                    <p>Failed to load trading pairs. Please try again later.</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Trade Cryptocurrency</h1>
                <p className={styles.subtitle}>Select an asset to start trading</p>
            </header>

            <div className={styles.searchBox}>
                <Input
                    placeholder="Search coins..."
                    icon={<Search size={18} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className={styles.coinGrid}>
                {filteredCoins.length > 0 ? (
                    filteredCoins.map((coin) => (
                        <Link
                            key={coin.id}
                            to={`/markets/${coin.id}`}
                            className={styles.coinCard}
                        >
                            <div className={styles.coinHeader}>
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
                            <div className={styles.coinPrice}>
                                ${coin.current_price?.toLocaleString()}
                            </div>
                            <Badge variant={(coin.price_change_percentage_24h || 0) >= 0 ? 'success' : 'danger'}>
                                {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}
                                {(coin.price_change_percentage_24h || 0).toFixed(2)}%
                            </Badge>
                        </Link>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <p>No coins match your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Trade;
