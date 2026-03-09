'use strict';
const crypto = require('crypto');

/**
 * Idempotency Guard for Trade Operations
 * ────────────────────────────────────────
 * Generates a deterministic key from the trade's core parameters.
 * The key is stored on the Transaction document so that any retry
 * with identical parameters is rejected as a duplicate.
 *
 * Key inputs: userId + coinId + type + quantity (rounded) + price (rounded)
 * Using SHA‑256 keeps the key short and collision-free.
 */
function buildIdempotencyKey(userId, coinId, type, quantityNum, priceNum) {
    // Round to 8 decimal places to avoid floating-point key mismatches
    const qStr = quantityNum.toFixed(8);
    const pStr = priceNum.toFixed(2);
    const raw = `${userId}:${coinId}:${type}:${qStr}:${pStr}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Price slippage guard
 * ─────────────────────
 * Verifies that the price submitted by the client has not moved beyond
 * the acceptable slippage threshold vs. the live server-side price.
 *
 * @param {number} clientPrice   — price sent from the browser
 * @param {number} serverPrice   — live price fetched server-side
 * @param {number} maxSlippagePct — max allowed deviation (default 2%)
 * @returns {{ ok: boolean, deviation: number }}
 */
function checkSlippage(clientPrice, serverPrice, maxSlippagePct = 2) {
    if (!serverPrice || serverPrice <= 0) {
        // Cannot validate — skip guard (price feed unavailable)
        return { ok: true, deviation: 0 };
    }
    const deviation = Math.abs((clientPrice - serverPrice) / serverPrice) * 100;
    return { ok: deviation <= maxSlippagePct, deviation };
}

/**
 * Trading fee calculator
 * ───────────────────────
 * Standard taker fee: 0.1% of total trade value.
 * Returns the fee rounded to 8 decimal places (sub-cent precision).
 *
 * @param {number} totalCost — quantity × price
 * @param {number} feeRate   — default 0.001 (0.1%)
 */
function calculateFee(totalCost, feeRate = 0.001) {
    return parseFloat((totalCost * feeRate).toFixed(8));
}

module.exports = { buildIdempotencyKey, checkSlippage, calculateFee };
