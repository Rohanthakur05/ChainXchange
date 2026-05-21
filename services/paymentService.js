const mongoose = require('mongoose');
const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class PaymentError extends Error {
  constructor(message, errorCode, statusCode = 500, debug = null) {
    super(message);
    this.name = 'PaymentError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.debug = debug;
  }
}

const logPayment = (level, message, meta = {}) => {
  logger[level](message, { service: 'payment', ...meta });
};

/**
 * Run work inside a MongoDB transaction when the deployment supports it.
 * Falls back to non-transactional execution on standalone local MongoDB.
 */
const runWithOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    const notSupported =
      err.code === 20 ||
      err.codeName === 'IllegalOperation' ||
      (err.message && err.message.includes('replica set'));

    if (notSupported) {
      logger.warn('Transactions unavailable — using sequential operations', {
        hint: 'Use MongoDB Atlas or a replica set for full ACID guarantees'
      });
      return work(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
};

const validatePaymentMethod = (method, body) => {
  switch (method) {
    case 'upi': {
      const { upiId } = body;
      if (!upiId || !/^[\w.-]+@[\w]+$/.test(upiId)) {
        throw new PaymentError('Valid UPI ID is required (e.g., name@upi)', 'INVALID_UPI', 400);
      }
      return { upiId };
    }
    case 'card': {
      const { cardNumber, cardExpiry, cardCvv, cardHolder } = body;
      if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
        throw new PaymentError('Complete card details are required', 'INCOMPLETE_CARD', 400);
      }
      return {
        cardNumber: '**** **** **** ' + String(cardNumber).replace(/\s/g, '').slice(-4),
        cardHolder
      };
    }
    case 'bank': {
      const { bankAccount, bankIfsc, bankHolder, bankName } = body;
      if (!bankAccount || !bankIfsc || !bankHolder) {
        throw new PaymentError('Complete bank details are required', 'INCOMPLETE_BANK', 400);
      }
      return {
        bankAccount: '****' + String(bankAccount).slice(-4),
        bankIfsc,
        bankName: bankName || 'Bank Transfer',
        bankHolder
      };
    }
    case 'instant':
      return {};
    default:
      throw new PaymentError(`Unsupported payment method: ${method}`, 'INVALID_METHOD', 400);
  }
};

/**
 * Process a wallet deposit with idempotency and atomic wallet credit.
 */
const processDeposit = async (userId, body) => {
  const {
    amount,
    paymentMethod,
    idempotencyKey
  } = body;

  logPayment('info', 'Payment attempt started', { userId, amount, paymentMethod, idempotencyKey });

  if (amount === undefined || amount === null || amount === '') {
    throw new PaymentError('Amount is required', 'MISSING_AMOUNT', 400);
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new PaymentError('Invalid amount. Must be a positive number.', 'INVALID_AMOUNT', 400);
  }

  if (amountNum > config.paymentMaxDeposit) {
    throw new PaymentError(
      `Maximum single deposit is $${config.paymentMaxDeposit.toLocaleString()}`,
      'AMOUNT_EXCEEDS_LIMIT',
      400
    );
  }

  const method = paymentMethod || 'instant';
  const paymentDetails = validatePaymentMethod(method, body);

  // Idempotency — return cached result for completed payments
  if (idempotencyKey) {
    const existing = await PaymentTransaction.findOne({ idempotencyKey }).lean();
    if (existing) {
      logPayment('info', 'Duplicate payment blocked by idempotency key', {
        userId,
        idempotencyKey,
        existingTxId: existing._id,
        status: existing.status
      });

      if (existing.status === 'completed') {
        const user = await User.findById(userId).lean();
        return {
          success: true,
          message: `Already processed. $${amountNum.toLocaleString()} was added to wallet.`,
          wallet: user?.wallet ?? 0,
          balanceAfter: existing.balanceAfter ?? user?.wallet ?? 0,
          transactionId: existing._id,
          duplicate: true
        };
      }

      if (existing.status === 'pending') {
        throw new PaymentError(
          'Payment is still processing. Please wait a moment.',
          'PAYMENT_PENDING',
          409
        );
      }

      throw new PaymentError(
        'This payment was already attempted. Please retry with a new request.',
        'DUPLICATE_PAYMENT',
        409
      );
    }
  }

  const executeDeposit = async (session) => {
    const opts = session ? { session } : {};

    // 1. Create pending transaction record first (audit trail)
    const [paymentTx] = await PaymentTransaction.create(
      [{
        userId,
        type: 'deposit',
        amount: amountNum,
        paymentMethod: method,
        ...paymentDetails,
        idempotencyKey: idempotencyKey || undefined,
        status: 'pending'
      }],
      opts
    );

    try {
      // 2. Atomically credit wallet
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: amountNum } },
        { new: true, ...opts }
      );

      if (!updatedUser) {
        throw new PaymentError('User account not found', 'USER_NOT_FOUND', 404);
      }

      // 3. Mark transaction completed with balance snapshot
      paymentTx.status = 'completed';
      paymentTx.balanceAfter = updatedUser.wallet;
      await paymentTx.save(opts);

      logPayment('info', 'Payment completed successfully', {
        userId,
        amount: amountNum,
        method,
        transactionId: paymentTx._id,
        newBalance: updatedUser.wallet
      });

      return {
        success: true,
        message: `Successfully added $${amountNum.toLocaleString()} to wallet`,
        wallet: updatedUser.wallet,
        balanceAfter: updatedUser.wallet,
        transactionId: paymentTx._id
      };
    } catch (err) {
      // Roll back wallet credit if it happened
      try {
        await User.findByIdAndUpdate(userId, { $inc: { wallet: -amountNum } }, opts);
        paymentTx.status = 'failed';
        paymentTx.failureReason = err.message;
        await paymentTx.save(opts);
      } catch (rollbackErr) {
        logger.error('Payment rollback failed — manual reconciliation may be needed', {
          userId,
          transactionId: paymentTx._id,
          error: rollbackErr.message
        });
      }
      throw err;
    }
  };

  try {
    return await runWithOptionalTransaction(executeDeposit);
  } catch (err) {
    if (err instanceof PaymentError) throw err;

    logPayment('error', 'Payment failed', {
      userId,
      amount: amountNum,
      method,
      idempotencyKey,
      error: err.message,
      errorName: err.name
    });

    if (err.name === 'ValidationError') {
      const fields = Object.keys(err.errors || {});
      throw new PaymentError(
        `Validation failed for: ${fields.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    if (err.code === 11000) {
      throw new PaymentError(
        'This payment was already processed. Your wallet has been updated.',
        'DUPLICATE_PAYMENT',
        409
      );
    }

    throw new PaymentError(
      'Payment processing failed due to a server error. Please try again.',
      'SERVER_ERROR',
      500,
      config.isDevelopment ? err.message : null
    );
  }
};

const processDemoDeposit = async (userId) => {
  const DEMO_AMOUNT = 1000;
  logPayment('info', 'Demo deposit requested', { userId });

  try {
    return await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: DEMO_AMOUNT } },
        { new: true, ...opts }
      );

      if (!updatedUser) {
        throw new PaymentError('User account not found', 'USER_NOT_FOUND', 404);
      }

      const [paymentTx] = await PaymentTransaction.create(
        [{
          userId,
          type: 'deposit',
          amount: DEMO_AMOUNT,
          paymentMethod: 'demo',
          balanceAfter: updatedUser.wallet,
          status: 'completed'
        }],
        opts
      );

      logPayment('info', 'Demo deposit completed', {
        userId,
        amount: DEMO_AMOUNT,
        newBalance: updatedUser.wallet,
        transactionId: paymentTx._id
      });

      return {
        success: true,
        message: `$${DEMO_AMOUNT.toLocaleString()} demo funds added to your wallet`,
        wallet: updatedUser.wallet,
        balanceAfter: updatedUser.wallet,
        transactionId: paymentTx._id
      };
    });
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    throw new PaymentError('Demo deposit failed. Please try again.', 'SERVER_ERROR', 500);
  }
};

module.exports = {
  PaymentError,
  processDeposit,
  processDemoDeposit,
  logPayment
};
