const express = require('express');
const router = express.Router();
const CryptoController = require('../controllers/cryptoController');
const TradeController = require('../controllers/tradeController');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { validateTrade, validateUnifiedTrade } = require('../middleware/validate');

// ─── Public market routes ─────────────────────────────────────
router.get('/', CryptoController.getMarkets);
router.get('/chart-data/:coinId', CryptoController.getChartData);

// Coin detail — optionalAuth so authenticated users also get their holdings
router.get('/detail/:coinId', optionalAuth, CryptoController.getCryptoDetail);

// ─── Authenticated trading routes ─────────────────────────────
router.post('/buy', isAuthenticated, validateTrade, TradeController.buyCrypto);
router.post('/sell', isAuthenticated, validateTrade, TradeController.sellCrypto);
router.post('/trade', isAuthenticated, validateUnifiedTrade, TradeController.executeTrade);

// ─── Authenticated user data routes ───────────────────────────
router.get('/portfolio', isAuthenticated, CryptoController.getPortfolio);
router.get('/portfolio/history', isAuthenticated, CryptoController.getPortfolioHistory);
router.get('/transactions', isAuthenticated, CryptoController.getHistory);
router.get('/history', isAuthenticated, CryptoController.getHistory);

// Debug test route (development only)
if (process.env.NODE_ENV !== 'production') {
    router.get('/test-chart/:coinId', (req, res) => {
        const { coinId } = req.params;
        const days = req.query.days || '7';
        const basePrice = coinId === 'bitcoin' ? 65000 : coinId === 'ethereum' ? 3500 : 100;
        const dataPoints = days === '1' ? 24 : days === '7' ? 7 : 30;
        const interval = days === '1' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const prices = Array.from({ length: dataPoints }, (_, i) => {
            const timestamp = Date.now() - (dataPoints - 1 - i) * interval;
            const price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
            return [timestamp, price];
        });
        res.json({ prices, debug: true, coinId, days });
    });
}

module.exports = router;