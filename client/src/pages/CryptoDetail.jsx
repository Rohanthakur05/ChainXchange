import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart, CandlestickChart, Bell, SlidersHorizontal, Maximize2, Star, ArrowUpRight, ArrowDownRight, ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import { useWallet } from '../context/WalletContext';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button/Button';
import Input from '../components/ui/Input/Input';
import ShortcutBadge from '../components/ui/ShortcutBadge';
import TradingViewChart from '../components/charts/TradingViewChart';
import CreateAlertModal from '../components/alerts/CreateAlertModal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SuccessAnimation from '../components/ui/SuccessAnimation';
import IndicatorsPanel from '../components/charts/IndicatorsPanel';
import WatchlistManager from '../components/dashboard/WatchlistManager';
import styles from './CryptoDetail.module.css';

/* ─── Timeframe config ─── */
const TIMEFRAMES = [
    { label: '5m', value: '5m', days: 1, group: 'short' },
    { label: '15m', value: '15m', days: 1, group: 'short' },
    { label: '1H', value: '1h', days: 1, group: 'short' },
    { label: '4H', value: '4h', days: 1, group: 'short' },
    { label: '24H', value: '24h', days: 1, group: 'short' },
    { label: '1W', value: '1W', days: 7, group: 'long' },
    { label: '1M', value: '1M', days: 30, group: 'long' },
    { label: '1Y', value: '1Y', days: 365, group: 'long' },
    { label: 'ALL', value: 'ALL', days: 'max', group: 'long' },
];

/* ─── Percentage shortcuts ─── */
const PCT_SHORTCUTS = [25, 50, 75, 100];

/* ─── Professional chart tooltip ─── */
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

/* ─── Order Book Row with depth bar ─── */
const OrderRow = ({ price, amount, total, maxTotal, type }) => {
    const depthPct = maxTotal ? ((parseFloat(total) / maxTotal) * 100).toFixed(1) : 0;
    return (
        <div className={styles.orderRow}>
            <div
                className={`${styles.depthBar} ${type === 'bid' ? styles.depthBid : styles.depthAsk}`}
                style={{ width: `${depthPct}%` }}
            />
            <span className={type === 'bid' ? styles.bid : styles.ask}>{price}</span>
            <span className={styles.orderAmt}>{amount}</span>
            <span className={styles.orderTotal}>{total}</span>
        </div>
    );
};

/* ─── Format helpers ─── */
const fmtCompact = (n) => {
    if (!n) return '—';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
};

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
const CryptoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coin, setCoin] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [tradeType, setTradeType] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [message, setMessage] = useState(null);

    const { wallet, getCoinHoldings, executeBuy, executeSell, syncWallet, loading: walletLoading } = useWallet();
    const holdings = getCoinHoldings(id);

    const { setCurrentCoin, registerTradeHandlers, unregisterTradeHandlers } = useKeyboardShortcuts();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [orderPreview, setOrderPreview] = useState(null);
    const [confirmModalError, setConfirmModalError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [timeframe, setTimeframe] = useState('24h');
    const [chartLoading, setChartLoading] = useState(false);
    const [chartMode, setChartMode] = useState('graph');
    const [alertModalOpen, setAlertModalOpen] = useState(false);
    const [indicatorsPanelOpen, setIndicatorsPanelOpen] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
    const [watchlistModalOpen, setWatchlistModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('book'); // 'book' | 'trades'
    const [historyTab, setHistoryTab] = useState('open'); // 'open' | 'history' | 'trades'

    const [activeIndicators, setActiveIndicators] = useState(() => {
        const saved = localStorage.getItem(`chart_indicators_${id}`);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem(`chart_indicators_${id}`, JSON.stringify(activeIndicators));
    }, [activeIndicators, id]);

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
        return [...new Set(activeIndicators.map(id => map[id]).filter(Boolean))];
    }, [activeIndicators]);

    const loadChartData = async (tf) => {
        setChartLoading(true);
        try {
            const selectedTF = TIMEFRAMES.find(t => t.value === tf);
            const response = await api.get(`/crypto/chart-data/${id}?days=${selectedTF.days}`);
            const formattedChart = response.data.prices.map(([timestamp, price]) => ({
                date: new Date(timestamp).toLocaleDateString(),
                price
            }));
            setChartData(formattedChart);
        } catch (err) {
            console.error('Error fetching chart data', err);
        } finally {
            setChartLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/crypto/detail/${id}`)
            .then(r => setCoin(r.data.coin))
            .catch(err => console.error('Error fetching coin data', err))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => { if (id) loadChartData(timeframe); }, [timeframe, id]);

    useEffect(() => {
        if (!coin) return;
        setCurrentCoin({ id: coin.id, name: coin.name, symbol: coin.symbol });
        registerTradeHandlers({
            openBuyModal: () => {
                setTradeType('buy');
                const qi = document.querySelector('input[type="number"]');
                if (qi) { qi.focus(); toast.info('Buy mode active', `Enter amount to buy ${coin.symbol.toUpperCase()}`); }
            },
            openSellModal: () => {
                setTradeType('sell');
                const qi = document.querySelector('input[type="number"]');
                if (qi) { qi.focus(); toast.info('Sell mode active', `Enter amount to sell ${coin.symbol.toUpperCase()}`); }
            },
            toggleWatchlist: () => { setWatchlistModalOpen(true); toast.info('Watchlist', `Manage ${coin.name} in watchlists`); }
        });
        return () => { setCurrentCoin(null); unregisterTradeHandlers(); };
    }, [coin, setCurrentCoin, registerTradeHandlers, unregisterTradeHandlers, toast]);

    useEffect(() => {
        if (!id) return;
        const updatePrice = async () => {
            try {
                const r = await api.get(`/crypto/detail/${id}`);
                setCoin(prev => ({ ...prev, current_price: r.data.coin.current_price, price_change_percentage_24h: r.data.coin.price_change_percentage_24h }));
            } catch { }
        };
        const interval = setInterval(updatePrice, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const handlePrepareOrder = (e) => {
        e.preventDefault();
        if (!quantity || parseFloat(quantity) <= 0) { setMessage({ type: 'error', text: 'Enter a valid quantity' }); return; }
        const qty = parseFloat(quantity);
        const totalCost = qty * coin.current_price;
        if (tradeType === 'buy' && totalCost > wallet) {
            setMessage({ type: 'error', text: `Insufficient funds. Need $${totalCost.toFixed(2)}, have $${wallet.toFixed(2)}` });
            return;
        }
        if (tradeType === 'sell') {
            const available = holdings?.quantity || 0;
            if (qty > available) {
                setMessage({ type: 'error', text: `Insufficient ${coin.symbol.toUpperCase()}. Need ${qty}, have ${available}` });
                return;
            }
        }
        setOrderPreview({ type: tradeType, coin: coin.symbol.toUpperCase(), coinName: coin.name, quantity: qty, price: coin.current_price, total: totalCost, fee: totalCost * 0.001 });
        setMessage(null);
    };

    const confirmOrder = async () => {
        setSubmitting(true);
        setConfirmModalError('');
        const totalCostValue = orderPreview.quantity * orderPreview.price;
        try {
            await Promise.all([
                api.post(tradeType === 'buy' ? '/crypto/buy' : '/crypto/sell', { coinId: coin.id, quantity: orderPreview.quantity, price: orderPreview.price }),
                new Promise(r => setTimeout(r, 500))
            ]);
            tradeType === 'buy' ? executeBuy(coin.id, orderPreview.quantity, totalCostValue) : executeSell(coin.id, orderPreview.quantity, totalCostValue);
            setSuccessMessage({ title: tradeType === 'buy' ? 'Purchase Complete!' : 'Sale Complete!', message: `${orderPreview.quantity} ${coin.symbol.toUpperCase()} at $${coin.current_price.toLocaleString()}` });
            setShowSuccessAnimation(true);
            setOrderPreview(null);
            setQuantity('');
            syncWallet();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.userMessage;
            setConfirmModalError(errorMsg || `${tradeType} order failed. Please try again.`);
        } finally {
            setSubmitting(false);
        }
    };

    /* Derived values */
    const totalCost = useMemo(() => (!quantity || !coin) ? 0 : parseFloat(quantity) * coin.current_price, [quantity, coin]);
    const priceChange = useMemo(() => {
        if (chartData.length < 2) return 0;
        return ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100;
    }, [chartData]);
    const chartColor = priceChange >= 0 ? '#22c55e' : '#ef4444';

    /* Percentage shortcut handler */
    const handlePctShortcut = (pct) => {
        if (!coin) return;
        if (tradeType === 'buy') {
            const maxQty = (wallet * pct / 100) / coin.current_price;
            setQuantity(maxQty.toFixed(8));
        } else {
            const maxSell = (holdings?.quantity || 0) * pct / 100;
            setQuantity(maxSell.toFixed(8));
        }
    };

    /* Order book mock data */
    const { bids, asks, maxTotal } = useMemo(() => {
        if (!coin) return { bids: [], asks: [], maxTotal: 1 };
        const b = Array.from({ length: 12 }, (_, i) => {
            const price = (coin.current_price * (1 - (i + 1) * 0.001)).toFixed(2);
            const amount = (Math.random() * 2 + 0.1).toFixed(4);
            const total = (parseFloat(price) * parseFloat(amount)).toFixed(2);
            return { price, amount, total };
        });
        const a = Array.from({ length: 12 }, (_, i) => {
            const price = (coin.current_price * (1 + (i + 1) * 0.001)).toFixed(2);
            const amount = (Math.random() * 2 + 0.1).toFixed(4);
            const total = (parseFloat(price) * parseFloat(amount)).toFixed(2);
            return { price, amount, total };
        });
        const maxT = Math.max(...[...b, ...a].map(r => parseFloat(r.total)));
        return { bids: b, asks: a, maxTotal: maxT };
    }, [coin?.current_price]);

    /* Recent trades mock */
    const recentTrades = useMemo(() => {
        if (!coin) return [];
        return Array.from({ length: 14 }, (_, i) => {
            const isBuy = Math.random() > 0.5;
            const price = (coin.current_price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2);
            const amount = (Math.random() * 1.5 + 0.01).toFixed(4);
            const now = new Date(Date.now() - i * 8000);
            return { isBuy, price, amount, time: now.toLocaleTimeString() };
        });
    }, [coin?.current_price]);

    const isPositive = coin ? (coin.price_change_percentage_24h || 0) >= 0 : true;

    if (!coin) return (
        <div className={styles.loadingScreen}>
            <div className={styles.spinner} />
            <span>Loading market data...</span>
        </div>
    );

    return (
        <div className={styles.container}>

            {/* ════════════════════════════════════════
                MARKET HEADER — full-width strip
            ════════════════════════════════════════ */}
            <div className={styles.marketHeader}>
                {/* Left: back + coin identity */}
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => navigate('/markets')} title="Back to Markets">
                        <ChevronLeft size={18} />
                    </button>
                    <img src={coin.image} alt={coin.name} className={styles.coinLogo} />
                    <div className={styles.coinIdentity}>
                        <span className={styles.coinName}>{coin.name}</span>
                        <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()} / USDT</span>
                    </div>
                    <div className={styles.rankPill}>#{coin.market_cap_rank}</div>
                </div>

                {/* Center: price + change */}
                <div className={styles.headerPrice}>
                    <span className={styles.currentPrice}>
                        ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 6 : 2 })}
                    </span>
                    <span className={`${styles.priceChange} ${isPositive ? styles.positive : styles.negative}`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                    </span>
                </div>

                {/* Right: stat pills */}
                <div className={styles.headerStats}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h High</span>
                        <span className={styles.statValue}>${coin.high_24h?.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h Low</span>
                        <span className={styles.statValue}>${coin.low_24h?.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Market Cap</span>
                        <span className={styles.statValue}>{fmtCompact(coin.market_cap)}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>24h Volume</span>
                        <span className={styles.statValue}>{fmtCompact(coin.total_volume)}</span>
                    </div>

                    {/* Action icons */}
                    <button className={styles.iconBtn} onClick={() => setAlertModalOpen(true)} title="Set Price Alert">
                        <Bell size={16} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => setWatchlistModalOpen(true)} title="Add to Watchlist">
                        <Star size={16} />
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════════
                TRADING BODY — 3-column grid
                [Chart (flex)] [Order Book / Trades] [Trade Panel]
            ════════════════════════════════════════ */}
            <div className={styles.tradingBody}>

                {/* ── COL 1: CHART ─────────────────── */}
                <div className={styles.chartSection}>
                    {/* Chart controls */}
                    <div className={styles.chartControls}>
                        {/* Mode toggle */}
                        <div className={styles.modeToggle}>
                            <button className={`${styles.modeBtn} ${chartMode === 'graph' ? styles.modeActive : ''}`} onClick={() => setChartMode('graph')} title="Line Chart">
                                <LineChart size={15} />
                            </button>
                            <button className={`${styles.modeBtn} ${chartMode === 'tradingview' ? styles.modeActive : ''}`} onClick={() => setChartMode('tradingview')} title="TradingView">
                                <CandlestickChart size={15} />
                            </button>
                        </div>

                        {/* Timeframes */}
                        {chartMode === 'graph' && (
                            <div className={styles.timeframeSelector}>
                                {TIMEFRAMES.map(tf => (
                                    <button
                                        key={tf.value}
                                        className={`${styles.tfBtn} ${timeframe === tf.value ? styles.tfActive : ''}`}
                                        onClick={() => setTimeframe(tf.value)}
                                        disabled={chartLoading}
                                    >{tf.label}</button>
                                ))}
                            </div>
                        )}

                        {/* Tool buttons */}
                        <div className={styles.chartTools}>
                            <button
                                className={`${styles.toolBtn} ${activeIndicators.length > 0 ? styles.toolActive : ''}`}
                                onClick={() => setIndicatorsPanelOpen(true)}
                            >
                                <SlidersHorizontal size={14} />
                                Indicators
                                {activeIndicators.length > 0 && <span className={styles.indicatorCount}>{activeIndicators.length}</span>}
                            </button>
                            <button className={styles.toolBtn} onClick={() => navigate(`/terminal/${id}`)}>
                                <Maximize2 size={14} />
                                Terminal
                            </button>
                        </div>
                    </div>

                    {/* Chart area */}
                    <div className={styles.chartWrapper}>
                        {chartMode === 'graph' ? (
                            chartLoading ? (
                                <div className={styles.chartLoading}>
                                    <div className={styles.spinner} />
                                    <span>Loading chart...</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                                        <defs>
                                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.28} />
                                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} width={72} />
                                        <Tooltip content={<ProfessionalTooltip chartData={chartData} />} />
                                        <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )
                        ) : (
                            <TradingViewChart symbol={coin.symbol} theme="dark" studies={tvStudies} />
                        )}
                    </div>
                </div>

                {/* ── COL 2: ORDER BOOK / RECENT TRADES ── */}
                <div className={styles.orderSection}>
                    {/* Sub-tab toggle */}
                    <div className={styles.subTabRow}>
                        <button className={`${styles.subTab} ${activeTab === 'book' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('book')}>Order Book</button>
                        <button className={`${styles.subTab} ${activeTab === 'trades' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('trades')}>Trades</button>
                    </div>

                    {activeTab === 'book' ? (
                        <div className={styles.orderBook}>
                            {/* Column headers */}
                            <div className={styles.obHeader}>
                                <span>Price (USD)</span>
                                <span>Amount</span>
                                <span>Total</span>
                            </div>

                            {/* Ask orders (sell) */}
                            <div className={styles.askList}>
                                {[...asks].reverse().map((ask, i) => (
                                    <OrderRow key={`a${i}`} {...ask} maxTotal={maxTotal} type="ask" />
                                ))}
                            </div>

                            {/* Mid price separator */}
                            <div className={`${styles.midPrice} ${isPositive ? styles.midPositive : styles.midNegative}`}>
                                <span className={styles.midPriceValue}>
                                    ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>

                            {/* Bid orders (buy) */}
                            <div className={styles.bidList}>
                                {bids.map((bid, i) => (
                                    <OrderRow key={`b${i}`} {...bid} maxTotal={maxTotal} type="bid" />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Recent Trades panel */
                        <div className={styles.tradesPanel}>
                            <div className={styles.obHeader}>
                                <span>Price (USD)</span>
                                <span>Amount</span>
                                <span>Time</span>
                            </div>
                            <div className={styles.tradesList}>
                                {recentTrades.map((t, i) => (
                                    <div key={i} className={styles.tradeRow}>
                                        <span className={t.isBuy ? styles.bid : styles.ask}>${t.price}</span>
                                        <span className={styles.orderAmt}>{t.amount}</span>
                                        <span className={styles.tradeTime}>{t.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── COL 3: TRADE PANEL ─────────────── */}
                <div className={styles.tradePanel}>
                    {/* Buy / Sell tabs */}
                    <div className={styles.tradeTabs}>
                        <button
                            className={`${styles.tradeTab} ${tradeType === 'buy' ? styles.tradeTabBuy : ''}`}
                            onClick={() => { setTradeType('buy'); setMessage(null); setQuantity(''); }}
                        >
                            Buy <ShortcutBadge shortcutKey="B" />
                        </button>
                        <button
                            className={`${styles.tradeTab} ${tradeType === 'sell' ? styles.tradeTabSell : ''}`}
                            onClick={() => { setTradeType('sell'); setMessage(null); setQuantity(''); }}
                        >
                            Sell <ShortcutBadge shortcutKey="S" />
                        </button>
                    </div>

                    {/* Balance display */}
                    <div className={styles.balanceDisplay}>
                        <span className={styles.balanceLabel}>
                            {tradeType === 'buy' ? 'Available Balance' : `Holdings (${coin.symbol.toUpperCase()})`}
                        </span>
                        <span className={styles.balanceValue}>
                            {walletLoading ? '...' :
                                tradeType === 'buy'
                                    ? `$${wallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `${holdings?.quantity?.toFixed(6) || '0'} ${coin.symbol.toUpperCase()}`
                            }
                        </span>
                    </div>

                    {/* Form */}
                    <form className={styles.tradeForm} onSubmit={handlePrepareOrder}>
                        {/* Price input (readonly) */}
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Price (USD)</label>
                            <Input value={coin.current_price.toLocaleString()} disabled />
                        </div>

                        {/* Amount input */}
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Amount ({coin.symbol.toUpperCase()})</label>
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Percentage shortcuts */}
                        <div className={styles.pctRow}>
                            {PCT_SHORTCUTS.map(p => (
                                <button key={p} type="button" className={styles.pctBtn} onClick={() => handlePctShortcut(p)}>
                                    {p}%
                                </button>
                            ))}
                        </div>

                        {/* Total estimate */}
                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>Total Estimate</span>
                            <span className={styles.totalValue}>
                                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Fee estimate */}
                        <div className={styles.feeRow}>
                            <span className={styles.feeLabel}>Fee (0.1%)</span>
                            <span className={styles.feeValue}>${(totalCost * 0.001).toFixed(4)}</span>
                        </div>

                        {/* Error message */}
                        {message && (
                            <div className={`${styles.tradeMsg} ${message.type === 'error' ? styles.tradeMsgError : styles.tradeMsgSuccess}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            className={`${styles.submitBtn} ${tradeType === 'buy' ? styles.submitBuy : styles.submitSell}`}
                            disabled={!quantity || parseFloat(quantity) <= 0 || submitting || walletLoading || loading || (tradeType === 'buy' && totalCost > wallet)}
                        >
                            {walletLoading || loading ? 'Loading...' :
                                submitting ? 'Processing...' :
                                    tradeType === 'buy' && totalCost > wallet ? 'Insufficient Funds' :
                                        `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${coin.symbol.toUpperCase()}`}
                        </button>
                    </form>
                </div>
            </div>

            {/* ════════════════════════════════════════
                ORDER HISTORY — full-width bottom section
            ════════════════════════════════════════ */}
            <div className={styles.historySection}>
                {/* History tabs */}
                <div className={styles.historyTabs}>
                    {['open', 'history', 'trades'].map(tab => (
                        <button
                            key={tab}
                            className={`${styles.historyTab} ${historyTab === tab ? styles.historyTabActive : ''}`}
                            onClick={() => setHistoryTab(tab)}
                        >
                            {tab === 'open' ? 'Open Orders' : tab === 'history' ? 'Order History' : 'Trade History'}
                        </button>
                    ))}
                </div>

                {/* History content */}
                <div className={styles.historyContent}>
                    <div className={styles.historyTable}>
                        <div className={styles.historyHeader}>
                            <span>Pair</span>
                            <span>Type</span>
                            <span>Price</span>
                            <span>Amount</span>
                            <span>Total</span>
                            <span>Status</span>
                        </div>
                        <div className={styles.historyEmpty}>
                            <span>No {historyTab === 'open' ? 'open orders' : historyTab === 'history' ? 'order history' : 'trade history'} yet</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ────── Modals & Overlays ────── */}
            {alertModalOpen && (
                <CreateAlertModal coin={coin} currentPrice={coin.current_price} onClose={() => setAlertModalOpen(false)} onCreated={() => console.log('Alert created!')} />
            )}

            <IndicatorsPanel
                isOpen={indicatorsPanelOpen}
                onClose={() => setIndicatorsPanelOpen(false)}
                activeIndicators={activeIndicators}
                onToggleIndicator={(indicatorId) => {
                    setActiveIndicators(prev => prev.includes(indicatorId) ? prev.filter(i => i !== indicatorId) : [...prev, indicatorId]);
                }}
            />

            {watchlistModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setWatchlistModalOpen(false)}>
                    <div onClick={e => e.stopPropagation()}>
                        <WatchlistManager coinId={coin.id} coinName={coin.name} onClose={() => setWatchlistModalOpen(false)} />
                    </div>
                </div>
            )}

            {orderPreview && (
                <ConfirmationModal
                    isOpen={!!orderPreview}
                    onClose={() => { setOrderPreview(null); setConfirmModalError(''); }}
                    onConfirm={confirmOrder}
                    type={orderPreview.type}
                    coin={{ name: coin.name, symbol: coin.symbol, image: coin.image }}
                    quantity={orderPreview.quantity}
                    price={orderPreview.price}
                    fee={orderPreview.fee}
                    loading={submitting}
                    error={confirmModalError}
                />
            )}

            <SuccessAnimation
                isVisible={showSuccessAnimation}
                onComplete={() => setShowSuccessAnimation(false)}
                title={successMessage.title}
                message={successMessage.message}
                showConfetti={true}
                duration={2500}
            />
        </div>
    );
};

export default CryptoDetail;
