import React from 'react';
import { TrendingUp, TrendingDown, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './MarketPulseBar.module.css';

/**
 * MarketPulseBar - Top summary row showing market sentiment and key prices
 * Props:
 * - fearGreedValue: number (0-100)
 * - btcData: { price, change }
 * - ethData: { price, change }
 * - balance: number (optional)
 * - pnl: { value, percent } (optional)
 */
const MarketPulseBar = ({ fearGreedValue = 50, btcData, ethData, balance, pnl }) => {
    const getSentimentLabel = (value) => {
        if (value <= 20) return { label: 'Extreme Fear', color: '#ea3943' };
        if (value <= 40) return { label: 'Fear', color: '#f5a623' };
        if (value <= 60) return { label: 'Neutral', color: '#808080' };
        if (value <= 80) return { label: 'Greed', color: '#83bf6e' };
        return { label: 'Extreme Greed', color: '#00c853' };
    };

    const sentiment = getSentimentLabel(fearGreedValue);

    const formatPrice = (price) => {
        if (!price) return '$0.00';
        if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatChange = (change) => {
        if (!change && change !== 0) return '0.00%';
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    return (
        <div className={styles.pulseBar}>
            {/* Left: Market Indicators */}
            <div className={styles.leftSection}>
                {/* Fear & Greed Mini */}
                <div className={styles.fearGreedMini}>
                    <Gauge size={18} style={{ color: sentiment.color }} />
                    <div className={styles.fearGreedContent}>
                        <span className={styles.fearGreedValue} style={{ color: sentiment.color }}>
                            {fearGreedValue}
                        </span>
                        <span className={styles.fearGreedLabel}>{sentiment.label}</span>
                    </div>
                </div>

                {/* BTC Mini Card */}
                {btcData && (
                    <Link to="/markets/bitcoin" className={styles.coinMini}>
                        <img
                            src="https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
                            alt="BTC"
                            className={styles.coinIcon}
                        />
                        <div className={styles.coinData}>
                            <span className={styles.coinSymbol}>BTC</span>
                            <span className={styles.coinPrice}>{formatPrice(btcData.price)}</span>
                        </div>
                        <span className={`${styles.coinChange} ${btcData.change >= 0 ? styles.positive : styles.negative}`}>
                            {btcData.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {formatChange(btcData.change)}
                        </span>
                    </Link>
                )}

                {/* ETH Mini Card */}
                {ethData && (
                    <Link to="/markets/ethereum" className={styles.coinMini}>
                        <img
                            src="https://assets.coingecko.com/coins/images/279/small/ethereum.png"
                            alt="ETH"
                            className={styles.coinIcon}
                        />
                        <div className={styles.coinData}>
                            <span className={styles.coinSymbol}>ETH</span>
                            <span className={styles.coinPrice}>{formatPrice(ethData.price)}</span>
                        </div>
                        <span className={`${styles.coinChange} ${ethData.change >= 0 ? styles.positive : styles.negative}`}>
                            {ethData.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {formatChange(ethData.change)}
                        </span>
                    </Link>
                )}
            </div>

            {/* Right: Portfolio Summary */}
            {(balance !== undefined || pnl) && (
                <div className={styles.rightSection}>
                    {balance !== undefined && (
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Balance</span>
                            <span className={styles.statValue}>${balance.toLocaleString()}</span>
                        </div>
                    )}
                    {pnl && (
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>24h P&L</span>
                            <span className={`${styles.statValue} ${pnl.value >= 0 ? styles.positive : styles.negative}`}>
                                {pnl.value >= 0 ? '+' : ''}${Math.abs(pnl.value).toLocaleString()}
                                <span className={styles.statPercent}>({pnl.percent >= 0 ? '+' : ''}{pnl.percent.toFixed(2)}%)</span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketPulseBar;
