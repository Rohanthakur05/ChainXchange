import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus } from 'lucide-react';
import api from '../utils/api';
import { useWallet } from '../context/WalletContext';
import TradingViewChart from '../components/charts/TradingViewChart';
import ChartToolbar from '../components/charts/ChartToolbar/ChartToolbar';
import IndicatorsPanel from '../components/indicators/IndicatorsPanel/IndicatorsPanel';
import { getIndicatorById } from '../config/INDICATORS_CONFIG';
import Badge from '../components/ui/Badge/Badge';
import Button from '../components/ui/Button/Button';
import Input from '../components/ui/Input/Input';
import AddMoneyModal from '../components/wallet/AddMoneyModal';
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
    const [holdings, setHoldings] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [addMoneyOpen, setAddMoneyOpen] = useState(false);

    // Use global wallet context for single source of truth
    const { wallet, syncWallet, loading: walletLoading } = useWallet();

    // Indicators panel state
    const [indicatorsPanelOpen, setIndicatorsPanelOpen] = useState(false);

    // Timeframe state
    const [timeframe, setTimeframe] = useState('D');

    // Load active indicators from localStorage (user's explicit choices)
    const [activeIndicators, setActiveIndicators] = useState(() => {
        const saved = localStorage.getItem(`terminal_indicators_${id}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Convert active indicator IDs to TradingView study IDs
    const studies = activeIndicators
        .map(id => getIndicatorById(id)?.studyId)
        .filter(Boolean);

    // Save indicators when they change
    useEffect(() => {
        localStorage.setItem(`terminal_indicators_${id}`, JSON.stringify(activeIndicators));
    }, [activeIndicators, id]);

    // Toggle indicator (add/remove)
    const handleToggleIndicator = useCallback((indicatorId) => {
        setActiveIndicators(prev => {
            if (prev.includes(indicatorId)) {
                return prev.filter(id => id !== indicatorId);
            } else {
                return [...prev, indicatorId];
            }
        });
    }, []);

    // Remove single indicator
    const handleRemoveIndicator = useCallback((indicatorId) => {
        setActiveIndicators(prev => prev.filter(id => id !== indicatorId));
    }, []);

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

                // Holdings for this specific coin
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

            // Sync wallet globally (updates header, trade panels, everywhere)
            await syncWallet();

            // Refresh holdings for this specific coin
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
                    <div className={styles.walletBox}>
                        <Wallet size={16} className={styles.walletIcon} />
                        <div className={styles.walletInfo}>
                            <span className={styles.walletLabel}>Balance</span>
                            <span className={styles.walletValue}>
                                {walletLoading ? '...' : `$${wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </span>
                        </div>
                        <button
                            className={styles.addMoneyBtn}
                            onClick={() => setAddMoneyOpen(true)}
                            title="Add Money"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.content}>
                {/* Chart Area with Toolbar */}
                <div className={styles.chartArea}>
                    <ChartToolbar
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                        activeIndicators={activeIndicators}
                        onOpenIndicators={() => setIndicatorsPanelOpen(true)}
                        onRemoveIndicator={handleRemoveIndicator}
                    />
                    <div className={styles.chartContainer}>
                        <TradingViewChart
                            symbol={coin.symbol}
                            interval={timeframe}
                            theme="dark"
                            studies={studies}
                        />
                    </div>
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

            {/* Add Money Modal */}
            <AddMoneyModal
                isOpen={addMoneyOpen}
                onClose={() => setAddMoneyOpen(false)}
            />

            {/* Indicators Panel */}
            <IndicatorsPanel
                isOpen={indicatorsPanelOpen}
                onClose={() => setIndicatorsPanelOpen(false)}
                activeIndicators={activeIndicators}
                onToggleIndicator={handleToggleIndicator}
            />
        </div>
    );
};

export default Terminal;
