const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const { fetchCoinGeckoDataWithCache } = require('../utils/geckoApi');
const redisClient = require('../utils/redisClient'); // Import the shared client

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
 * Trade Controller
 * Handles robust cryptocurrency buying and selling with MongoDB transactions
 */
class TradeController {

    /**
     * Handle cryptocurrency purchase
     */
    static async buyCrypto(req, res) {
        const session = await User.startSession();
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.user._id;  // From JWT middleware

            const quantityNum = parseFloat(quantity);
            const priceNum = parseFloat(price);
            const totalCost = quantityNum * priceNum;

            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity' });
            }

            // Fetch coin metadata (cached, outside transaction — read-only, safe to do here)
            const coinInfo = await fetchCoinGeckoDataWithCache(
                `https://api.coingecko.com/api/v3/coins/${coinId}`,
                null,
                `coin-info-${coinId}`,
                60 * 60 * 1000
            );

            const coinData = {
                name: coinInfo?.name || coinId.charAt(0).toUpperCase() + coinId.slice(1),
                symbol: coinInfo?.symbol?.toUpperCase() || coinId.toUpperCase().substring(0, 4),
                image: coinInfo?.image?.large || coinInfo?.image?.small || '/images/default-coin.svg'
            };

            // Calculate new average price before transaction (read-only, outside session is fine)
            const existingPortfolio = await Portfolio.findOne({ userId, coinId }).lean();
            let newAverageBuyPrice;
            if (existingPortfolio) {
                const newTotalQuantity = existingPortfolio.quantity + quantityNum;
                newAverageBuyPrice = ((existingPortfolio.quantity * existingPortfolio.averageBuyPrice) + totalCost) / newTotalQuantity;
            } else {
                newAverageBuyPrice = priceNum;
            }

            // ── ATOMIC TRANSACTION ─────────────────────────────────
            // The balance guard is inside the session so two concurrent buy
            // requests cannot both pass the check before either deducts funds.
            session.startTransaction();

            // Atomic debit: only executes if wallet >= totalCost
            // This natively prevents negative balances during concurrent execution!
            const updatedUser = await User.findOneAndUpdate(
                { _id: userId, wallet: { $gte: totalCost } },
                { $inc: { wallet: -totalCost } },
                { new: true, session }
            );

            if (!updatedUser) {
                // Either user not found or insufficient funds
                const exists = await User.exists({ _id: userId }).session(session);
                if (!exists) {
                    await session.abortTransaction();
                    return res.status(404).json({ error: 'User not found' });
                }
                await session.abortTransaction();
                return res.status(400).json({ error: 'Insufficient funds' });
            }

            await Portfolio.findOneAndUpdate(
                { userId, coinId },
                {
                    $set: { averageBuyPrice: newAverageBuyPrice, crypto: coinData.name, image: coinData.image, symbol: coinData.symbol },
                    $inc: { quantity: quantityNum }
                },
                { upsert: true, new: true, session }
            );

            await Transaction.create([{
                userId, type: 'buy', coinId,
                quantity: quantityNum, price: priceNum, totalCost,
                timestamp: new Date()
            }], { session });

            await session.commitTransaction();
            // ── END ATOMIC TRANSACTION ──────────────────────────────

            // Invalidate portfolio cache (outside transaction, best-effort)
            redisClient.del(`portfolio:${userId}`).catch(() => { });

            return res.json({ message: 'Purchase successful', coinId, quantity: quantityNum });
        } catch (error) {
            await session.abortTransaction().catch(() => { });
            console.error('Buy error:', error);
            return res.status(500).json({ error: error.message || 'Purchase failed' });
        } finally {
            session.endSession();
        }
    }

    /**
     * Handle cryptocurrency sale
     */
    static async sellCrypto(req, res) {
        const session = await User.startSession();
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.user._id;  // From JWT middleware

            const quantityNum = parseFloat(quantity);
            const priceNum = parseFloat(price);
            const totalEarnings = quantityNum * priceNum;

            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity' });
            }

            // Pre-flight checks (outside transaction for performance)
            const existingPortfolio = await Portfolio.findOne({ userId, coinId });
            if (!existingPortfolio || existingPortfolio.quantity < quantityNum) {
                return res.status(400).json({ error: 'Insufficient cryptocurrency holdings' });
            }

            // ── ATOMIC TRANSACTION ─────────────────────────────────
            session.startTransaction();

            // Validate that we still have enough quantity atomically inside the transaction
            const portfolioUpdate = await Portfolio.findOneAndUpdate(
                { userId, coinId, quantity: { $gte: quantityNum } },
                { $inc: { quantity: -quantityNum } },
                { new: true, session }
            );

            if (!portfolioUpdate) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Insufficient cryptocurrency holdings for sale' });
            }

            // Clean up 0 balances
            if (portfolioUpdate.quantity <= 0.000000001) {  // Floating-point safe zero check
                await Portfolio.deleteOne({ userId, coinId }, { session });
            }

            // Credit wallet
            await User.findByIdAndUpdate(userId, { $inc: { wallet: totalEarnings } }, { session });

            // Log transaction
            await Transaction.create([{
                userId, type: 'sell', coinId,
                quantity: quantityNum, price: priceNum,
                totalCost: totalEarnings, timestamp: new Date()
            }], { session });

            await session.commitTransaction();
            // ── END ATOMIC TRANSACTION ──────────────────────────────

            // Invalidate cache (best-effort, outside transaction)
            redisClient.del(`portfolio:${userId}`).catch(() => { });

            return res.json({ message: `Successfully sold ${quantityNum} ${coinId}` });
        } catch (error) {
            await session.abortTransaction().catch(() => { });
            console.error('Sell error:', error);
            return res.status(500).json({ error: error.message || 'Sell failed' });
        } finally {
            session.endSession();
        }
    }

    /**
     * Unified trade endpoint - accepts type: 'buy' | 'sell'
     * Used by Terminal mode and any unified trading interface
     */
    static async executeTrade(req, res) {
        try {
            const { coinId, quantity, type, price } = req.body;

            // Validate required fields
            if (!coinId || !quantity || !type) {
                return res.status(400).json({
                    error: 'Missing required fields: coinId, quantity, and type are required'
                });
            }

            if (!['buy', 'sell'].includes(type)) {
                return res.status(400).json({
                    error: 'Invalid trade type. Must be "buy" or "sell"'
                });
            }

            const quantityNum = parseFloat(quantity);
            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity' });
            }

            // Get current price if not provided
            let currentPrice = parseFloat(price);
            if (!currentPrice || isNaN(currentPrice)) {
                try {
                    const coinData = await fetchCoinGeckoDataWithCache(
                        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
                        null,
                        `price-${coinId}`,
                        60 * 1000 // 1 minute cache
                    );
                    currentPrice = coinData?.[coinId]?.usd || 0;
                } catch (err) {
                    currentPrice = getBasePriceForCoin(coinId); // Fallback
                }
            }

            if (!currentPrice || currentPrice <= 0) {
                return res.status(400).json({ error: 'Unable to determine current price' });
            }

            // Modify request body for delegation
            req.body.price = currentPrice;

            // Delegate to appropriate method
            if (type === 'buy') {
                return TradeController.buyCrypto(req, res);
            } else {
                return TradeController.sellCrypto(req, res);
            }
        } catch (error) {
            console.error('Trade execution error:', error);
            res.status(500).json({ error: error.message || 'Trade failed' });
        }
    }
}

module.exports = TradeController;
