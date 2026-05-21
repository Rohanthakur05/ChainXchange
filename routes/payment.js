const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');
const { validateDeposit } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please wait before trying again.',
    errorCode: 'RATE_LIMITED'
  }
});

router.get('/wallet', isAuthenticated, asyncHandler(PaymentController.showWallet));
router.post('/add-money', paymentLimiter, isAuthenticated, validateDeposit, asyncHandler(PaymentController.addMoney));
router.post('/demo-deposit', paymentLimiter, isAuthenticated, asyncHandler(PaymentController.addDemoFunds));
router.post('/withdraw', paymentLimiter, isAuthenticated, asyncHandler(PaymentController.withdrawMoney));

module.exports = router;
