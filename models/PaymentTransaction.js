const mongoose = require('mongoose');

// Delete cached model to avoid stale index warnings
delete mongoose.models.PaymentTransaction;

const paymentTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
        type: String,
        enum: ['deposit', 'withdrawal'],
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: 0.01
    },

    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'bank', 'instant', 'demo'],
        required: true
    },

    balanceAfter: Number,

    cardNumber: String,
    cardHolder: String,

    upiId: String,

    bankAccount: String,
    bankIfsc: String,
    bankName: String,
    bankHolder: String,

    idempotencyKey: {
        type: String,

    },

    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },

    failureReason: String,

    timestamp: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

paymentTransactionSchema.index({ userId: 1, timestamp: -1 });
paymentTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);