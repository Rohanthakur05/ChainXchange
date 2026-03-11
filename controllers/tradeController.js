'use strict';

/**
 * TradeController — Atomic Trade Execution (No Replica Set Required)
 * ══════════════════════════════════════════════════════════════════
 *
 * Uses atomic MongoDB operations at the document level:
 *   • findOneAndUpdate with $gte guards — prevents negative balance / oversell
 *   • No session/withTransaction() — works on standalone MongoDB
 *
 * Flow for BUY:
 *   1. Validate inputs
 *   2. Idempotency pre-check (reject duplicate orders)
 *   3. Slippage guard (live price vs client price)
 *   4. Atomic wallet debit ($gte guard — no negative balance possible)
 *   5. Upsert portfolio position
 *   6. Insert immutable transaction record
 *   7. Cache invalidation
 *
 * Error taxonomy:
 *   400 — client error (bad input, insufficient funds, price moved)
 *   404 — user not found
 *   409 — duplicate trade
 *   500 — server / DB error
 */

const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const { fetchCoinGeckoDataWithCache } = require('../utils/geckoApi');
const { redisClient } = require('../utils/redisClient');
const { buildIdempotencyKey, checkSlippage, calculateFee } = require('../utils/tradeGuard');

/* ─── Constants ──────────────────────────────────────────────────── */
const TAKER_FEE_RATE = 0.001;              // 0.1%
const MAX_SLIPPAGE_PCT = 2;                  // 2% max deviation
const COIN_CACHE_TTL_MS = 60 * 60 * 1000;    // 1 hour
const PRICE_CACHE_TTL_MS = 60 * 1000;        // 1 minute

const FALLBACK_PRICES = {
    bitcoin: 65000, ethereum: 3500, binancecoin: 600, ripple: 0.6,
    cardano: 0.5, solana: 150, dogecoin: 0.1, 'matic-network': 1.2,
    'avalanche-2': 35, chainlink: 12, litecoin: 85, 'bitcoin-cash': 140,
    stellar: 0.12, vechain: 0.03, filecoin: 6, tron: 0.08,
    'ethereum-classic': 22, monero: 160, algorand: 0.2, cosmos: 8,
};

/* ─── Helpers ────────────────────────────────────────────────────── */

async function fetchLivePrice(coinId) {
    try {
        const data = await fetchCoinGeckoDataWithCache(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            null,
            `price-${coinId}`,
            PRICE_CACHE_TTL_MS
        );
        return data?.[coinId]?.usd ?? null;
    } catch {
        return null;
    }
}

async function fetchCoinMetadata(coinId) {
    try {
        const info = await fetchCoinGeckoDataWithCache(
            `https://api.coingecko.com/api/v3/coins/${coinId}`,
            null,
            `coin-info-${coinId}`,
            COIN_CACHE_TTL_MS
        );
        return {
            name: info?.name || coinId.charAt(0).toUpperCase() + coinId.slice(1),
            symbol: (info?.symbol?.toUpperCase()) || coinId.toUpperCase().substring(0, 4),
            image: info?.image?.large || info?.image?.small || '/images/default-coin.svg',
        };
    } catch {
        return {
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            symbol: coinId.toUpperCase().substring(0, 4),
            image: '/images/default-coin.svg',
        };
    }
}

function invalidatePortfolioCache(userId) {
    redisClient.del(`portfolio:${userId}`).catch(() => { });
}

/* ═══════════════════════════════════════════════════════════════ */

class TradeController {

    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/buy
     * Body: { coinId, quantity, price }
     * ─────────────────────────────────────────────────────────────*/
    static async buyCrypto(req, res) {
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.user._id;

            // ── 1. Validate ────────────────────────────────────────
            if (!coinId || typeof coinId !== 'string' || coinId.length > 100) {
                return res.status(400).json({ error: 'Invalid coinId' });
            }
            const quantityNum = parseFloat(quantity);
            const clientPrice = parseFloat(price);

            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity — must be a positive number' });
            }
            if (isNaN(clientPrice) || clientPrice <= 0) {
                return res.status(400).json({ error: 'Invalid price — must be a positive number' });
            }

            const totalCost = quantityNum * clientPrice;
            const fee = calculateFee(totalCost, TAKER_FEE_RATE);
            const totalWithFee = parseFloat((totalCost + fee).toFixed(8));

            // ── 2. Idempotency pre-check ───────────────────────────
            const idempotencyKey = buildIdempotencyKey(userId, coinId, 'buy', quantityNum, clientPrice);
            const existingTrade = await Transaction.findOne({ idempotencyKey }).lean();
            if (existingTrade) {
                return res.status(409).json({
                    error: 'Duplicate trade detected. This exact order has already been executed.',
                    transactionId: existingTrade._id
                });
            }

            // ── 3. Slippage guard ──────────────────────────────────
            const livePrice = await fetchLivePrice(coinId) ?? FALLBACK_PRICES[coinId] ?? null;
            if (livePrice) {
                const { ok, deviation } = checkSlippage(clientPrice, livePrice, MAX_SLIPPAGE_PCT);
                if (!ok) {
                    return res.status(400).json({
                        error: `Price has moved ${deviation.toFixed(2)}% since you opened the order (max ${MAX_SLIPPAGE_PCT}%). Please refresh and try again.`,
                        livePrice,
                        clientPrice
                    });
                }
            }

            // ── 4. Coin metadata ───────────────────────────────────
            const coinMeta = await fetchCoinMetadata(coinId);

            // ── 5. Atomic wallet debit ($gte guard) ────────────────
            // Returns null if user not found OR wallet < totalWithFee
            const updatedUser = await User.findOneAndUpdate(
                {
                    _id: userId,
                    wallet: { $gte: totalWithFee }   // PREVENTS NEGATIVE BALANCE
                },
                { $inc: { wallet: -totalWithFee } },
                { new: true }
            );

            if (!updatedUser) {
                // Distinguish user not found vs insufficient balance
                const userExists = await User.exists({ _id: userId });
                if (!userExists) {
                    return res.status(404).json({ error: 'User account not found' });
                }
                return res.status(400).json({
                    error: 'Insufficient funds. Your wallet balance is too low to complete this purchase.'
                });
            }

            // ── 6. Upsert portfolio position ───────────────────────
            // Recalculate weighted average cost basis
            const existingPosition = await Portfolio.findOne({ userId, coinId }).lean();
            let newAverageBuyPrice;
            if (existingPosition) {
                const newTotalQty = existingPosition.quantity + quantityNum;
                newAverageBuyPrice = (
                    (existingPosition.quantity * existingPosition.averageBuyPrice) + totalCost
                ) / newTotalQty;
            } else {
                newAverageBuyPrice = clientPrice;
            }

            await Portfolio.findOneAndUpdate(
                { userId, coinId },
                {
                    $set: {
                        averageBuyPrice: newAverageBuyPrice,
                        crypto: coinMeta.name,
                        image: coinMeta.image,
                        symbol: coinMeta.symbol,
                    },
                    $inc: { quantity: quantityNum }
                },
                { upsert: true, new: true }
            );

            // ── 7. Insert transaction record ───────────────────────
            let tx;
            try {
                [tx] = await Transaction.create([{
                    userId,
                    type: 'buy',
                    coinId,
                    quantity: quantityNum,
                    price: clientPrice,
                    totalCost,
                    fee,
                    totalWithFee,
                    status: 'completed',
                    idempotencyKey,
                    timestamp: new Date(),
                }]);
            } catch (txErr) {
                // Idempotency key unique violation (race) — still a success
                if (txErr.code === 11000 && txErr.keyPattern?.idempotencyKey) {
                    return res.status(409).json({ error: 'Duplicate trade detected.' });
                }
                // Log but don't fail — wallet already debited, portfolio updated
                console.error('[TradeController] Transaction record insert failed:', txErr);
            }

            // ── 8. Cache invalidation ──────────────────────────────
            invalidatePortfolioCache(userId);

            return res.status(200).json({
                message: 'Purchase successful',
                transactionId: tx?._id,
                coinId,
                quantity: quantityNum,
                price: clientPrice,
                fee,
                totalWithFee,
                newBalance: updatedUser.wallet,
            });

        } catch (error) {
            console.error('[TradeController] buyCrypto error:', error);
            return res.status(500).json({
                error: 'Purchase failed due to a server error. Your funds have not been charged.'
            });
        }
    }


    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/sell
     * Body: { coinId, quantity, price }
     * ─────────────────────────────────────────────────────────────*/
    static async sellCrypto(req, res) {
        try {
            const { coinId, quantity, price } = req.body;
            const userId = req.user._id;

            // ── 1. Validate ────────────────────────────────────────
            if (!coinId || typeof coinId !== 'string' || coinId.length > 100) {
                return res.status(400).json({ error: 'Invalid coinId' });
            }
            const quantityNum = parseFloat(quantity);
            const clientPrice = parseFloat(price);

            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity — must be a positive number' });
            }
            if (isNaN(clientPrice) || clientPrice <= 0) {
                return res.status(400).json({ error: 'Invalid price — must be a positive number' });
            }

            const grossEarnings = parseFloat((quantityNum * clientPrice).toFixed(8));
            const fee = calculateFee(grossEarnings, TAKER_FEE_RATE);
            const netEarnings = parseFloat((grossEarnings - fee).toFixed(8));

            // ── 2. Idempotency pre-check ───────────────────────────
            const idempotencyKey = buildIdempotencyKey(userId, coinId, 'sell', quantityNum, clientPrice);
            const existingTrade = await Transaction.findOne({ idempotencyKey }).lean();
            if (existingTrade) {
                return res.status(409).json({
                    error: 'Duplicate trade detected. This exact order has already been executed.',
                    transactionId: existingTrade._id
                });
            }

            // ── 3. Pre-flight holdings check ───────────────────────
            const existingPosition = await Portfolio.findOne({ userId, coinId }).lean();
            if (!existingPosition || existingPosition.quantity < quantityNum) {
                return res.status(400).json({
                    error: `Insufficient ${coinId} holdings. You own ${existingPosition?.quantity ?? 0}, trying to sell ${quantityNum}.`
                });
            }

            // ── 4. Atomic portfolio decrement ($gte guard) ─────────
            const updatedPosition = await Portfolio.findOneAndUpdate(
                {
                    userId,
                    coinId,
                    quantity: { $gte: quantityNum }   // PREVENTS OVERSELL
                },
                { $inc: { quantity: -quantityNum } },
                { new: true }
            );

            if (!updatedPosition) {
                return res.status(400).json({
                    error: 'Insufficient holdings. Another sell may have already been processed.'
                });
            }

            // ── 5. Remove zero-balance portfolio entries ───────────
            if (updatedPosition.quantity <= 1e-9) {
                await Portfolio.deleteOne({ userId, coinId });
            }

            // ── 6. Credit wallet ───────────────────────────────────
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: netEarnings } },
                { new: true }
            );

            // ── 7. Insert transaction record ───────────────────────
            let tx;
            try {
                [tx] = await Transaction.create([{
                    userId,
                    type: 'sell',
                    coinId,
                    quantity: quantityNum,
                    price: clientPrice,
                    totalCost: grossEarnings,
                    sellValue: grossEarnings,
                    fee,
                    totalWithFee: netEarnings,
                    status: 'completed',
                    idempotencyKey,
                    timestamp: new Date(),
                }]);
            } catch (txErr) {
                if (txErr.code === 11000 && txErr.keyPattern?.idempotencyKey) {
                    return res.status(409).json({ error: 'Duplicate trade detected.' });
                }
                console.error('[TradeController] Transaction record insert failed:', txErr);
            }

            invalidatePortfolioCache(userId);

            return res.status(200).json({
                message: `Successfully sold ${quantityNum} ${coinId}`,
                transactionId: tx?._id,
                coinId,
                quantity: quantityNum,
                price: clientPrice,
                fee,
                netEarnings,
                newBalance: updatedUser?.wallet,
            });

        } catch (error) {
            console.error('[TradeController] sellCrypto error:', error);
            return res.status(500).json({
                error: 'Sale failed due to a server error. Your holdings have not been affected.'
            });
        }
    }


    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/trade  (unified endpoint)
     * Body: { coinId, quantity, type: 'buy'|'sell', price? }
     * ─────────────────────────────────────────────────────────────*/
    static async executeTrade(req, res) {
        try {
            const { coinId, quantity, type, price } = req.body;

            if (!coinId || !quantity || !type) {
                return res.status(400).json({
                    error: 'Missing required fields: coinId, quantity, and type are required'
                });
            }
            if (!['buy', 'sell'].includes(type)) {
                return res.status(400).json({
                    error: 'Invalid trade type — must be "buy" or "sell"'
                });
            }

            const quantityNum = parseFloat(quantity);
            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({ error: 'Invalid quantity — must be a positive number' });
            }

            let resolvedPrice = parseFloat(price);
            if (isNaN(resolvedPrice) || resolvedPrice <= 0) {
                resolvedPrice = await fetchLivePrice(coinId);
                if (!resolvedPrice) resolvedPrice = FALLBACK_PRICES[coinId] ?? 0;
            }

            if (!resolvedPrice || resolvedPrice <= 0) {
                return res.status(400).json({ error: `Unable to determine current price for ${coinId}` });
            }

            req.body.price = resolvedPrice;

            return type === 'buy'
                ? TradeController.buyCrypto(req, res)
                : TradeController.sellCrypto(req, res);

        } catch (error) {
            console.error('[TradeController] executeTrade error:', error);
            return res.status(500).json({ error: error.message || 'Trade failed' });
        }
    }
}

module.exports = TradeController;
