const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');

class PaymentController {
    /**
     * Show payment/wallet page
     */
    static async showWallet(req, res) {
        try {
            const userId = req.cookies.user;
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
            console.error('Wallet page error:', error);
            res.status(500).render('error', {
                message: 'Error loading wallet',
                error: process.env.NODE_ENV === 'development' ? error.message : null
            });
        }
    }

    /**
     * Process add money - supports UPI, Card, Bank Transfer
     */
    static async addMoney(req, res) {
        try {
            const userId = req.cookies.user;
            const {
                amount,
                paymentMethod,
                // UPI fields
                upiId,
                // Card fields
                cardNumber, cardExpiry, cardCvv, cardHolder,
                // Bank fields
                bankAccount, bankIfsc, bankName, bankHolder
            } = req.body;

            // Validate amount
            if (!amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount is required'
                });
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount. Must be a positive number.'
                });
            }

            if (amountNum > 100000) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum single deposit is $100,000'
                });
            }

            // Determine payment method and validate
            const method = paymentMethod || 'instant';
            let paymentDetails = {};

            switch (method) {
                case 'upi':
                    if (!upiId || !/^[\w.-]+@[\w]+$/.test(upiId)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Valid UPI ID is required'
                        });
                    }
                    paymentDetails = { upiId };
                    break;

                case 'card':
                    if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
                        return res.status(400).json({
                            success: false,
                            error: 'Complete card details are required'
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
                            error: 'Complete bank details are required'
                        });
                    }
                    paymentDetails = {
                        bankAccount: '****' + bankAccount.slice(-4),
                        bankIfsc,
                        bankName: bankName || 'Bank Transfer',
                        bankHolder
                    };
                    break;

                default:
                    paymentDetails = { method: 'Instant Top-up' };
            }

            // Create payment transaction record
            const paymentTx = new PaymentTransaction({
                userId,
                type: 'deposit',
                amount: amountNum,
                paymentMethod: method,
                ...paymentDetails,
                status: 'completed'
            });

            await paymentTx.save();

            // Update user wallet balance
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { wallet: amountNum } },
                { new: true }
            );

            console.log(`[Payment] User ${userId} added $${amountNum} via ${method}`);

            res.json({
                success: true,
                message: `Successfully added $${amountNum.toLocaleString()} to wallet`,
                wallet: updatedUser.wallet
            });
        } catch (error) {
            console.error('Add money error:', error);
            res.status(500).json({
                success: false,
                error: 'Error processing payment. Please try again.'
            });
        }
    }

    /**
     * Process withdrawal (optional feature)
     */
    static async withdrawMoney(req, res) {
        try {
            const userId = req.cookies.user;
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

            const paymentTx = new PaymentTransaction({
                userId,
                type: 'withdrawal',
                amount: amountNum,
                cardNumber: maskedCardNumber,
                cardHolder,
                status: 'completed'
            });

            await paymentTx.save();

            await User.findByIdAndUpdate(userId, {
                $inc: { wallet: -amountNum }
            });

            res.json({
                success: true,
                message: 'Withdrawal successful',
                newBalance: (await User.findById(userId)).wallet
            });
        } catch (error) {
            console.error('Withdrawal error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing withdrawal'
            });
        }
    }
}

module.exports = PaymentController;
