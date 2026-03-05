const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validate');

/* ─── Rate Limiters ──────────────────────────────────────────── */

/**
 * Strict login limiter — 10 attempts per 15 minutes per IP.
 * After 10 fails the IP is blocked for the full window.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    },
    skipSuccessfulRequests: true  // Only count failed attempts against the limit
});

/**
 * Signup limiter — prevent account farming, 5 signups per hour per IP.
 */
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many accounts created from this IP. Please try again later.'
    }
});

/* ─── Routes ─────────────────────────────────────────────────── */

// Public routes (rate-limited)
router.post('/signup', signupLimiter, validateSignup, AuthController.signup);
router.post('/login', loginLimiter, validateLogin, AuthController.login);
router.get('/logout', AuthController.logout);

// Protected routes (JWT required)
router.get('/me', isAuthenticated, AuthController.getMe);
router.get('/profile', isAuthenticated, AuthController.getProfile);
router.post('/watchlist/toggle', isAuthenticated, AuthController.toggleWatchlist);

module.exports = router;