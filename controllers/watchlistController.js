const Watchlist = require('../models/Watchlist');

/**
 * Watchlist Controller
 * Handles CRUD operations for multiple named watchlists per user
 */
class WatchlistController {
    /**
     * Get all watchlists for the authenticated user
     */
    static async getWatchlists(req, res) {
        try {
            const userId = req.cookies.user;

            const watchlists = await Watchlist.find({ userId })
                .sort({ updatedAt: -1 })
                .lean();

            res.json({ watchlists });
        } catch (error) {
            console.error('Get watchlists error:', error);
            res.status(500).json({ error: 'Failed to fetch watchlists' });
        }
    }

    /**
     * Create a new named watchlist
     */
    static async createWatchlist(req, res) {
        try {
            const userId = req.cookies.user;
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'Watchlist name is required' });
            }

            const trimmedName = name.trim();

            // Check if watchlist with same name exists
            const existing = await Watchlist.findOne({
                userId,
                name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
            });

            if (existing) {
                return res.status(409).json({ error: 'Watchlist with this name already exists' });
            }

            const watchlist = await Watchlist.create({
                userId,
                name: trimmedName,
                coins: []
            });

            res.status(201).json({
                message: 'Watchlist created',
                watchlist
            });
        } catch (error) {
            console.error('Create watchlist error:', error);
            if (error.code === 11000) {
                return res.status(409).json({ error: 'Watchlist with this name already exists' });
            }
            res.status(500).json({ error: 'Failed to create watchlist' });
        }
    }

    /**
     * Add a coin to a specific watchlist
     */
    static async addCoin(req, res) {
        try {
            const userId = req.cookies.user;
            const { watchlistId } = req.params;
            const { coinId } = req.body;

            if (!coinId || !coinId.trim()) {
                return res.status(400).json({ error: 'Coin ID is required' });
            }

            const trimmedCoinId = coinId.trim().toLowerCase();

            const watchlist = await Watchlist.findOne({ _id: watchlistId, userId });

            if (!watchlist) {
                return res.status(404).json({ error: 'Watchlist not found' });
            }

            // Check for duplicate
            if (watchlist.coins.includes(trimmedCoinId)) {
                return res.status(409).json({ error: 'Coin already in watchlist' });
            }

            watchlist.coins.push(trimmedCoinId);
            await watchlist.save();

            res.json({
                message: 'Coin added to watchlist',
                watchlist
            });
        } catch (error) {
            console.error('Add coin error:', error);
            res.status(500).json({ error: 'Failed to add coin to watchlist' });
        }
    }

    /**
     * Remove a coin from a specific watchlist
     */
    static async removeCoin(req, res) {
        try {
            const userId = req.cookies.user;
            const { watchlistId, coinId } = req.params;

            const watchlist = await Watchlist.findOne({ _id: watchlistId, userId });

            if (!watchlist) {
                return res.status(404).json({ error: 'Watchlist not found' });
            }

            const coinIndex = watchlist.coins.indexOf(coinId.toLowerCase());
            if (coinIndex === -1) {
                return res.status(404).json({ error: 'Coin not found in watchlist' });
            }

            watchlist.coins.splice(coinIndex, 1);
            await watchlist.save();

            res.json({
                message: 'Coin removed from watchlist',
                watchlist
            });
        } catch (error) {
            console.error('Remove coin error:', error);
            res.status(500).json({ error: 'Failed to remove coin from watchlist' });
        }
    }

    /**
     * Delete an entire watchlist
     */
    static async deleteWatchlist(req, res) {
        try {
            const userId = req.cookies.user;
            const { watchlistId } = req.params;

            const result = await Watchlist.deleteOne({ _id: watchlistId, userId });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Watchlist not found' });
            }

            res.json({ message: 'Watchlist deleted' });
        } catch (error) {
            console.error('Delete watchlist error:', error);
            res.status(500).json({ error: 'Failed to delete watchlist' });
        }
    }

    /**
     * Rename a watchlist
     */
    static async renameWatchlist(req, res) {
        try {
            const userId = req.cookies.user;
            const { watchlistId } = req.params;
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'New name is required' });
            }

            const trimmedName = name.trim();

            // Check if another watchlist with same name exists
            const existing = await Watchlist.findOne({
                userId,
                _id: { $ne: watchlistId },
                name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
            });

            if (existing) {
                return res.status(409).json({ error: 'Watchlist with this name already exists' });
            }

            const watchlist = await Watchlist.findOneAndUpdate(
                { _id: watchlistId, userId },
                { name: trimmedName },
                { new: true }
            );

            if (!watchlist) {
                return res.status(404).json({ error: 'Watchlist not found' });
            }

            res.json({
                message: 'Watchlist renamed',
                watchlist
            });
        } catch (error) {
            console.error('Rename watchlist error:', error);
            res.status(500).json({ error: 'Failed to rename watchlist' });
        }
    }
}

module.exports = WatchlistController;
