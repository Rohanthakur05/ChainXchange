import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import Input from '../components/ui/Input/Input';
import Badge from '../components/ui/Badge/Badge';
import styles from './CryptoDetail.module.css';

const OrderRow = ({ price, amount, type }) => (
    <div className={styles.orderRow}>
        <span className={type === 'bid' ? styles.bid : styles.ask}>{price}</span>
        <span className={styles.orderAmt}>{amount}</span>
    </div>
);

const CryptoDetail = () => {
    const { id } = useParams();
    const [coin, setCoin] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [tradeType, setTradeType] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchCoinData = async () => {
            if (!id) return;
            try {
                const [detailRes, chartRes] = await Promise.all([
                    api.get(`/crypto/detail/${id}`),
                    api.get(`/crypto/chart-data/${id}?days=30`)
                ]);

                setCoin(detailRes.data.coin);

                const formattedChart = chartRes.data.prices.map(([timestamp, price]) => ({
                    date: new Date(timestamp).toLocaleDateString(),
                    price: price
                }));
                setChartData(formattedChart);
            } catch (err) {
                console.error("Error fetching coin data", err);
            }
        };
        fetchCoinData();
    }, [id]);

    const handleTrade = async (e) => {
        e.preventDefault();
        if (!coin || !quantity) return;

        try {
            const endpoint = tradeType === 'buy' ? '/crypto/buy' : '/crypto/sell';
            await api.post(endpoint, {
                coinId: coin.id,
                quantity,
                price: coin.current_price
            });
            setMessage({ type: 'success', text: `Order Executed` });
            setQuantity('');
            // Clear message after 3s
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Trade Successful' });
        }
    };

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
                            {coin.price_change_percentage_24h.toFixed(2)}%
                        </Badge>
                    </div>
                </div>

                <div className={styles.chartWrapper}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00C853" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#8B949E' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D' }}
                                itemStyle={{ color: '#C9D1D9' }}
                                formatter={(val) => [`$${val.toLocaleString()}`]}
                            />
                            <Area type="monotone" dataKey="price" stroke="#00C853" fillOpacity={1} fill="url(#colorPrice)" />
                        </AreaChart>
                    </ResponsiveContainer>
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
            <div className={styles.tradePanel}>
                <div className={styles.tradeTabs}>
                    <div
                        className={`${styles.tradeTab} ${tradeType === 'buy' ? 'buy active' : ''} ${styles[tradeType === 'buy' ? 'active' : '']}`}
                        onClick={() => setTradeType('buy')}
                    >
                        Buy
                    </div>
                    <div
                        className={`${styles.tradeTab} ${tradeType === 'sell' ? 'sell active' : ''} ${styles[tradeType === 'sell' ? 'active' : '']}`}
                        onClick={() => setTradeType('sell')}
                    >
                        Sell
                    </div>
                </div>

                <form className={styles.tradeForm} onSubmit={handleTrade}>
                    <Input label="Price (USD)" value={coin.current_price} disabled />
                    <Input
                        label={`Amount (${coin.symbol.toUpperCase()})`}
                        type="number"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                    />

                    <div className={styles.sliderContainer}>
                        <input type="range" className={styles.rangeInput} min="0" max="100" />
                        <div className={styles.summary} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Estimate:</span>
                            <span style={{ fontWeight: 600 }}>${(quantity * coin.current_price).toLocaleString()}</span>
                        </div>
                        <Button
                            block
                            size="lg"
                            variant={tradeType === 'buy' ? 'primary' : 'danger'}
                            disabled={!quantity}
                        >
                            {tradeType === 'buy' ? 'Buy' : 'Sell'} {coin.symbol.toUpperCase()}
                        </Button>
                        {message && <div style={{ marginTop: '1rem', color: message.type === 'error' ? 'var(--color-sell)' : 'var(--color-buy)' }}>{message.text}</div>}
                    </div>
                </form>
            </div>

            {/* Recent Trades (Mock) */}
            <div className={styles.recentTrades}>
                <div className={styles.sectionHeader}>Recent Trades</div>
                <div className={styles.orderList}>
                    {/* Mock trades */}
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
        </div>
    );
};

export default CryptoDetail;
