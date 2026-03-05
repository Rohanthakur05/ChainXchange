const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { JWT_SECRET } = require('../middleware/auth');

/* ─── Cookie options ──────────────────────────────────────────── */
const COOKIE_OPTIONS = {
    httpOnly: true,                                       // Not accessible via JS
    sameSite: 'lax',                                      // CSRF protection
    secure: process.env.NODE_ENV === 'production',        // HTTPS-only in prod
    maxAge: 7 * 24 * 60 * 60 * 1000                      // 7 days
};

/**
 * Issue a signed JWT and set it as an HttpOnly cookie.
 */
function issueToken(res, user) {
    const payload = { userId: user._id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTIONS);
    return token;
}

/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile management.
 */
class AuthController {
    /**
     * POST /auth/signup
     */
    static async signup(req, res) {
        const { username, email, password } = req.body;

        try {
            // Check for existing user
            const existingUser = await User.findOne({
                $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
            });
            if (existingUser) {
                return res.status(409).json({ error: 'Username or email already exists.' });
            }

            // Hash password and persist user
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = await User.create({
                username: username.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                wallet: 1000 // Starting demo balance
            });

            // Issue JWT
            issueToken(res, newUser);

            return res.status(201).json({
                message: 'Signup successful',
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    wallet: newUser.wallet
                }
            });
        } catch (error) {
            console.error('Signup error:', error);
            return res.status(500).json({ error: 'An error occurred during signup.' });
        }
    }

    /**
     * POST /auth/login
     * Rate-limited by express-rate-limit in routes/auth.js
     */
    static async login(req, res) {
        const { username, password } = req.body;

        try {
            // Find by username or email
            const user = await User.findOne({
                $or: [{ username }, { email: username?.toLowerCase() }]
            });

            if (!user) {
                // Constant-time response — don't reveal whether user exists
                await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacks00000000');
                return res.status(401).json({ error: 'Invalid credentials.' });
            }

            // Check account lockout
            if (user.lockoutUntil && user.lockoutUntil > new Date()) {
                const minutesLeft = Math.ceil((user.lockoutUntil - new Date()) / 60000);
                return res.status(423).json({
                    error: `Account locked. Try again in ${minutesLeft} minute(s).`
                });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                // Increment failed attempt counter
                const attempts = (user.failedLoginAttempts || 0) + 1;
                const updateData = { failedLoginAttempts: attempts };

                if (attempts >= 5) {
                    // Lock for 15 minutes after 5 consecutive failures
                    updateData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
                    updateData.failedLoginAttempts = 0;
                    await User.findByIdAndUpdate(user._id, updateData);
                    return res.status(423).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
                }

                await User.findByIdAndUpdate(user._id, updateData);
                return res.status(401).json({
                    error: 'Invalid credentials.',
                    attemptsRemaining: 5 - attempts
                });
            }

            // Successful login — clear failure counter, issue token
            await User.findByIdAndUpdate(user._id, {
                failedLoginAttempts: 0,
                lockoutUntil: null,
                lastLoginAt: new Date()
            });

            issueToken(res, user);

            return res.json({
                message: 'Login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    wallet: user.wallet
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: 'An error occurred during login.' });
        }
    }

    /**
     * GET /auth/logout
     */
    static logout(req, res) {
        res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
        return res.json({ message: 'Logged out successfully' });
    }

    /**
     * GET /auth/me — lightweight endpoint to re-hydrate the session
     */
    static async getMe(req, res) {
        return res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                wallet: req.user.wallet
            }
        });
    }

    /**
     * GET /auth/profile — profile page with recent transactions
     */
    static async getProfile(req, res) {
        try {
            // req.user already populated by isAuthenticated middleware (uses JWT)
            const userId = req.user._id;

            const [user, transactions] = await Promise.all([
                User.findById(userId).select('-password -failedLoginAttempts -lockoutUntil').lean(),
                Transaction.find({ userId })
                    .sort({ timestamp: -1 })
                    .limit(10)
                    .lean()
            ]);

            if (!user) return res.status(404).json({ error: 'User not found' });

            const formattedTransactions = transactions.map(tx => ({
                ...tx,
                coinName: tx.coinId.charAt(0).toUpperCase() + tx.coinId.slice(1),
                totalValue: tx.totalCost || tx.sellValue || (tx.quantity * tx.price),
                isBuy: tx.type === 'buy',
                formattedTimestamp: new Date(tx.timestamp).toISOString()
            }));

            return res.json({ user, transactions: formattedTransactions });
        } catch (error) {
            console.error('Profile error:', error);
            return res.status(500).json({ error: 'Error loading profile' });
        }
    }

    /**
     * POST /auth/watchlist/toggle
     */
    static async toggleWatchlist(req, res) {
        try {
            const userId = req.user._id;  // From JWT middleware, not req.cookies
            const { coinId } = req.body;

            if (!coinId) return res.status(400).json({ error: 'Coin ID is required' });

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const index = user.watchlist.indexOf(coinId);
            let action;
            if (index > -1) {
                user.watchlist.splice(index, 1);
                action = 'removed';
            } else {
                user.watchlist.push(coinId);
                action = 'added';
            }

            await user.save();
            return res.json({ message: `Successfully ${action} from watchlist`, watchlist: user.watchlist });
        } catch (error) {
            console.error('Watchlist error:', error);
            return res.status(500).json({ error: 'Error updating watchlist' });
        }
    }
}

module.exports = AuthController;