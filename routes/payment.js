const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

// Wallet page
router.get('/wallet', isAuthenticated, PaymentController.showWallet);

// Add money (real simulated payment — UPI / Card / Bank / Instant)
router.post('/add-money', isAuthenticated, PaymentController.addMoney);

// Demo deposit — instantly credits $1,000 for sandbox/testing purposes
router.post('/demo-deposit', isAuthenticated, PaymentController.addDemoFunds);

// Withdraw money
router.post('/withdraw', isAuthenticated, PaymentController.withdrawMoney);

module.exports = router;

