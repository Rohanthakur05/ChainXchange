const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');
const {
  processDeposit,
  processDemoDeposit,
  logPayment,
  PaymentError
} = require('../services/paymentService');

class PaymentController {
  /**
   * GET /payment/wallet — transaction history (JSON for SPA)
   */
  static async showWallet(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId).lean();

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
      }

      const transactions = await PaymentTransaction.find({ userId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      return res.json({
        success: true,
        wallet: user.wallet,
        transactions: transactions.map((tx) => ({
          ...tx,
          isDeposit: tx.type === 'deposit',
          formattedTimestamp: new Date(tx.timestamp).toISOString()
        }))
      });
    } catch (error) {
      logPayment('error', 'Wallet page load failed', {
        userId: req.user._id,
        error: error.message
      });
      return res.status(500).json({
        success: false,
        message: 'Error loading wallet',
        errorCode: 'SERVER_ERROR'
      });
    }
  }

  /**
   * POST /payment/add-money
   */
  static async addMoney(req, res, next) {
    try {
      const result = await processDeposit(req.user._id, req.body);
      return res.json(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          message: error.message,
          code: error.errorCode,
          errorCode: error.errorCode,
          ...(error.debug && { debug: error.debug })
        });
      }
      return next(error);
    }
  }

  /**
   * POST /payment/demo-deposit
   */
  static async addDemoFunds(req, res, next) {
    try {
      const result = await processDemoDeposit(req.user._id);
      return res.json(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          message: error.message,
          code: error.errorCode,
          errorCode: error.errorCode
        });
      }
      return next(error);
    }
  }

  /**
   * POST /payment/withdraw
   */
  static async withdrawMoney(req, res) {
    const userId = req.user._id;

    try {
      const { amount, cardNumber, cardHolder, expiryDate, cvv } = req.body;

      if (!amount || !cardNumber || !cardHolder || !expiryDate || !cvv) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          errorCode: 'VALIDATION_ERROR'
        });
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount',
          errorCode: 'INVALID_AMOUNT'
        });
      }

      const maskedCardNumber = '**** **** **** ' + String(cardNumber).slice(-4);

      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, wallet: { $gte: amountNum } },
        { $inc: { wallet: -amountNum } },
        { new: true }
      );

      if (!updatedUser) {
        const exists = await User.exists({ _id: userId });
        if (!exists) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance. Please add funds before withdrawing.',
          errorCode: 'INSUFFICIENT_FUNDS'
        });
      }

      const paymentTx = await PaymentTransaction.create({
        userId,
        type: 'withdrawal',
        amount: amountNum,
        paymentMethod: 'card',
        cardNumber: maskedCardNumber,
        cardHolder,
        balanceAfter: updatedUser.wallet,
        status: 'completed'
      });

      logPayment('info', 'Withdrawal completed', {
        userId,
        amount: amountNum,
        newBalance: updatedUser.wallet,
        transactionId: paymentTx._id
      });

      return res.json({
        success: true,
        message: 'Withdrawal successful',
        newBalance: updatedUser.wallet,
        balanceAfter: updatedUser.wallet,
        transactionId: paymentTx._id
      });
    } catch (error) {
      logPayment('error', 'Withdrawal error', {
        userId,
        error: error.message
      });
      return res.status(500).json({
        success: false,
        message: 'Error processing withdrawal. Please try again.',
        errorCode: 'SERVER_ERROR'
      });
    }
  }
}

module.exports = PaymentController;
