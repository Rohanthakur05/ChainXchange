import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X, Maximize2, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import TradingViewChart from '../components/charts/TradingViewChart';
import Badge from '../components/ui/Badge/Badge';
import Button from '../components/ui/Button/Button';
import Input from '../components/ui/Input/Input';
import styles from './Terminal.module.css';

/**
 * Terminal Mode - Full-Screen Trading Page
 * 
 * Per Information Architecture:
 * - This is a dedicated, full-viewport trading workstation
 * - No sidebar, no dashboard widgets
 * - Optimized for analysis and execution
 * - Supports long sessions without distraction
 * 
 * Accessed via: /terminal/:coinId
 */
const Terminal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coin, setCoin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tradeType, setTradeType] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [wallet, setWallet] = useState(0);
    const [holdings, setHoldings] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    // Load indicators from localStorage (user's explicit choices)
    const [studies, setStudies] = useState(() => {
        const saved = localStorage.getItem(`terminal_studies_${id}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Save studies when they change
    useEffect(() => {
        localStorage.setItem(`terminal_studies_${id}`, JSON.stringify(studies));
    }, [studies, id]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch coin data
                const coinResponse = await api.get('/crypto');
                const coins = Array.isArray(coinResponse.data)
                    ? coinResponse.data
                    : coinResponse.data.coins || [];
                const foundCoin = coins.find(c => c.id === id);
                setCoin(foundCoin);

                // Fetch wallet
                const profileResponse = await api.get('/auth/profile');
                setWallet(profileResponse.data?.user?.wallet || 0);

                // Fetch holdings
                const portfolioResponse = await api.get('/crypto/portfolio');
                const userHolding = portfolioResponse.data?.holdings?.find(h => h.coinId === id);
                setHoldings(userHolding || null);
            } catch (err) {
                console.error('Failed to load terminal data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleTrade = async (e) => {
        e.preventDefault();
        if (!quantity || parseFloat(quantity) <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid quantity' });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/crypto/trade', {
                coinId: id,
                quantity: parseFloat(quantity),
                type: tradeType
            });
            setMessage({ type: 'success', text: `${tradeType === 'buy' ? 'Bought' : 'Sold'} successfully!` });
            setQuantity('');

            // Refresh wallet and holdings
            const profileResponse = await api.get('/auth/profile');
            setWallet(profileResponse.data?.user?.wallet || 0);
            const portfolioResponse = await api.get('/crypto/portfolio');
            const userHolding = portfolioResponse.data?.holdings?.find(h => h.coinId === id);
            setHoldings(userHolding || null);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Trade failed' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.terminal}>
                <div className={styles.loading}>Loading Terminal...</div>
            </div>
        );
    }

    if (!coin) {
        return (
            <div className={styles.terminal}>
                <div className={styles.error}>
                    <p>Asset not found</p>
                    <Button onClick={() => navigate('/markets')}>Back to Markets</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.terminal}>
            {/* Terminal Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button
                        className={styles.exitBtn}
                        onClick={() => navigate(`/markets/${id}`)}
                        title="Exit Terminal"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className={styles.assetInfo}>
                        <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                        <div>
                            <span className={styles.coinName}>{coin.name}</span>
                            <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}/USDT</span>
                        </div>
                    </div>
                </div>
                <div className={styles.headerCenter}>
                    <span className={styles.price}>${coin.current_price?.toLocaleString()}</span>
                    <Badge variant={coin.price_change_percentage_24h >= 0 ? 'success' : 'danger'}>
                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                        {coin.price_change_percentage_24h?.toFixed(2)}%
                    </Badge>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.balance}>Balance: ${wallet.toLocaleString()}</span>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.content}>
                {/* Chart Area */}
                <div className={styles.chartArea}>
                    <TradingViewChart
                        symbol={coin.symbol}
                        theme="dark"
                        studies={studies}
                    />
                </div>

                {/* Order Panel */}
                <div className={styles.orderPanel}>
                    <div className={styles.orderHeader}>
                        <h3>Place Order</h3>
                    </div>

                    <div className={styles.orderTypeTabs}>
                        <button
                            className={`${styles.orderTab} ${tradeType === 'buy' ? styles.buyActive : ''}`}
                            onClick={() => setTradeType('buy')}
                        >
                            Buy
                        </button>
                        <button
                            className={`${styles.orderTab} ${tradeType === 'sell' ? styles.sellActive : ''}`}
                            onClick={() => setTradeType('sell')}
                        >
                            Sell
                        </button>
                    </div>

                    <form onSubmit={handleTrade} className={styles.orderForm}>
                        <div className={styles.formGroup}>
                            <label>Price (USDT)</label>
                            <div className={styles.priceDisplay}>
                                ${coin.current_price?.toLocaleString()}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Quantity ({coin.symbol.toUpperCase()})</label>
                            <Input
                                type="number"
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        {quantity && parseFloat(quantity) > 0 && (
                            <div className={styles.total}>
                                <span>Total</span>
                                <span className={styles.totalValue}>
                                    ${(parseFloat(quantity) * coin.current_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}

                        {holdings && (
                            <div className={styles.holdingInfo}>
                                <span>Available</span>
                                <span>{holdings.quantity?.toFixed(4)} {coin.symbol.toUpperCase()}</span>
                            </div>
                        )}

                        {message && (
                            <div className={`${styles.message} ${styles[message.type]}`}>
                                {message.text}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant={tradeType === 'buy' ? 'primary' : 'danger'}
                            disabled={submitting || !quantity}
                            className={styles.submitBtn}
                        >
                            {submitting ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${coin.symbol.toUpperCase()}`}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
