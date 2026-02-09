/**
 * Portfolio Service
 * 
 * Calculates portfolio performance history for charts.
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache for historical data

// Cache for historical prices
const priceCache = new Map();

/**
 * Fetch historical prices for a coin
 * @param {string} coinId - CoinGecko coin ID
 * @param {number} days - Number of days of history
 * @returns {Promise<Array>} Array of { date, price } objects
 */
export const fetchHistoricalPrices = async (coinId, days) => {
    const cacheKey = `${coinId}_${days}`;

    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }

    try {
        const response = await fetch(
            `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform to { date, price } format
        const prices = data.prices.map(([timestamp, price]) => ({
            date: new Date(timestamp),
            price
        }));

        // Cache the result
        priceCache.set(cacheKey, {
            data: prices,
            timestamp: Date.now()
        });

        return prices;
    } catch (err) {
        console.error(`Failed to fetch historical prices for ${coinId}:`, err);
        if (cached) return cached.data;
        throw err;
    }
};

/**
 * Calculate portfolio value history
 * @param {Array} holdings - Array of { coinId, amount }
 * @param {number} days - Days of history
 * @returns {Promise<Array>} Array of { date, value } for chart
 */
export const calculatePortfolioHistory = async (holdings, days = 30) => {
    if (!holdings || holdings.length === 0) return [];

    try {
        // Fetch historical prices for all coins in portfolio
        const pricePromises = holdings.map(h =>
            fetchHistoricalPrices(h.coinId, days)
                .then(prices => ({ coinId: h.coinId, amount: h.amount, prices }))
                .catch(() => ({ coinId: h.coinId, amount: h.amount, prices: [] }))
        );

        const holdingPrices = await Promise.all(pricePromises);

        // Find common date range across all coins
        const allDates = new Set();
        holdingPrices.forEach(hp => {
            hp.prices.forEach(p => {
                allDates.add(p.date.toDateString());
            });
        });

        const sortedDates = [...allDates].sort((a, b) => new Date(a) - new Date(b));

        // Build price lookup maps
        const priceMaps = holdingPrices.map(hp => {
            const map = new Map();
            hp.prices.forEach(p => {
                map.set(p.date.toDateString(), p.price);
            });
            return { coinId: hp.coinId, amount: hp.amount, priceMap: map };
        });

        // Calculate portfolio value for each date
        const portfolioHistory = sortedDates.map(dateStr => {
            let totalValue = 0;

            priceMaps.forEach(({ amount, priceMap }) => {
                const price = priceMap.get(dateStr);
                if (price) {
                    totalValue += price * amount;
                }
            });

            return {
                date: new Date(dateStr),
                value: totalValue
            };
        });

        return portfolioHistory;
    } catch (err) {
        console.error('Failed to calculate portfolio history:', err);
        return [];
    }
};

/**
 * Sample data at regular intervals for chart readability
 * @param {Array} data - Raw data array
 * @param {number} maxPoints - Max data points for chart
 */
export const sampleDataPoints = (data, maxPoints = 50) => {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    const sampled = [];

    for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i]);
    }

    // Always include the last point
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
        sampled.push(data[data.length - 1]);
    }

    return sampled;
};

/**
 * Calculate performance metrics
 * @param {Array} history - Portfolio history array
 */
export const calculatePerformanceMetrics = (history) => {
    if (!history || history.length < 2) {
        return {
            change: 0,
            changePercent: 0,
            high: 0,
            low: 0,
            current: 0
        };
    }

    const values = history.map(h => h.value);
    const first = values[0] || 0;
    const current = values[values.length - 1] || 0;
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = current - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    return {
        change,
        changePercent,
        high,
        low,
        current
    };
};

/**
 * Format currency for display
 */
export const formatCurrency = (value) => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
};

/**
 * Clear price cache
 */
export const clearPriceCache = () => {
    priceCache.clear();
};

export default {
    fetchHistoricalPrices,
    calculatePortfolioHistory,
    sampleDataPoints,
    calculatePerformanceMetrics,
    formatCurrency,
    clearPriceCache
};
