/**
 * Heatmap Service
 * 
 * Transforms market data for heatmap visualization.
 */

/**
 * Transform coin data for heatmap display
 * @param {Array} coins - Array of coin data from API
 * @returns {Array} Transformed heatmap cells
 */
export const transformToHeatmap = (coins) => {
    if (!coins || coins.length === 0) return [];

    // Calculate max market cap log for sizing
    const maxLogCap = Math.max(...coins.map(c => Math.log10(c.market_cap || 1)));

    return coins.map(coin => {
        const priceChange = coin.price_change_percentage_24h || 0;
        const intensity = Math.min(Math.abs(priceChange) / 10, 1); // Cap at ±10%

        return {
            id: coin.id,
            symbol: coin.symbol?.toUpperCase() || '',
            name: coin.name,
            price: coin.current_price,
            priceChange24h: priceChange,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            // Relative size based on market cap (1-3 scale)
            sizeWeight: 1 + (Math.log10(coin.market_cap || 1) / maxLogCap) * 2,
            // Color intensity (0-1)
            intensity,
            // Is positive change?
            isPositive: priceChange >= 0,
            image: coin.image
        };
    });
};

/**
 * Filter heatmap data by market cap range
 * @param {Array} data - Heatmap data
 * @param {string} filter - 'all' | 'large' | 'mid' | 'small'
 */
export const filterByMarketCap = (data, filter) => {
    if (filter === 'all') return data;

    const thresholds = {
        large: 10_000_000_000,  // $10B+
        mid: 1_000_000_000,     // $1B - $10B
        small: 0                 // < $1B
    };

    return data.filter(coin => {
        const cap = coin.marketCap || 0;
        switch (filter) {
            case 'large':
                return cap >= thresholds.large;
            case 'mid':
                return cap >= thresholds.mid && cap < thresholds.large;
            case 'small':
                return cap < thresholds.mid;
            default:
                return true;
        }
    });
};

/**
 * Sort heatmap data
 * @param {Array} data - Heatmap data
 * @param {string} sortBy - 'marketCap' | 'priceChange' | 'volume'
 */
export const sortHeatmapData = (data, sortBy = 'marketCap') => {
    return [...data].sort((a, b) => {
        switch (sortBy) {
            case 'priceChange':
                return Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h);
            case 'volume':
                return (b.volume24h || 0) - (a.volume24h || 0);
            default: // marketCap
                return (b.marketCap || 0) - (a.marketCap || 0);
        }
    });
};

/**
 * Calculate color based on price change
 * @param {number} priceChange - 24h price change percentage
 * @returns {string} HSL color string
 */
export const getHeatmapColor = (priceChange) => {
    const intensity = Math.min(Math.abs(priceChange) / 10, 1);
    const hue = priceChange >= 0 ? 145 : 0; // Green or Red
    const saturation = 70;
    const lightness = 50 - intensity * 20; // Darker = more intense

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Format large numbers
 */
export const formatCompact = (num) => {
    if (num >= 1_000_000_000) {
        return `$${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `$${(num / 1_000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
};

export default {
    transformToHeatmap,
    filterByMarketCap,
    sortHeatmapData,
    getHeatmapColor,
    formatCompact
};
