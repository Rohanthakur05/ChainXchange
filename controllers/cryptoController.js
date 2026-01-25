const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const { fetchCoinGeckoDataWithCache } = require('../utils/geckoApi');
const redisClient = require('../utils/redisClient'); // Import the shared client

// Cache for portfolio data. TTL of 120 seconds (2 minutes)
const PORTFOLIO_CACHE_TTL = 120; // 2 minutes in seconds

/**
 * Helper function to get base price for common cryptocurrencies
 */
function getBasePriceForCoin(coinId) {
    const basePrices = {
        'bitcoin': 65000,
        'ethereum': 3500,
        'binancecoin': 600,
        'ripple': 0.6,
        'cardano': 0.5,
        'solana': 150,
        'dogecoin': 0.1,
        'matic-network': 1.2,
        'avalanche-2': 35,
        'chainlink': 12,
        'litecoin': 85,
        'bitcoin-cash': 140,
        'stellar': 0.12,
        'vechain': 0.03,
        'filecoin': 6,
        'tron': 0.08,
        'ethereum-classic': 22,
        'monero': 160,
        'algorand': 0.2,
        'cosmos': 8
    };

    return basePrices[coinId] || 100; // Default to $100 if coin not found
}

/**
 * Generate mock chart data for fallback
 */
function generateMockChartData(basePrice, days) {
    const dayCount = parseInt(days);
    let dataPoints = 24; // Default hourly for 1 day
    let interval = 60 * 60 * 1000; // 1 hour

    if (dayCount <= 1) {
        dataPoints = 24; // Hourly
        interval = 60 * 60 * 1000;
    } else if (dayCount <= 7) {
        dataPoints = dayCount * 4; // 6-hour intervals
        interval = 6 * 60 * 60 * 1000;
    } else if (dayCount <= 30) {
        dataPoints = dayCount; // Daily
        interval = 24 * 60 * 60 * 1000;
    } else {
        dataPoints = Math.min(dayCount, 365); // Daily up to a year
        interval = 24 * 60 * 60 * 1000;
    }

    const prices = [];
    const now = Date.now();
    let currentPrice = basePrice;

    for (let i = 0; i < dataPoints; i++) {
        const timestamp = now - (dataPoints - 1 - i) * interval;

        // Add some realistic price movement (±5% maximum change per interval)
        const changePercent = (Math.random() - 0.5) * 0.1; // ±5%
        currentPrice *= (1 + changePercent);

        // Ensure price doesn't go below 10% of base price
        currentPrice = Math.max(currentPrice, basePrice * 0.1);

        prices.push([timestamp, parseFloat(currentPrice.toFixed(8))]);
    }

    return { prices };
}

/**
 * Cryptocurrency Controller
 * Handles crypto trading, portfolio management, and market data
 */
class CryptoController {
    /**
     * Get cryptocurrency markets
     */
    static async getMarkets(req, res) {
        try {
            console.log('Fetching market data...'); // Debug log
            const coins = await Promise.race([
                fetchCoinGeckoDataWithCache(
                    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&locale=en',
                    null,
                    'crypto-markets',
                    5 * 60 * 1000
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
            ]);

            // If no coins received, use fallback data
            if (!coins || coins.length === 0) {
                console.error('No coins received from CoinGecko, using fallback data');
                // Fallback data for testing
                const fallbackCoins = [
                    {
                        id: "bitcoin",
                        symbol: "btc",
                        name: "Bitcoin",
                        current_price: 45000,
                    },
                    {
                        id: "ethereum",
                        symbol: "eth",
                        name: "Ethereum",
                        current_price: 3000,
                    }
                ];

                return res.json({
                    coins: fallbackCoins,
                    isFallback: true,
                    message: 'Using fallback data'
                });
            }

            res.json(coins);
        } catch (error) {
            console.error('Markets error:', error);
            // Render with fallback data instead of error page
            const fallbackCoins = [
                {
                    id: "bitcoin",
                    symbol: "btc",
                    name: "Bitcoin",
                    current_price: 45000,
                },
                {
                    id: "ethereum",
                    symbol: "eth",
                    name: "Ethereum",
                    current_price: 3000,
                }
            ];

            res.json({
                coins: fallbackCoins,
                error: 'Using fallback data - live prices temporarily unavailable',
                isFallback: true
            });
        }
    }

    /**
     * Handle cryptocurrency purchase
     */
    static async buyCrypto(req, res) {
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.cookies.user;

            if (!coinId || !quantity || !price) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const quantityNum = parseFloat(quantity);
            const priceNum = parseFloat(price);
            const totalCost = quantityNum * priceNum;

            if (isNaN(quantityNum) || quantityNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity or price values' });
            }

            // Start fetching user and coin data in parallel
            const userPromise = User.findById(userId).lean();
            const coinDataPromise = fetchCoinGeckoDataWithCache(
                `https://api.coingecko.com/api/v3/coins/${coinId}`,
                null,
                `coin-info-${coinId}`,
                60 * 60 * 1000 // 1 hour cache
            );

            const [user, coinInfo] = await Promise.all([userPromise, coinDataPromise]);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.wallet < totalCost) {
                return res.status(400).json({ error: 'Insufficient funds' });
            }

            const coinData = {
                name: coinInfo.name || coinId.charAt(0).toUpperCase() + coinId.slice(1),
                symbol: coinInfo.symbol?.toUpperCase() || coinId.toUpperCase().substring(0, 4),
                image: coinInfo.image?.large || coinInfo.image?.small || '/images/default-coin.svg'
            };

            // Find existing portfolio to calculate new average price
            const existingPortfolio = await Portfolio.findOne({ userId, coinId }).lean();

            let newAverageBuyPrice;
            if (existingPortfolio) {
                const newTotalQuantity = existingPortfolio.quantity + quantityNum;
                newAverageBuyPrice = ((existingPortfolio.quantity * existingPortfolio.averageBuyPrice) + totalCost) / newTotalQuantity;
            } else {
                newAverageBuyPrice = priceNum;
            }

            // Perform all database writes and cache invalidation concurrently
            await Promise.all([
                User.findByIdAndUpdate(userId, { $inc: { wallet: -totalCost } }),
                Portfolio.findOneAndUpdate(
                    { userId, coinId },
                    {
                        $set: {
                            averageBuyPrice: newAverageBuyPrice,
                            crypto: coinData.name,
                            image: coinData.image,
                            symbol: coinData.symbol
                        },
                        $inc: { quantity: quantityNum }
                    },
                    { upsert: true, new: true }
                ),
                Transaction.create({
                    userId,
                    type: 'buy',
                    coinId,
                    quantity: quantityNum,
                    price: priceNum,
                    totalCost,
                    timestamp: new Date()
                }),
                redisClient.del(`portfolio:${userId}`)
            ]);

            res.json({ message: 'Purchase successful', coinId, quantity: quantityNum });
        } catch (error) {
            console.error('Buy error:', error);
            res.status(500).json({ error: error.message || 'Purchase Error' });
        }
    }

    /**
     * Handle cryptocurrency sale
     */
    static async sellCrypto(req, res) {
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.cookies.user;

            // Validate input
            if (!coinId || !quantity || !price) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const quantityNum = parseFloat(quantity);
            const priceNum = parseFloat(price);
            const totalEarnings = quantityNum * priceNum;

            if (isNaN(quantityNum) || quantityNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity or price values' });
            }

            // Find existing portfolio
            const existingPortfolio = await Portfolio.findOne({ userId, coinId });
            if (!existingPortfolio || existingPortfolio.quantity < quantityNum) {
                return res.status(400).json({ error: 'Insufficient cryptocurrency holdings' });
            }

            // Update user wallet
            await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: totalEarnings } }
            );

            // Update or remove portfolio entry
            const remainingQuantity = existingPortfolio.quantity - quantityNum;
            if (remainingQuantity <= 0) {
                await Portfolio.deleteOne({ userId, coinId });
            } else {
                await Portfolio.findOneAndUpdate(
                    { userId, coinId },
                    { $inc: { quantity: -quantityNum } }
                );
            }

            // Create transaction record
            await Transaction.create({
                userId,
                type: 'sell',
                coinId,
                quantity: quantityNum,
                price: priceNum,
                totalCost: totalEarnings,
                timestamp: new Date()
            });

            // --- CACHE INVALIDATION ---
            // Clear the cached portfolio data for this user
            try {
                await redisClient.del(`portfolio:${userId}`);
            } catch (cacheError) {
                console.error(`Redis DEL error for key portfolio:${userId}:`, cacheError.message);
            }
            // --- END CACHE INVALIDATION ---

            res.json({ message: `Successfully sold ${quantityNum} ${coinId}` });
        } catch (error) {
            console.error('Sell error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get user portfolio
     */
    static async getPortfolio(req, res) {
        try {
            const userId = req.cookies.user;

            // --- PORTFOLIO CACHE CHECK ---
            const cacheKey = `portfolio:${userId}`;

            try {
                const cachedDataString = await redisClient.get(cacheKey);
                if (cachedDataString) {
                    const cachedData = JSON.parse(cachedDataString);
                    const user = await User.findById(userId).lean();

                    return res.json({
                        user: user,
                        holdings: cachedData.holdings,
                        portfolioValue: cachedData.portfolioValue,
                        totalProfitLoss: cachedData.totalProfitLoss,
                        totalProfitLossPercentage: cachedData.totalProfitLossPercentage
                    });
                }
            } catch (cacheError) {
                console.error(`Redis GET error for key ${cacheKey}:`, cacheError.message);
            }
            // --- END CACHE CHECK ---

            const user = await User.findById(userId);
            const portfolio = await Portfolio.find({ userId });

            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            let portfolioData = {
                holdings: [],
                portfolioValue: 0,
                totalProfitLoss: 0,
                totalProfitLossPercentage: 0
            };

            if (portfolio.length > 0) {
                try {
                    // Sort coinIds to ensure stable cache keys
                    const sortedPortfolio = [...portfolio].sort((a, b) => a.coinId.localeCompare(b.coinId));
                    const coinIds = sortedPortfolio.map(p => p.coinId).join(',');

                    // Single API call for all data (prices + metadata)
                    const marketData = await fetchCoinGeckoDataWithCache(
                        `https://api.coingecko.com/api/v3/coins/markets?ids=${coinIds}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1`,
                        null,
                        `portfolio-coins-${coinIds}`,
                        10 * 60 * 1000 // 10 minutes cache
                    );

                    portfolioData = CryptoController._calculatePortfolioMetrics(portfolio, marketData);

                } catch (err) {
                    console.error('Portfolio CoinGecko error:', err);
                    // Fallback logic
                    portfolioData = CryptoController._calculatePortfolioMetrics(portfolio, []);
                }
            }

            // --- STORE DATA IN CACHE ---
            try {
                await redisClient.setEx(cacheKey, PORTFOLIO_CACHE_TTL, JSON.stringify(portfolioData));
            } catch (cacheError) {
                console.error(`Redis SETEX error for key ${cacheKey}:`, cacheError.message);
            }
            // --- END STORE DATA ---

            res.json({
                user: user,
                holdings: portfolioData.holdings,
                portfolioValue: portfolioData.portfolioValue,
                totalProfitLoss: portfolioData.totalProfitLoss,
                totalProfitLossPercentage: portfolioData.totalProfitLossPercentage
            });
        } catch (error) {
            console.error('Portfolio error:', error);
            res.status(500).json({ error: 'Error loading portfolio' });
        }
    }

    /**
     * Helper to calculate portfolio metrics from holdings and market data
     */
    static _calculatePortfolioMetrics(portfolio, marketData) {
        // Create map for O(1) access
        const marketMap = new Map();
        if (marketData && Array.isArray(marketData)) {
            marketData.forEach(coin => marketMap.set(coin.id, coin));
        }

        const holdings = portfolio.map(holding => {
            const coinData = marketMap.get(holding.coinId);

            // Use market price if available, else average buy price (fallback)
            const currentPrice = coinData ? coinData.current_price : holding.averageBuyPrice;
            const currentValue = holding.quantity * currentPrice;
            const totalInvested = holding.quantity * holding.averageBuyPrice;
            const profitLoss = currentValue - totalInvested;
            const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

            // Metadata updates
            let image = holding.image;
            let symbol = holding.symbol;
            let crypto = holding.crypto;

            if (coinData) {
                if (!image || !symbol) {
                    image = coinData.image;
                    symbol = coinData.symbol?.toUpperCase();
                    crypto = coinData.name;

                    // Background DB update for missing metadata
                    if (!holding.image || !holding.symbol) {
                        Portfolio.findOneAndUpdate(
                            { _id: holding._id },
                            { $set: { image, symbol, crypto } }
                        ).catch(console.error);
                    }
                }
            } else {
                // Fallback values
                image = image || '/images/default-coin.svg';
                symbol = symbol || holding.coinId.toUpperCase();
                crypto = crypto || holding.coinId.charAt(0).toUpperCase() + holding.coinId.slice(1);
            }

            return {
                ...holding.toObject(),
                currentPrice,
                currentValue,
                totalInvested,
                profitLoss,
                profitLossPercentage,
                change24h: coinData ? coinData.price_change_percentage_24h : 0,
                image,
                symbol,
                crypto
            };
        });

        const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
        const totalProfitLoss = totalPortfolioValue - totalInvested;
        const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

        return {
            holdings,
            portfolioValue: totalPortfolioValue,
            totalProfitLoss,
            totalProfitLossPercentage
        };
    }

    /**
     * Get user's transaction history
     */
    static async getHistory(req, res) {
        try {
            const userId = req.cookies.user;
            const user = await User.findById(userId).lean();

            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // --- New Sorting/Filtering Logic ---
            const { type, sortBy, order } = req.query;

            // 1. Create Filter Query
            const findQuery = { userId };
            if (type && (type === 'buy' || type === 'sell')) {
                findQuery.type = type;
            }

            // 2. Create Sort Query
            const sortQuery = {};
            const sortOrderVal = order === 'asc' ? 1 : -1; // Default to descending
            const sortByVal = sortBy || 'timestamp'; // Default to timestamp

            // Whitelist sortable fields
            if (['timestamp', 'type', 'price', 'quantity', 'totalCost'].includes(sortByVal)) {
                sortQuery[sortByVal] = sortOrderVal;
            } else {
                sortQuery['timestamp'] = -1; // Default fallback
            }

            // Fetch transactions for the user, applying filters and sorting
            const transactions = await Transaction.find(findQuery)
                .sort(sortQuery)
                .lean();

            // Format transactions for easier display in the view
            const formattedTransactions = transactions.map(tx => {
                const date = new Date(tx.timestamp);
                return {
                    ...tx,
                    coinName: tx.coinId.charAt(0).toUpperCase() + tx.coinId.slice(1),
                    totalValue: tx.totalCost || tx.sellValue || (tx.quantity * tx.price),
                    isBuy: tx.type === 'buy',
                    formattedTimestamp: date.toISOString()
                };
            });

            res.json({
                user,
                transactions: formattedTransactions,
                filters: {
                    type: type || 'all',
                    sortBy: sortByVal,
                    order: order || 'desc'
                }
            });
        } catch (error) {
            console.error('History error:', error);
            res.status(500).json({ error: 'Error loading transaction history' });
        }
    }

    /**
     * Get chart data for cryptocurrency
     */
    static async getChartData(req, res) {
        try {
            const { coinId } = req.params;
            const timeframe = (req.query.timeframe || req.query.days || '24h').toLowerCase();

            const timeframeMap = {
                '1h': { days: '1', interval: 'minute' },
                '24h': { days: '1' },
                '7d': { days: '7' },
                '1m': { days: '30' },
                '3m': { days: '90' },
                '1y': { days: '365' },
                'all': { days: 'max' }
            };

            const selected = timeframeMap[timeframe] || { days: req.query.days || '7' };
            const queryParams = [`vs_currency=usd`, `days=${selected.days}`];
            if (selected.interval) {
                queryParams.push(`interval=${selected.interval}`);
            }

            // Set a shorter timeout for chart requests
            const chartDataPromise = fetchCoinGeckoDataWithCache(
                `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?${queryParams.join('&')}`,
                null,
                `chart-${coinId}-${timeframe}`,
                5 * 60 * 1000 // 5 minutes cache
            );

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Chart request timeout')), 30000) // 30 second timeout
            );

            const chartData = await Promise.race([chartDataPromise, timeoutPromise]);

            // Validate data structure
            if (!chartData || !chartData.prices || !Array.isArray(chartData.prices)) {
                throw new Error('Invalid chart data structure');
            }

            res.json(chartData);
        } catch (error) {
            console.error('Chart data error:', error);

            // Generate realistic fallback data based on coinId and timeframe
            const basePrice = getBasePriceForCoin(req.params.coinId);
            const mockRange = req.query.timeframe || req.query.days || '7';
            const mockData = generateMockChartData(basePrice, mockRange);

            res.json(mockData);
        }
    }

    /**
     * Get detailed cryptocurrency data
     */
    static async getCryptoDetail(req, res) {
        try {
            const { coinId } = req.params;
            const userId = req.cookies.user;

            // Fetch comprehensive coin data, chart data, and user's holdings in parallel
            const [coinData, chartData, userHolding] = await Promise.all([
                fetchCoinGeckoDataWithCache(
                    `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
                    null,
                    `coin-detail-${coinId}`,
                    5 * 60 * 1000 // 5 minutes cache
                ),
                fetchCoinGeckoDataWithCache(
                    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1`,
                    null,
                    `chart-${coinId}-1`,
                    5 * 60 * 1000
                ),
                userId ? Portfolio.findOne({ userId, coinId }).lean() : Promise.resolve(null)
            ]);

            if (!coinData) {
                return res.status(404).json({ error: 'Coin not found' });
            }

            res.json({
                coin: {
                    id: coinData.id,
                    name: coinData.name,
                    symbol: coinData.symbol?.toUpperCase(),
                    image: coinData.image?.large,
                    current_price: coinData.market_data?.current_price?.usd,
                    price_change_24h: coinData.market_data?.price_change_24h,
                    price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h,
                    market_cap: coinData.market_data?.market_cap?.usd,
                    market_cap_rank: coinData.market_cap_rank,
                    total_volume: coinData.market_data?.total_volume?.usd,
                    high_24h: coinData.market_data?.high_24h?.usd,
                    low_24h: coinData.market_data?.low_24h?.usd,
                    ath: coinData.market_data?.ath?.usd,
                    ath_date: coinData.market_data?.ath_date?.usd,
                    atl: coinData.market_data?.atl?.usd,
                    atl_date: coinData.market_data?.atl_date?.usd,
                    circulating_supply: coinData.market_data?.circulating_supply,
                    total_supply: coinData.market_data?.total_supply,
                    max_supply: coinData.market_data?.max_supply,
                    description: coinData.description?.en,
                    genesis_date: coinData.genesis_date
                },
                userHolding,
                chartData: chartData?.prices || [],
                user: res.locals.user
            });
        } catch (error) {
            console.error('Crypto detail error:', error);

            // Fallback data
            const { coinId } = req.params;
            const basePrice = getBasePriceForCoin(coinId);

            res.json({
                coin: {
                    id: coinId,
                    name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                    symbol: coinId.toUpperCase().substring(0, 4),
                    image: '/images/default-coin.svg',
                    current_price: basePrice,
                    price_change_24h: basePrice * 0.025,
                    price_change_percentage_24h: 2.5,
                    market_cap: basePrice * 1000000,
                    market_cap_rank: 1,
                    total_volume: basePrice * 50000,
                    high_24h: basePrice * 1.05,
                    low_24h: basePrice * 0.95,
                    ath: basePrice * 1.2,
                    ath_date: new Date().toISOString(),
                    atl: basePrice * 0.8,
                    atl_date: new Date().toISOString(),
                    circulating_supply: 1000000,
                    total_supply: 1000000,
                    max_supply: 1000000,
                    description: 'No description available.',
                    genesis_date: null
                },
                chartData: generateMockChartData(basePrice, '1').prices,
                user: res.locals.user,
                error: 'Using fallback data',
                isFallback: true
            });
        }
    }
}

module.exports = CryptoController;