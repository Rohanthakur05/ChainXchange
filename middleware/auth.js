const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'chainxchange-dev-secret-change-in-production';

/**
 * Verify JWT token from cookie and attach user to request.
 * Replaces the old raw-cookie-ID pattern.
 */
const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtErr) {
            // Token is expired or tampered — clear the cookie
            res.clearCookie('token');
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        const user = await User.findById(decoded.userId).select('-password').lean();
        if (!user) {
            res.clearCookie('token');
            return res.status(401).json({ error: 'User not found. Please log in again.' });
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Internal Server Error in authentication.' });
    }
};

/**
 * Optional auth — populates req.user if token present, but doesn't block request.
 * Use for routes that work both authenticated and unauthenticated.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.userId).select('-password').lean();
                req.user = user || null;
                res.locals.user = user || null;
            } catch {
                req.user = null;
                res.locals.user = null;
            }
        } else {
            req.user = null;
            res.locals.user = null;
        }
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

const isNotAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return next();
    // Already authenticated — redirect away from login/signup
    return res.redirect('/');
};

module.exports = { isAuthenticated, optionalAuth, isNotAuthenticated, JWT_SECRET };