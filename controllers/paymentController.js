const mongoose = require('mongoose');
const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');

/**
 * Structured logger for payment events.
 * In production, replace with Winston/Pino and ship to a log aggregator.
 */
const logPayment = (level, message, meta = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        service: 'payment',
        level,
        message,
        ...meta
    };
    if (level === 'error') {
        console.error(JSON.stringify(entry));
    } else {
        console.log(JSON.stringify(entry));
    }
};

class PaymentController {
    /**
     * Show payment/wallet page
     */
    static async showWallet(req, res) {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId).lean();

            if (!user) {
                return res.redirect('/auth/login');
            }

            // Fetch payment transaction history
            const transactions = await PaymentTransaction.find({ userId })
                .sort({ timestamp: -1 })
                .lean();

            // Format transactions
            const formattedTransactions = transactions.map(tx => {
                const date = new Date(tx.timestamp);
                const formattedDate = date.toLocaleDateString('en-GB');
                const formattedTime = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                return {
                    ...tx,
                    formattedTimestamp: `${formattedDate} ${formattedTime}`,
                    isDeposit: tx.type === 'deposit'
                };
            });

            res.render('wallet', {
                title: 'Wallet',
                user: user,
                transactions: formattedTransactions
            });
        } catch (error) {
            logPayment('error', 'Wallet page load failed', {
                userId: req.user._id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).render('error', {
                message: 'Error loading wallet',
                error: process.env.NODE_ENV === 'development' ? error.message : null
            });
        }
    }

    /**
     * Process add money - supports UPI, Card, Bank Transfer
     *
     * Production safeguards:
     *  1. Idempotency key prevents duplicate deposits on double-click / retry
     *  2. MongoDB session ensures atomicity between PaymentTransaction creation and wallet update
     *  3. Detailed error classification (validation vs. server) for helpful UI messages
     *  4. Structured logging for every payment attempt
     */
    static async addMoney(req, res) {
        const userId = req.user._id;
        const {
            amount,
            paymentMethod,
            idempotencyKey,
            // UPI fields
            upiId,
            // Card fields
            cardNumber, cardExpiry, cardCvv, cardHolder,
            // Bank fields
            bankAccount, bankIfsc, bankName, bankHolder
        } = req.body;

        logPayment('info', 'Payment attempt started', {
            userId,
            amount,
            paymentMethod,
            idempotencyKey
        });

        // ── 1. Input validation ──────────────────────────────────────────

        if (!amount) {
            return res.status(400).json({
                success: false,
                error: 'Amount is required',
                code: 'MISSING_AMOUNT'
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be a positive number.',
                code: 'INVALID_AMOUNT'
            });
        }

        if (amountNum > 100000) {
            return res.status(400).json({
                success: false,
                error: 'Maximum single deposit is $100,000',
                code: 'AMOUNT_EXCEEDS_LIMIT'
            });
        }

        // ── 2. Payment method validation ─────────────────────────────────

        const method = paymentMethod || 'instant';
        let paymentDetails = {};

        switch (method) {
            case 'upi':
                if (!upiId || !/^[\w.-]+@[\w]+$/.test(upiId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Valid UPI ID is required (e.g., name@upi)',
                        code: 'INVALID_UPI'
                    });
                }
                paymentDetails = { upiId };
                break;

            case 'card':
                if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
                    return res.status(400).json({
                        success: false,
                        error: 'Complete card details are required',
                        code: 'INCOMPLETE_CARD'
                    });
                }
                paymentDetails = {
                    cardNumber: '**** **** **** ' + cardNumber.slice(-4),
                    cardHolder
                };
                break;

            case 'bank':
                if (!bankAccount || !bankIfsc || !bankHolder) {
                    return res.status(400).json({
                        success: false,
                        error: 'Complete bank details are required',
                        code: 'INCOMPLETE_BANK'
                    });
                }
                paymentDetails = {
                    bankAccount: '****' + bankAccount.slice(-4),
                    bankIfsc,
                    bankName: bankName || 'Bank Transfer',
                    bankHolder
                };
                break;

            case 'instant':
                paymentDetails = {};
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported payment method: ${method}`,
                    code: 'INVALID_METHOD'
                });
        }

        // ── 3. Idempotency check ─────────────────────────────────────────
        // If the client sent an idempotency key and we already processed it,
        // return the original result instead of creating a duplicate.

        if (idempotencyKey) {
            const existing = await PaymentTransaction.findOne({ idempotencyKey }).lean();
            if (existing) {
                logPayment('info', 'Duplicate payment blocked by idempotency key', {
                    userId,
                    idempotencyKey,
                    existingTxId: existing._id
                });

                if (existing.status === 'completed') {
                    const user = await User.findById(userId).lean();
                    return res.json({
                        success: true,
                        message: `Already processed. $${amountNum.toLocaleString()} was added to wallet.`,
                        wallet: user?.wallet ?? 0,
                        transactionId: existing._id,
                        duplicate: true
                    });
                }

                // If the previous attempt failed, allow retry with a new key
                return res.status(409).json({
                    success: false,
                    error: 'This payment was already attempted. Please retry with a new request.',
                    code: 'DUPLICATE_PAYMENT'
                });
            }
        }

        // ── 4. Atomic transaction: save record + update wallet ───────────
        // Uses a MongoDB session so both operations succeed or both roll back.

        const session = await mongoose.startSession();

        try {
            let updatedUser;
            let paymentTx;

            await session.withTransaction(async () => {
                // Create payment transaction record
                paymentTx = new PaymentTransaction({
                    userId,
                    type: 'deposit',
                    amount: amountNum,
                    paymentMethod: method,
                    ...paymentDetails,
                    idempotencyKey: idempotencyKey || undefined,
                    status: 'completed'
                });

                await paymentTx.save({ session });

                // Atomically increment wallet balance
                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { wallet: amountNum } },
                    { new: true, session }
                );

                if (!updatedUser) {
                    throw new Error('User not found during wallet update');
                }
            });

            logPayment('info', 'Payment completed successfully', {
                userId,
                amount: amountNum,
                method,
                transactionId: paymentTx._id,
                newBalance: updatedUser.wallet
            });

            res.json({
                success: true,
                message: `Successfully added $${amountNum.toLocaleString()} to wallet`,
                wallet: updatedUser.wallet,
                transactionId: paymentTx._id
            });
        } catch (error) {
            // ── 5. Error classification ──────────────────────────────────

            logPayment('error', 'Payment failed', {
                userId,
                amount: amountNum,
                method,
                idempotencyKey,
                error: error.message,
                errorName: error.name,
                stack: error.stack
            });

            // Mongoose validation error → 400 with specific field info
            if (error.name === 'ValidationError') {
                const fields = Object.keys(error.errors || {});
                return res.status(400).json({
                    success: false,
                    error: `Validation failed for: ${fields.join(', ')}. Please check your input.`,
                    code: 'VALIDATION_ERROR',
                    fields
                });
            }

            // Duplicate key (e.g., idempotency collision)
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'This payment was already processed. Your wallet has been updated.',
                    code: 'DUPLICATE_PAYMENT'
                });
            }

            // Generic server error
            res.status(500).json({
                success: false,
                error: 'Payment processing failed due to a server error. Please try again.',
                code: 'SERVER_ERROR',
                ...(process.env.NODE_ENV === 'development' && { debug: error.message })
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * Process withdrawal
     */
    static async withdrawMoney(req, res) {
        const userId = req.user._id;

        try {
            const { amount, cardNumber, cardHolder, expiryDate, cvv } = req.body;

            // Validate input
            if (!amount || !cardNumber || !cardHolder || !expiryDate || !cvv) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user has sufficient balance
            if (!user.wallet || user.wallet < amountNum) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Available: $${user.wallet || 0}`
                });
            }

            const maskedCardNumber = '**** **** **** ' + cardNumber.slice(-4);

            // Use atomic session for withdrawal too
            const session = await mongoose.startSession();

            try {
                let updatedUser;

                await session.withTransaction(async () => {
                    const paymentTx = new PaymentTransaction({
                        userId,
                        type: 'withdrawal',
                        amount: amountNum,
                        paymentMethod: 'card',
                        cardNumber: maskedCardNumber,
                        cardHolder,
                        status: 'completed'
                    });

                    await paymentTx.save({ session });

                    updatedUser = await User.findByIdAndUpdate(
                        userId,
                        { $inc: { wallet: -amountNum } },
                        { new: true, session }
                    );
                });

                logPayment('info', 'Withdrawal completed', {
                    userId,
                    amount: amountNum,
                    newBalance: updatedUser.wallet
                });

                res.json({
                    success: true,
                    message: 'Withdrawal successful',
                    newBalance: updatedUser.wallet
                });
            } catch (txError) {
                logPayment('error', 'Withdrawal transaction failed', {
                    userId,
                    amount: amountNum,
                    error: txError.message
                });
                throw txError;
            } finally {
                session.endSession();
            }
        } catch (error) {
            logPayment('error', 'Withdrawal error', {
                userId,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Error processing withdrawal. Please try again.'
            });
        }
    }
}

module.exports = PaymentController;

