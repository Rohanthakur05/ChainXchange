import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from 'lucide-react';
import {
    calculatePortfolioHistory,
    sampleDataPoints,
    calculatePerformanceMetrics,
    formatCurrency
} from '../../services/portfolioService';
import styles from './PortfolioChart.module.css';

const TIME_RANGES = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 }
];

/**
 * PortfolioChart - Line chart showing portfolio value over time
 */
const PortfolioChart = ({ holdings = [] }) => {
    const [range, setRange] = useState(30);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Transform holdings for API
    const portfolioHoldings = useMemo(() =>
        holdings.map(h => ({
            coinId: h.coinId || h.id,
            amount: h.quantity || h.amount || 0
        })).filter(h => h.amount > 0),
        [holdings]
    );

    const loadData = async () => {
        if (portfolioHoldings.length === 0) {
            setChartData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const history = await calculatePortfolioHistory(portfolioHoldings, range);
            const sampled = sampleDataPoints(history, 45);

            // Format for Recharts
            const formatted = sampled.map(d => ({
                date: d.date.getTime(),
                value: d.value,
                label: d.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                })
            }));

            setChartData(formatted);
        } catch (err) {
            setError('Failed to load portfolio history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [portfolioHoldings, range]);

    // Performance metrics
    const metrics = useMemo(() =>
        calculatePerformanceMetrics(chartData.map(d => ({ value: d.value }))),
        [chartData]
    );

    const isPositive = metrics.changePercent >= 0;

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;

        const date = new Date(label);
        return (
            <div className={styles.customTooltip}>
                <p className={styles.tooltipDate}>
                    {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </p>
                <p className={styles.tooltipValue}>
                    {formatCurrency(payload[0].value)}
                </p>
            </div>
        );
    };

    if (portfolioHoldings.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <TrendingUp size={32} />
                    <p>Add holdings to see performance chart</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h3>Portfolio Performance</h3>
                    {!loading && chartData.length > 0 && (
                        <div className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{isPositive ? '+' : ''}{metrics.changePercent.toFixed(2)}%</span>
                        </div>
                    )}
                </div>
                <div className={styles.controls}>
                    <div className={styles.rangeSelector}>
                        {TIME_RANGES.map(r => (
                            <button
                                key={r.value}
                                className={`${styles.rangeBtn} ${range === r.value ? styles.active : ''}`}
                                onClick={() => setRange(r.value)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className={styles.refreshBtn}
                        onClick={loadData}
                        disabled={loading}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? styles.spinning : ''} />
                    </button>
                </div>
            </div>

            {/* Metrics */}
            {!loading && chartData.length > 0 && (
                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Current</span>
                        <span className={styles.metricValue}>{formatCurrency(metrics.current)}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Change</span>
                        <span className={`${styles.metricValue} ${isPositive ? styles.positive : styles.negative}`}>
                            {isPositive ? '+' : ''}{formatCurrency(Math.abs(metrics.change))}
                        </span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>High</span>
                        <span className={styles.metricValue}>{formatCurrency(metrics.high)}</span>
                    </div>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Low</span>
                        <span className={styles.metricValue}>{formatCurrency(metrics.low)}</span>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className={styles.chartWrapper}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Loading chart data...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        <p>{error}</p>
                        <button onClick={loadData}>Retry</button>
                    </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor={isPositive ? '#00C853' : '#ea3943'}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={isPositive ? '#00C853' : '#ea3943'}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                tickFormatter={(value) => formatCurrency(value)}
                                width={70}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={isPositive ? '#00C853' : '#ea3943'}
                                strokeWidth={2}
                                fill="url(#portfolioGradient)"
                                animationDuration={500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className={styles.noData}>
                        <Calendar size={32} />
                        <p>No historical data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortfolioChart;
