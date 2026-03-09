'use strict';

/**
 * TradeController — Production-Grade Atomic Trade Execution
 * ══════════════════════════════════════════════════════════
 *
 * Architecture mirrors Coinbase/Binance backend design:
 *
 *   1. Input validation & sanitisation (outside transaction — cheap)
 *   2. Idempotency check — rejects duplicate requests at DB level
 *   3. Live price fetch + slippage guard (outside transaction — read-only)
 *   4. MongoDB atomic multi-document transaction via withTransaction()
 *      ├─ Debit wallet (atomic $inc + $gte guard — no negative balance possible)
 *      ├─ Upsert portfolio position with new average-cost basis
 *      └─ Insert immutable transaction audit record
 *   5. Post-commit cache invalidation (best-effort, non-blocking)
 *
 * Error taxonomy:
 *   400 — client error (bad input, insufficient funds, price moved too much)
 *   404 — user not found
 *   409 — duplicate trade (idempotency collision)
 *   500 — server / DB error
 *
 * Requirements:
 *   MongoDB must be running as a replica set (even a single-node rs0).
 *   See docs/REPLICA_SET_SETUP.md for local dev instructions.
 */

const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const { fetchCoinGeckoDataWithCache } = require('../utils/geckoApi');
const { redisClient } = require('../utils/redisClient');
const { buildIdempotencyKey, checkSlippage, calculateFee } = require('../utils/tradeGuard');

/* ─── Constants ─────────────────────────────────────────────────── */
const TAKER_FEE_RATE = 0.001;   // 0.1% — standard taker fee
const MAX_SLIPPAGE_PCT = 2;       // 2%   — max price deviation allowed
const COIN_CACHE_TTL_MS = 60 * 60 * 1000;  // 1 hour cache for coin metadata
const PRICE_CACHE_TTL_MS = 60 * 1000;       // 1 minute cache for prices

/**
 * Fallback base prices when CoinGecko is unreachable.
 * Values are intentionally conservative to avoid under-charging.
 */
const FALLBACK_PRICES = {
    bitcoin: 65000, ethereum: 3500, binancecoin: 600, ripple: 0.6,
    cardano: 0.5, solana: 150, dogecoin: 0.1, 'matic-network': 1.2,
    'avalanche-2': 35, chainlink: 12, litecoin: 85, 'bitcoin-cash': 140,
    stellar: 0.12, vechain: 0.03, filecoin: 6, tron: 0.08,
    'ethereum-classic': 22, monero: 160, algorand: 0.2, cosmos: 8,
};

/* ─── Helpers ───────────────────────────────────────────────────── */

/** Fetch live USD price from CoinGecko with in-memory cache fallback. */
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

/** Fetch coin metadata (name, symbol, image) with long-TTL cache. */
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

/** Invalidate Redis portfolio cache — non-blocking, best-effort. */
function invalidatePortfolioCache(userId) {
    redisClient.del(`portfolio:${userId}`).catch(() => { });
}

/* ═══════════════════════════════════════════════════════════════ */

class TradeController {

    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/buy
     * ─────────────────────────────────────────────────────────────
     * Body: { coinId: string, quantity: number, price: number }
     *
     * Flow:
     *   1. Validate + parse inputs
     *   2. Idempotency pre-check (fast duplicate rejection)
     *   3. Fetch live price + slippage guard
     *   4. Fetch coin metadata (for portfolio label)
     *   5. Atomic DB transaction:
     *        a. Debit wallet (guarded — fails if balance < cost+fee)
     *        b. Upsert portfolio (recalculate weighted avg cost)
     *        c. Insert transaction record (with idempotency key)
     *   6. Invalidate cache
     * ─────────────────────────────────────────────────────────────*/
    static async buyCrypto(req, res) {
        // ── 1. Parse & validate ────────────────────────────────────
        const { coinId, quantity, price } = req.body;
        const userId = req.user._id;

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

        // ── 2. Idempotency pre-check ───────────────────────────────
        const idempotencyKey = buildIdempotencyKey(userId, coinId, 'buy', quantityNum, clientPrice);
        const existingTrade = await Transaction.findOne({ idempotencyKey }).lean();
        if (existingTrade) {
            return res.status(409).json({
                error: 'Duplicate trade detected. This exact order has already been executed.',
                transactionId: existingTrade._id
            });
        }

        // ── 3. Live price + slippage guard ─────────────────────────
        const livePrice = await fetchLivePrice(coinId) ?? FALLBACK_PRICES[coinId] ?? null;
        if (livePrice) {
            const { ok, deviation } = checkSlippage(clientPrice, livePrice, MAX_SLIPPAGE_PCT);
            if (!ok) {
                return res.status(400).json({
                    error: `Price has moved ${deviation.toFixed(2)}% since you opened the order (max ${MAX_SLIPPAGE_PCT}%). Please refresh the price and try again.`,
                    livePrice,
                    clientPrice
                });
            }
        }

        // ── 4. Coin metadata (read-only, safe outside transaction) ─
        const coinMeta = await fetchCoinMetadata(coinId);

        // ── 5. Calculate new weighted average cost basis ───────────
        //    Done outside the session (read-only) for performance.
        //    The actual portfolio write is inside the transaction.
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

        // ── 6. ATOMIC TRANSACTION ─────────────────────────────────
        const session = await User.startSession();
        try {
            let purchaseResult;

            await session.withTransaction(async () => {
                // ── a. Debit wallet ──────────────────────────────────
                // Using findOneAndUpdate with $gte guard:
                //   • Atomic — no separate read-then-write race condition
                //   • $gte check + $inc debit happen in a single op
                //   • Returns null if user not found OR balance < totalWithFee
                const updatedUser = await User.findOneAndUpdate(
                    {
                        _id: userId,
                        wallet: { $gte: totalWithFee }       // PREVENTS NEGATIVE BALANCE
                    },
                    { $inc: { wallet: -totalWithFee } },
                    { new: true, session }
                );

                if (!updatedUser) {
                    // Distinguish: user gone vs. insufficient funds
                    const userExists = await User.exists({ _id: userId }).session(session);
                    if (!userExists) {
                        // Throw a named error — withTransaction will NOT retry on non-transient errors
                        const err = new Error('User account not found');
                        err.code = 'USER_NOT_FOUND';
                        throw err;
                    }
                    const err = new Error('Insufficient funds. Your wallet balance is too low to complete this purchase.');
                    err.code = 'INSUFFICIENT_FUNDS';
                    throw err;
                }

                // ── b. Upsert portfolio position ─────────────────────
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
                    { upsert: true, new: true, session }
                );

                // ── c. Insert immutable audit record ──────────────────
                const [tx] = await Transaction.create([{
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
                }], { session });

                purchaseResult = {
                    transactionId: tx._id,
                    coinId,
                    quantity: quantityNum,
                    price: clientPrice,
                    fee,
                    totalWithFee,
                    newBalance: updatedUser.wallet,
                };
            });
            // ── END ATOMIC TRANSACTION ────────────────────────────

            // ── 7. Post-commit side-effects ───────────────────────
            invalidatePortfolioCache(userId);

            return res.status(200).json({
                message: 'Purchase successful',
                ...purchaseResult,
            });

        } catch (error) {
            // Map domain errors to proper HTTP status codes
            if (error.code === 'USER_NOT_FOUND') {
                return res.status(404).json({ error: error.message });
            }
            if (error.code === 'INSUFFICIENT_FUNDS') {
                return res.status(400).json({ error: error.message });
            }
            // Idempotency key violation at DB level (race condition — second request
            // snuck through the pre-check before the first committed)
            if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
                return res.status(409).json({ error: 'Duplicate trade detected.' });
            }

            console.error('[TradeController] buyCrypto error:', error);
            return res.status(500).json({ error: 'Purchase failed due to a server error. Your funds have not been charged.' });
        } finally {
            await session.endSession();
        }
    }


    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/sell
     * ─────────────────────────────────────────────────────────────
     * Body: { coinId: string, quantity: number, price: number }
     *
     * Flow:
     *   1. Validate inputs
     *   2. Idempotency pre-check
     *   3. Pre-flight portfolio check (fast read, outside session)
     *   4. Atomic DB transaction:
     *        a. Decrement portfolio quantity (guarded — fails if qty insufficient)
     *        b. Remove portfolio entry if quantity reaches zero
     *        c. Credit wallet
     *        d. Insert transaction audit record
     *   5. Invalidate cache
     * ─────────────────────────────────────────────────────────────*/
    static async sellCrypto(req, res) {
        // ── 1. Parse & validate ────────────────────────────────────
        const { coinId, quantity, price } = req.body;
        const userId = req.user._id;

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

        // ── 2. Idempotency pre-check ───────────────────────────────
        const idempotencyKey = buildIdempotencyKey(userId, coinId, 'sell', quantityNum, clientPrice);
        const existingTrade = await Transaction.findOne({ idempotencyKey }).lean();
        if (existingTrade) {
            return res.status(409).json({
                error: 'Duplicate trade detected. This exact order has already been executed.',
                transactionId: existingTrade._id
            });
        }

        // ── 3. Pre-flight portfolio check (outside session, fast) ──
        const existingPosition = await Portfolio.findOne({ userId, coinId }).lean();
        if (!existingPosition || existingPosition.quantity < quantityNum) {
            return res.status(400).json({
                error: `Insufficient ${coinId} holdings. You own ${existingPosition?.quantity ?? 0}, trying to sell ${quantityNum}.`
            });
        }

        // ── 4. ATOMIC TRANSACTION ─────────────────────────────────
        const session = await User.startSession();
        try {
            let saleResult;

            await session.withTransaction(async () => {
                // ── a. Decrement portfolio quantity (atomic guard) ────
                // $gte check ensures we never go negative even under concurrency
                const updatedPosition = await Portfolio.findOneAndUpdate(
                    {
                        userId,
                        coinId,
                        quantity: { $gte: quantityNum }      // PREVENTS OVERSELL
                    },
                    { $inc: { quantity: -quantityNum } },
                    { new: true, session }
                );

                if (!updatedPosition) {
                    const err = new Error('Insufficient holdings. Another sell may have already been processed.');
                    err.code = 'INSUFFICIENT_HOLDINGS';
                    throw err;
                }

                // ── b. Remove zero-balance portfolio entries ──────────
                // Uses a floating-point-safe epsilon comparison
                if (updatedPosition.quantity <= 1e-9) {
                    await Portfolio.deleteOne({ userId, coinId }, { session });
                }

                // ── c. Credit wallet (net of fee) ─────────────────────
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { wallet: netEarnings } },
                    { new: true, session }
                );

                // ── d. Insert immutable audit record ──────────────────
                const [tx] = await Transaction.create([{
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
                }], { session });

                saleResult = {
                    transactionId: tx._id,
                    coinId,
                    quantity: quantityNum,
                    price: clientPrice,
                    fee,
                    netEarnings,
                    newBalance: updatedUser?.wallet,
                };
            });
            // ── END ATOMIC TRANSACTION ────────────────────────────

            invalidatePortfolioCache(userId);

            return res.status(200).json({
                message: `Successfully sold ${quantityNum} ${coinId}`,
                ...saleResult,
            });

        } catch (error) {
            if (error.code === 'INSUFFICIENT_HOLDINGS') {
                return res.status(400).json({ error: error.message });
            }
            if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
                return res.status(409).json({ error: 'Duplicate trade detected.' });
            }

            console.error('[TradeController] sellCrypto error:', error);
            return res.status(500).json({ error: 'Sale failed due to a server error. Your holdings have not been affected.' });
        } finally {
            await session.endSession();
        }
    }


    /* ─────────────────────────────────────────────────────────────
     * POST /crypto/trade  (unified endpoint)
     * ─────────────────────────────────────────────────────────────
     * Body: { coinId, quantity, type: 'buy'|'sell', price? }
     *
     * If price is omitted, the server fetches the live price from
     * CoinGecko and uses it directly (avoids any slippage concern).
     * ─────────────────────────────────────────────────────────────*/
    static async executeTrade(req, res) {
        try {
            const { coinId, quantity, type, price } = req.body;

            // ── Validate required fields ───────────────────────────
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

            // ── Resolve price ─────────────────────────────────────
            let resolvedPrice = parseFloat(price);
            if (isNaN(resolvedPrice) || resolvedPrice <= 0) {
                // Fetch live price server-side (no slippage possible — we control the price)
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
