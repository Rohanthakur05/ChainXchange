import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { transformToHeatmap, filterByMarketCap, sortHeatmapData, getHeatmapColor, formatCompact } from '../../services/heatmapService';
import styles from './MarketHeatmap.module.css';

/**
 * MarketHeatmap - Grid visualization of market price changes
 */
const MarketHeatmap = ({ coins = [], loading = false }) => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('marketCap');
    const [hoveredCoin, setHoveredCoin] = useState(null);

    // Transform and filter data
    const heatmapData = useMemo(() => {
        const transformed = transformToHeatmap(coins);
        const filtered = filterByMarketCap(transformed, filter);
        return sortHeatmapData(filtered, sortBy);
    }, [coins, filter, sortBy]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3><Grid size={18} /> Market Heatmap</h3>
                </div>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading market data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h3><Grid size={18} /> Market Heatmap</h3>
                <div className={styles.controls}>
                    <div className={styles.filterGroup}>
                        <Filter size={14} />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className={styles.select}
                        >
                            <option value="all">All Caps</option>
                            <option value="large">Large Cap ($10B+)</option>
                            <option value="mid">Mid Cap ($1B-$10B)</option>
                            <option value="small">Small Cap (&lt;$1B)</option>
                        </select>
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.select}
                    >
                        <option value="marketCap">By Market Cap</option>
                        <option value="priceChange">By Change %</option>
                        <option value="volume">By Volume</option>
                    </select>
                </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: 'hsl(0, 70%, 40%)' }} />
                    <span>-10%+</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: 'hsl(0, 70%, 50%)' }} />
                    <span>-5%</span>
                </div>
                <div className={styles.legendNeutral}>0%</div>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: 'hsl(145, 70%, 50%)' }} />
                    <span>+5%</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: 'hsl(145, 70%, 40%)' }} />
                    <span>+10%+</span>
                </div>
            </div>

            {/* Grid */}
            <div className={styles.grid}>
                {heatmapData.map(coin => (
                    <div
                        key={coin.id}
                        className={styles.cell}
                        style={{
                            backgroundColor: getHeatmapColor(coin.priceChange24h),
                            flexGrow: Math.max(coin.sizeWeight, 1)
                        }}
                        onClick={() => navigate(`/crypto/${coin.id}`)}
                        onMouseEnter={() => setHoveredCoin(coin)}
                        onMouseLeave={() => setHoveredCoin(null)}
                    >
                        <span className={styles.symbol}>{coin.symbol}</span>
                        <span className={styles.change}>
                            {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h.toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            {hoveredCoin && (
                <div className={styles.tooltip}>
                    <div className={styles.tooltipHeader}>
                        <span className={styles.tooltipName}>{hoveredCoin.name}</span>
                        <span className={styles.tooltipSymbol}>{hoveredCoin.symbol}</span>
                    </div>
                    <div className={styles.tooltipStats}>
                        <div className={styles.tooltipStat}>
                            <span>Price</span>
                            <span>${hoveredCoin.price?.toLocaleString()}</span>
                        </div>
                        <div className={styles.tooltipStat}>
                            <span>24h Change</span>
                            <span className={hoveredCoin.isPositive ? styles.positive : styles.negative}>
                                {hoveredCoin.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {hoveredCoin.priceChange24h?.toFixed(2)}%
                            </span>
                        </div>
                        <div className={styles.tooltipStat}>
                            <span>Market Cap</span>
                            <span>{formatCompact(hoveredCoin.marketCap)}</span>
                        </div>
                        <div className={styles.tooltipStat}>
                            <span>Volume</span>
                            <span>{formatCompact(hoveredCoin.volume24h)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {heatmapData.length === 0 && !loading && (
                <div className={styles.empty}>
                    <Grid size={32} />
                    <p>No coins match the current filter</p>
                </div>
            )}
        </div>
    );
};

export default MarketHeatmap;
