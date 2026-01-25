const bcrypt = require('bcrypt');
const User = require('../models/User');
const Transaction = require('../models/Transaction'); // Import Transaction model

/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile management
 */
class AuthController {
    /**
     * Handle user registration
     */
    static async signup(req, res) {
        const { username, email, password } = req.body;

        try {
            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'All fields are required.' });
            }

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ username }, { email }]
            });

            if (existingUser) {
                return res.status(409).json({ error: 'Username or email already exists.' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                wallet: 0 // Starting wallet amount
            });

            const savedUser = await newUser.save();

            // Set authentication cookie
            res.cookie('user', savedUser._id, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // Return success JSON
            res.status(201).json({
                message: 'Signup successful',
                user: {
                    id: savedUser._id,
                    username: savedUser.username,
                    email: savedUser.email,
                    wallet: savedUser.wallet
                }
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ error: 'An error occurred during signup.' });
        }
    }

    /**
     * Handle user login
     */
    static async login(req, res) {
        const { username, password } = req.body;

        try {
            // Validate input
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required.' });
            }

            // Find user and verify password
            const user = await User.findOne({ username });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ error: 'Invalid username or password.' });
            }

            // Set authentication cookie
            res.cookie('user', user._id, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.json({
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
            res.status(500).json({ error: 'An error occurred during login.' });
        }
    }

    /**
     * Handle user logout
     */
    static logout(req, res) {
        res.clearCookie('user');
        res.json({ message: 'Logged out successfully' });
    }

    /**
     * Get user profile data
     */
    static async getProfile(req, res) {
        try {
            const userId = req.cookies.user;
            const user = await User.findById(userId).select('-password').lean(); // Exclude password

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            // Fetch all transactions for the user, sorted newest first
            const transactions = await Transaction.find({ userId })
                .sort({ timestamp: -1 })
                .limit(10) // Limit to the 10 most recent
                .lean();

            // Format transactions
            const formattedTransactions = transactions.map(tx => {
                const date = new Date(tx.timestamp);
                return {
                    ...tx,
                    coinName: tx.coinId.charAt(0).toUpperCase() + tx.coinId.slice(1),
                    totalValue: tx.totalCost || tx.sellValue || (tx.quantity * tx.price),
                    isBuy: tx.type === 'buy',
                    formattedTimestamp: date.toISOString() // Use ISO for API
                };
            });

            res.json({
                user: user,
                transactions: formattedTransactions
            });
        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ error: 'Error loading profile' });
        }
    }
}

module.exports = AuthController;