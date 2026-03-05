/**
 * validate.js — Input validation middleware
 * Provides reusable validators for trade operations and auth routes.
 * Uses lightweight manual validation (no extra deps needed).
 */

/**
 * Generic validation helper — creates middleware from a spec object.
 * @param {Object} schema — keys are field names, values are validator fns
 */
const validate = (schema) => (req, res, next) => {
    const errors = [];
    for (const [field, validator] of Object.entries(schema)) {
        const value = req.body[field];
        const error = validator(value, field);
        if (error) errors.push(error);
    }
    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }
    next();
};

/* ─── Reusable field validators ───────────────────────────────── */
const required = (field) => (val) => (!val && val !== 0) ? `${field} is required` : null;

const isPositiveNumber = (field) => (val) => {
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) return `${field} must be a positive number`;
    return null;
};

const isString = (minLen = 1, maxLen = 200) => (field) => (val) => {
    if (typeof val !== 'string' || val.trim().length < minLen) return `${field} must be at least ${minLen} characters`;
    if (val.length > maxLen) return `${field} must be at most ${maxLen} characters`;
    return null;
};

const isEmail = (field) => (val) => {
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return `${field} must be a valid email`;
    return null;
};

const compose = (...validators) => (field) => (val) => {
    for (const v of validators) {
        const error = v(field)(val);
        if (error) return error;
    }
    return null;
};

/* ─── Pre-built validators for specific routes ────────────────── */

/** POST /auth/signup */
const validateSignup = validate({
    username: compose(isString(3, 30))('username'),
    email: isEmail('email'),
    password: compose(isString(8, 100))('password'),
});

/** POST /auth/login */
const validateLogin = validate({
    username: (val) => (!val || typeof val !== 'string') ? 'Username is required' : null,
    password: (val) => (!val || typeof val !== 'string') ? 'Password is required' : null,
});

/** POST /crypto/buy  POST /crypto/sell */
const validateTrade = validate({
    coinId: (val) => (!val || typeof val !== 'string' || val.trim().length === 0) ? 'coinId is required' : null,
    quantity: isPositiveNumber('quantity'),
    price: isPositiveNumber('price'),
});

/** POST /crypto/trade (unified endpoint) */
const validateUnifiedTrade = validate({
    coinId: (val) => (!val || typeof val !== 'string') ? 'coinId is required' : null,
    quantity: isPositiveNumber('quantity'),
    type: (val) => (!val || !['buy', 'sell'].includes(val)) ? 'type must be "buy" or "sell"' : null,
});

/** Payment / deposit */
const validateDeposit = validate({
    amount: isPositiveNumber('amount'),
});

module.exports = {
    validate,
    validateSignup,
    validateLogin,
    validateTrade,
    validateUnifiedTrade,
    validateDeposit,
};
