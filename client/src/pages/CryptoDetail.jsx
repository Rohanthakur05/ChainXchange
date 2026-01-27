import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart, CandlestickChart, Bell, SlidersHorizontal, Maximize2 } from 'lucide-react';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import Input from '../components/ui/Input/Input';
import Badge from '../components/ui/Badge/Badge';
import TradingViewChart from '../components/charts/TradingViewChart';
import CreateAlertModal from '../components/alerts/CreateAlertModal';
import IndicatorsPanel from '../components/charts/IndicatorsPanel';
import styles from './CryptoDetail.module.css';

const OrderRow = ({ price, amount, type }) => (
    <div className={styles.orderRow}>
        <span className={type === 'bid' ? styles.bid : styles.ask}>{price}</span>
        <span className={styles.orderAmt}>{amount}</span>
    </div>
);

// Comprehensive timeframes - Short-term and Long-term
const TIMEFRAMES = [
    // Short-term
    { label: '5m', value: '5m', days: 1, group: 'short' },
    { label: '15m', value: '15m', days: 1, group: 'short' },
    { label: '1H', value: '1h', days: 1, group: 'short' },
    { label: '4H', value: '4h', days: 1, group: 'short' },
    { label: '24H', value: '24h', days: 1, group: 'short' },
    // Long-term
    { label: '1W', value: '1W', days: 7, group: 'long' },
    { label: '1M', value: '1M', days: 30, group: 'long' },
    { label: '1Y', value: '1Y', days: 365, group: 'long' },
    { label: 'ALL', value: 'ALL', days: 'max', group: 'long' }
];

// Professional tooltip for chart
const ProfessionalTooltip = ({ active, payload, label, chartData }) => {
    if (!active || !payload?.length) return null;

    const currentPrice = payload[0].value;
    const openPrice = chartData?.[0]?.price || currentPrice;
    const changePercent = ((currentPrice - openPrice) / openPrice) * 100;

    return (
        <div className={styles.proTooltip}>
            <div className={styles.tooltipPrice}>
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`${styles.tooltipChange} ${changePercent >= 0 ? styles.positive : styles.negative}`}>
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% from open
            </div>
            <div className={styles.tooltipDate}>{label}</div>
        </div>
    );
};

const CryptoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coin, setCoin] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [tradeType, setTradeType] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [message, setMessage] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [holdings, setHoldings] = useState(null);
    const [orderPreview, setOrderPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [timeframe, setTimeframe] = useState('24h');
    const [chartLoading, setChartLoading] = useState(false);
    const [chartMode, setChartMode] = useState('graph'); // 'graph' | 'tradingview'
    const [alertModalOpen, setAlertModalOpen] = useState(false);
    const [indicatorsPanelOpen, setIndicatorsPanelOpen] = useState(false);

    // Load indicators from localStorage (user's explicit choices)
    const [activeIndicators, setActiveIndicators] = useState(() => {
        const saved = localStorage.getItem(`chart_indicators_${id}`);
        return saved ? JSON.parse(saved) : [];  // Empty by default, no auto-apply
    });

    // Save indicators to localStorage when they change
    useEffect(() => {
        localStorage.setItem(`chart_indicators_${id}`, JSON.stringify(activeIndicators));
    }, [activeIndicators, id]);

    // Map active indicators to TradingView studies
    const tvStudies = useMemo(() => {
        const map = {
            'rsi': 'RSI@tv-basicstudies',
            'macd': 'MACD@tv-basicstudies',
            'stoch': 'Stochastic@tv-basicstudies',
            'ema': 'Moving Average Exponential@tv-basicstudies',
            'bb': 'Bollinger Bands@tv-basicstudies',
            'volume': 'Volume@tv-basicstudies',
            'ma20': 'Moving Average@tv-basicstudies',
            'ma50': 'Moving Average@tv-basicstudies',
            'ma200': 'Moving Average@tv-basicstudies',
        };
        // Dedup studies since multiple MAs might map to same study string
        return [...new Set(activeIndicators.map(id => map[id]).filter(Boolean))];
    }, [activeIndicators]);

    // Fetch wallet balance
    const fetchWallet = async () => {
        try {
            const response = await api.get('/auth/profile');
            setWallet(response.data.user.wallet || 0);
        } catch (err) {
            console.error('Failed to fetch wallet', err);
        }
    };

    // Fetch user holdings for this coin
    const fetchHoldings = async () => {
        try {
            const response = await api.get('/crypto/portfolio');
            const userHolding = response.data.holdings?.find(h => h.coinId === id);
            setHoldings(userHolding || null);
        } catch (err) {
            console.error('Failed to fetch holdings', err);
        }
    };

    // Load chart data based on timeframe
    const loadChartData = async (tf) => {
        setChartLoading(true);
        try {
            const selectedTF = TIMEFRAMES.find(t => t.value === tf);
            const response = await api.get(`/crypto/chart-data/${id}?days=${selectedTF.days}`);

            const formattedChart = response.data.prices.map(([timestamp, price]) => ({
                date: new Date(timestamp).toLocaleDateString(),
                price: price
            }));
            setChartData(formattedChart);
        } catch (err) {
            console.error("Error fetching chart data", err);
        } finally {
            setChartLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        const fetchCoinData = async () => {
            if (!id) return;
            try {
                const response = await api.get(`/crypto/detail/${id}`);
                setCoin(response.data.coin);
            } catch (err) {
                console.error("Error fetching coin data", err);
            }
        };

        fetchCoinData();
        fetchWallet();
        fetchHoldings();
    }, [id]);

    // Load chart when timeframe changes
    useEffect(() => {
        if (id) {
            loadChartData(timeframe);
        }
    }, [timeframe, id]);

    // Real-time price updates (every 15 seconds)
    useEffect(() => {
        if (!id) return;

        const updatePrice = async () => {
            try {
                const response = await api.get(`/crypto/detail/${id}`);
                setCoin(prev => ({
                    ...prev,
                    current_price: response.data.coin.current_price,
                    price_change_percentage_24h: response.data.coin.price_change_percentage_24h
                }));
            } catch (err) {
                console.error('Price update failed', err);
            }
        };

        const interval = setInterval(updatePrice, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const handlePrepareOrder = (e) => {
        e.preventDefault();

        // Validation
        if (!quantity || parseFloat(quantity) <= 0) {
            setMessage({ type: 'error', text: 'Enter a valid quantity' });
            return;
        }

        const qty = parseFloat(quantity);
        const totalCost = qty * coin.current_price;

        // Buy validation
        if (tradeType === 'buy' && totalCost > wallet) {
            setMessage({
                type: 'error',
                text: `Insufficient funds. Need $${totalCost.toFixed(2)}, have $${wallet.toFixed(2)}`
            });
            return;
        }

        // Sell validation
        if (tradeType === 'sell') {
            const available = holdings?.quantity || 0;
            if (qty > available) {
                setMessage({
                    type: 'error',
                    text: `Insufficient ${coin.symbol.toUpperCase()}. Need ${qty}, have ${available}`
                });
                return;
            }
        }

        // Show order preview
        setOrderPreview({
            type: tradeType,
            coin: coin.symbol.toUpperCase(),
            coinName: coin.name,
            quantity: qty,
            price: coin.current_price,
            total: totalCost,
            fee: totalCost * 0.001 // 0.1% fee
        });
        setMessage(null);
    };

    const confirmOrder = async () => {
        setSubmitting(true);

        try {
            // Minimum delay to feel real
            const endpoint = tradeType === 'buy' ? '/crypto/buy' : '/crypto/sell';
            const [result] = await Promise.all([
                api.post(endpoint, {
                    coinId: coin.id,
                    quantity: orderPreview.quantity,
                    price: orderPreview.price
                }),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);

            setMessage({
                type: 'success',
                text: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${orderPreview.quantity} ${coin.symbol.toUpperCase()} at $${coin.current_price.toLocaleString()}`
            });

            setOrderPreview(null);
            setQuantity('');

            // Refresh wallet and holdings
            await Promise.all([
                fetchWallet(),
                fetchHoldings()
            ]);
        } catch (err) {
            // ✅ FIXED: Correct error message
            setMessage({
                type: 'error',
                text: err.response?.data?.message || `${tradeType} order failed. Please try again.`
            });
        } finally {
            setSubmitting(false);
        }
    };

    const totalCost = useMemo(() => {
        if (!quantity || !coin) return 0;
        return parseFloat(quantity) * coin.current_price;
    }, [quantity, coin]);

    // Calculate price change for dynamic chart coloring
    const priceChange = useMemo(() => {
        if (chartData.length < 2) return 0;
        const first = chartData[0].price;
        const last = chartData[chartData.length - 1].price;
        return ((last - first) / first) * 100;
    }, [chartData]);

    // Dynamic chart color based on price movement
    const chartColor = priceChange >= 0 ? '#00C853' : '#FF3D00';

    if (!coin) return <div style={{ padding: '2rem' }}>Loading...</div>;

    // Mock Order Book Data
    const bids = Array.from({ length: 10 }, (_, i) => ({
        price: (coin.current_price * (1 - (i + 1) * 0.001)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4)
    }));
    const asks = Array.from({ length: 10 }, (_, i) => ({
        price: (coin.current_price * (1 + (i + 1) * 0.001)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4)
    }));

    return (
        <div className={styles.container}>
            {/* Chart Section */}
            <div className={styles.chartSection}>
                <div className={styles.chartHeader}>
                    <div className={styles.assetName}>
                        <img src={coin.image} alt={coin.name} width={32} />
                        <div>
                            <div className={styles.title}>{coin.name}</div>
                            <Badge variant="neutral">Rank #{coin.market_cap_rank}</Badge>
                        </div>
                    </div>
                    <div className={styles.priceDisplay}>
                        <span className={styles.currentPrice}>${coin.current_price.toLocaleString()}</span>
                        <Badge variant={coin.price_change_percentage_24h >= 0 ? 'success' : 'danger'}>
                            {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                            {coin.price_change_percentage_24h.toFixed(2)}%
                        </Badge>
                        <button
                            className={styles.alertBtn}
                            onClick={() => setAlertModalOpen(true)}
                            title="Set Price Alert"
                        >
                            <Bell size={18} />
                        </button>
                    </div>
                </div>

                {/* Market Stats Bar */}
                <div className={styles.marketStats}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Market Cap</span>
                        <span className={styles.statValue}>${coin.market_cap?.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h Volume</span>
                        <span className={styles.statValue}>${coin.total_volume?.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h High</span>
                        <span className={styles.statValue}>${coin.high_24h?.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h Low</span>
                        <span className={styles.statValue}>${coin.low_24h?.toLocaleString()}</span>
                    </div>
                </div>

                {/* Chart Controls Bar */}
                <div className={styles.chartControls}>
                    {/* Mode Toggle */}
                    <div className={styles.modeToggle}>
                        <button
                            className={`${styles.modeBtn} ${chartMode === 'graph' ? styles.active : ''}`}
                            onClick={() => setChartMode('graph')}
                            title="Line Chart"
                        >
                            <LineChart size={18} />
                        </button>
                        <button
                            className={`${styles.modeBtn} ${chartMode === 'tradingview' ? styles.active : ''}`}
                            onClick={() => setChartMode('tradingview')}
                            title="TradingView (Advanced)"
                        >
                            <CandlestickChart size={18} />
                        </button>
                    </div>

                    {/* Timeframe Selector - Only show for graph mode */}
                    {chartMode === 'graph' && (
                        <div className={styles.timeframeSelector}>
                            <div className={styles.timeframeGroup}>
                                {TIMEFRAMES.filter(tf => tf.group === 'short').map(tf => (
                                    <button
                                        key={tf.value}
                                        className={`${styles.timeframeBtn} ${timeframe === tf.value ? styles.active : ''}`}
                                        onClick={() => setTimeframe(tf.value)}
                                        disabled={chartLoading}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.timeframeDivider} />
                            <div className={styles.timeframeGroup}>
                                {TIMEFRAMES.filter(tf => tf.group === 'long').map(tf => (
                                    <button
                                        key={tf.value}
                                        className={`${styles.timeframeBtn} ${timeframe === tf.value ? styles.active : ''}`}
                                        onClick={() => setTimeframe(tf.value)}
                                        disabled={chartLoading}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Indicators Button - Available in BOTH modes */}
                    <button
                        className={`${styles.indicatorsBtn} ${activeIndicators.length > 0 ? styles.hasActive : ''}`}
                        onClick={() => setIndicatorsPanelOpen(true)}
                        title="Indicators"
                    >
                        <SlidersHorizontal size={16} />
                        <span>Indicators</span>
                        {activeIndicators.length > 0 && (
                            <span className={styles.indicatorCount}>{activeIndicators.length}</span>
                        )}
                    </button>

                    {/* Terminal Button */}
                    <button
                        className={styles.indicatorsBtn}
                        onClick={() => navigate(`/terminal/${id}`)}
                        title="Open Full-Screen Terminal"
                    >
                        <Maximize2 size={16} />
                        <span>Terminal</span>
                    </button>

                </div>

                {/* Chart Container */}
                <div className={styles.chartWrapper}>
                    {chartMode === 'graph' ? (
                        // Graph Mode - Recharts Area Chart
                        chartLoading ? (
                            <div className={styles.chartLoading}>Loading chart data...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#8B949E' }} />
                                    <Tooltip content={<ProfessionalTooltip chartData={chartData} />} />
                                    <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )
                    ) : (
                        // TradingView Mode - Full Advanced Chart
                        <TradingViewChart
                            symbol={coin.symbol}
                            theme="dark"
                            studies={tvStudies}
                        />
                    )}
                </div>
            </div>

            {/* Order Book */}
            <div className={styles.orderBook}>
                <div className={styles.sectionHeader}>Order Book</div>
                <div className={styles.orderList}>
                    {asks.reverse().map((ask, i) => <OrderRow key={i} {...ask} type="ask" />)}
                    <div style={{ padding: '0.5rem', textAlign: 'center', borderTop: '1px solid #30363D', borderBottom: '1px solid #30363D', fontWeight: 'bold' }}>
                        ${coin.current_price.toLocaleString()}
                    </div>
                    {bids.map((bid, i) => <OrderRow key={i} {...bid} type="bid" />)}
                </div>
            </div>

            {/* Trade Panel */}
            <div className={`${styles.tradePanel} ${styles[tradeType]}`}>
                <div className={styles.tradeTabs}>
                    <div
                        className={`${styles.tradeTab} ${tradeType === 'buy' ? styles.active : ''}`}
                        onClick={() => setTradeType('buy')}
                    >
                        Buy
                    </div>
                    <div
                        className={`${styles.tradeTab} ${tradeType === 'sell' ? styles.active : ''}`}
                        onClick={() => setTradeType('sell')}
                    >
                        Sell
                    </div>
                </div>

                {!orderPreview ? (
                    <form className={styles.tradeForm} onSubmit={handlePrepareOrder}>
                        <div className={styles.balanceDisplay}>
                            <span>Available Balance</span>
                            <span className={styles.balanceValue}>
                                {tradeType === 'buy'
                                    ? `$${wallet?.toLocaleString() || '0.00'}`
                                    : `${holdings?.quantity || '0'} ${coin.symbol.toUpperCase()}`
                                }
                            </span>
                        </div>

                        <Input label="Price (USD)" value={coin.current_price} disabled />
                        <Input
                            label={`Amount (${coin.symbol.toUpperCase()})`}
                            type="number"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                        />

                        <div className={styles.sliderContainer}>
                            <input
                                type="range"
                                className={styles.rangeInput}
                                min="0"
                                max="100"
                                onChange={(e) => {
                                    const percent = e.target.value / 100;
                                    if (tradeType === 'buy') {
                                        const maxQty = wallet / coin.current_price;
                                        setQuantity((maxQty * percent).toFixed(8));
                                    } else {
                                        const maxQty = holdings?.quantity || 0;
                                        setQuantity((maxQty * percent).toFixed(8));
                                    }
                                }}
                            />
                            <div className={styles.summary} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Estimate:</span>
                                <span style={{ fontWeight: 600 }}>${totalCost.toLocaleString()}</span>
                            </div>
                            <Button
                                block
                                size="lg"
                                variant={tradeType === 'buy' ? 'primary' : 'danger'}
                                disabled={!quantity || submitting || (tradeType === 'buy' && totalCost > wallet)}
                            >
                                {!wallet ? 'Loading...' :
                                    tradeType === 'buy' && totalCost > wallet ? 'Insufficient Funds' :
                                        `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${coin.symbol.toUpperCase()}`}
                            </Button>
                            {message && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: message.type === 'error' ? 'rgba(255, 61, 0, 0.1)' : 'rgba(0, 200, 83, 0.1)',
                                    color: message.type === 'error' ? 'var(--color-sell)' : 'var(--color-buy)',
                                    fontSize: '0.9rem'
                                }}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className={styles.orderConfirmation}>
                        <h3 className={styles.confirmTitle}>Confirm Order</h3>
                        <div className={styles.orderSummary}>
                            <div className={styles.summaryRow}>
                                <span>Type:</span>
                                <strong className={orderPreview.type === 'buy' ? styles.buyText : styles.sellText}>
                                    {orderPreview.type.toUpperCase()}
                                </strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Asset:</span>
                                <strong>{orderPreview.coinName}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Amount:</span>
                                <strong>{orderPreview.quantity} {orderPreview.coin}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Price:</span>
                                <strong>${orderPreview.price.toLocaleString()}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Fee (0.1%):</span>
                                <strong>${orderPreview.fee.toFixed(2)}</strong>
                            </div>
                            <div className={styles.summaryRow} style={{
                                borderTop: '1px solid var(--border-subtle)',
                                paddingTop: '0.75rem',
                                marginTop: '0.75rem'
                            }}>
                                <span>Total:</span>
                                <strong style={{ fontSize: '1.1rem' }}>
                                    ${(orderPreview.total + orderPreview.fee).toLocaleString()}
                                </strong>
                            </div>
                        </div>
                        <div className={styles.confirmActions}>
                            <Button
                                onClick={confirmOrder}
                                variant={orderPreview.type === 'buy' ? 'primary' : 'danger'}
                                disabled={submitting}
                                block
                            >
                                {submitting ? 'Processing...' : 'Confirm Order'}
                            </Button>
                            <Button
                                onClick={() => setOrderPreview(null)}
                                variant="secondary"
                                disabled={submitting}
                                block
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Trades (Mock) */}
            <div className={styles.recentTrades}>
                <div className={styles.sectionHeader}>Recent Trades</div>
                <div className={styles.orderList}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={styles.orderRow}>
                            <span style={{ color: Math.random() > 0.5 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                                ${(coin.current_price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)}
                            </span>
                            <span className={styles.orderAmt}>{(Math.random()).toFixed(4)}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {new Date().toLocaleTimeString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert Modal */}
            {alertModalOpen && (
                <CreateAlertModal
                    coin={coin}
                    currentPrice={coin.current_price}
                    onClose={() => setAlertModalOpen(false)}
                    onCreated={() => console.log('Alert created!')}
                />
            )}

            {/* Indicators Panel */}
            <IndicatorsPanel
                isOpen={indicatorsPanelOpen}
                onClose={() => setIndicatorsPanelOpen(false)}
                activeIndicators={activeIndicators}
                onToggleIndicator={(id) => {
                    setActiveIndicators(prev =>
                        prev.includes(id)
                            ? prev.filter(i => i !== id)
                            : [...prev, id]
                    );
                }}
            />
        </div>
    );
};

export default CryptoDetail;
