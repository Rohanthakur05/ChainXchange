/**
 * Portfolio Routes
 * GET /api/portfolio          → full portfolio data (holdings, value, P&L)
 * GET /api/portfolio/summary  → lightweight summary for dashboards
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const CryptoController = require('../controllers/cryptoController');

// Full portfolio (holdings + currentValue + P&L per asset)
router.get('/', isAuthenticated, CryptoController.getPortfolio);

// Lightweight summary (coin, amount, value)
router.get('/summary', isAuthenticated, CryptoController.getPortfolioSummary);

module.exports = router;
