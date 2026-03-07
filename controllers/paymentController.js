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
     * POST /payment/add-money
     *
     * Process a real (simulated) deposit â€” supports UPI, Card, Bank Transfer, Instant.
     *
     * Production safeguards:
     *  1. Idempotency key prevents duplicate deposits on double-click / retry
     *  2. MongoDB session ensures atomicity between PaymentTransaction creation and wallet update
     *  3. balanceAfter is stored in the transaction record for full audit history
     *  4. Detailed error classification (validation vs. server) for helpful UI messages
     *  5. Structured logging for every payment attempt
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

        // â”€â”€ 1. Input validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

        // â”€â”€ 2. Payment method validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

        // â”€â”€ 3. Idempotency check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        // â”€â”€ 4. Atomic transaction: save record + update wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Uses a MongoDB session so both operations succeed or both roll back.
        // balanceAfter is captured from the updated user document and patched
        // onto the PaymentTransaction record in the same session.

        const session = await mongoose.startSession();

        try {
            let updatedUser;
            let paymentTx;

            await session.withTransaction(async () => {
                // Create payment transaction record (balanceAfter set after wallet update)
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

                // Patch balanceAfter onto the transaction record
                paymentTx.balanceAfter = updatedUser.wallet;
                await paymentTx.save({ session });
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
                balanceAfter: updatedUser.wallet,
                transactionId: paymentTx._id
            });
        } catch (error) {
            // â”€â”€ 5. Error classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

            logPayment('error', 'Payment failed', {
                userId,
                amount: amountNum,
                method,
                idempotencyKey,
                error: error.message,
                errorName: error.name,
                stack: error.stack
            });

            // Mongoose validation error â†’ 400 with specific field info
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
     * POST /payment/demo-deposit
     *
     * Instantly credits the authenticated user with $1,000 in demo funds.
     * Clearly flagged as paymentMethod: 'demo' in the transaction log.
     *
     * This is a sandbox-only feature â€” in a real exchange this route would
     * not exist. Real exchanges require fiat on-ramps (bank transfer, card
     * gateway) that go through KYC and payment processors (Stripe, Razorpay,
     * etc.) before crediting the account.
     */
    static async addDemoFunds(req, res) {
        const userId = req.user._id;
        const DEMO_AMOUNT = 1000;

        logPayment('info', 'Demo deposit requested', { userId });

        const session = await mongoose.startSession();

        try {
            let updatedUser;
            let paymentTx;

            await session.withTransaction(async () => {
                // Atomically credit the wallet
                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { wallet: DEMO_AMOUNT } },
                    { new: true, session }
                );

                if (!updatedUser) {
                    throw new Error('User not found during demo deposit');
                }

                // Record the demo deposit in the transaction log
                paymentTx = new PaymentTransaction({
                    userId,
                    type: 'deposit',
                    amount: DEMO_AMOUNT,
                    paymentMethod: 'demo',
                    balanceAfter: updatedUser.wallet,
                    status: 'completed'
                });

                await paymentTx.save({ session });
            });

            logPayment('info', 'Demo deposit completed', {
                userId,
                amount: DEMO_AMOUNT,
                newBalance: updatedUser.wallet,
                transactionId: paymentTx._id
            });

            res.json({
                success: true,
                message: `$${DEMO_AMOUNT.toLocaleString()} demo funds added to your wallet`,
                wallet: updatedUser.wallet,
                balanceAfter: updatedUser.wallet,
                transactionId: paymentTx._id
            });
        } catch (error) {
            logPayment('error', 'Demo deposit failed', {
                userId,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Demo deposit failed. Please try again.',
                code: 'SERVER_ERROR',
                ...(process.env.NODE_ENV === 'development' && { debug: error.message })
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * POST /payment/withdraw
     *
     * Atomically withdraws funds from the wallet.
     *
     * Race-condition safe: the balance guard lives inside the MongoDB
     * findOneAndUpdate filter â€” not in a pre-flight check â€” so two
     * concurrent withdrawals cannot both pass the guard and drive the
     * balance negative.
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

            const maskedCardNumber = '**** **** **** ' + cardNumber.slice(-4);

            // Use atomic session for withdrawal
            const session = await mongoose.startSession();

            try {
                let updatedUser;

                await session.withTransaction(async () => {
                    // â”€â”€ Atomic balance guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // The filter `{ _id: userId, wallet: { $gte: amountNum } }`
                    // means the update only executes if the current balance is
                    // sufficient. If two concurrent withdrawals race here, at
                    // most one will match the filter â€” the other gets null back.
                    updatedUser = await User.findOneAndUpdate(
                        { _id: userId, wallet: { $gte: amountNum } },
                        { $inc: { wallet: -amountNum } },
                        { new: true, session }
                    );

                    if (!updatedUser) {
                        // Either user doesn't exist or balance was insufficient.
                        // Check which case this is to give the right error message.
                        const exists = await User.exists({ _id: userId }).session(session);
                        if (!exists) {
                            throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' });
                        }
                        throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT_FUNDS' });
                    }

                    const paymentTx = new PaymentTransaction({
                        userId,
                        type: 'withdrawal',
                        amount: amountNum,
                        paymentMethod: 'card',
                        cardNumber: maskedCardNumber,
                        cardHolder,
                        balanceAfter: updatedUser.wallet,
                        status: 'completed'
                    });

                    await paymentTx.save({ session });
                });

                logPayment('info', 'Withdrawal completed', {
                    userId,
                    amount: amountNum,
                    newBalance: updatedUser.wallet
                });

                res.json({
                    success: true,
                    message: 'Withdrawal successful',
                    newBalance: updatedUser.wallet,
                    balanceAfter: updatedUser.wallet
                });
            } catch (txError) {
                // Surface domain errors as 400, infra errors as 500
                if (txError.code === 'INSUFFICIENT_FUNDS') {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient balance. Please add funds before withdrawing.`
                    });
                }
                if (txError.code === 'USER_NOT_FOUND') {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
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
