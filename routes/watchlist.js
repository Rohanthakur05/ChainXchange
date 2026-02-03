const express = require('express');
const router = express.Router();
const WatchlistController = require('../controllers/watchlistController');
const { isAuthenticated } = require('../middleware/auth');

// All watchlist routes require authentication

// Get all user watchlists
router.get('/', isAuthenticated, WatchlistController.getWatchlists);

// Create new watchlist
router.post('/', isAuthenticated, WatchlistController.createWatchlist);

// Add coin to watchlist
router.post('/:watchlistId/coins', isAuthenticated, WatchlistController.addCoin);

// Remove coin from watchlist
router.delete('/:watchlistId/coins/:coinId', isAuthenticated, WatchlistController.removeCoin);

// Rename watchlist
router.patch('/:watchlistId', isAuthenticated, WatchlistController.renameWatchlist);

// Delete watchlist
router.delete('/:watchlistId', isAuthenticated, WatchlistController.deleteWatchlist);

module.exports = router;
