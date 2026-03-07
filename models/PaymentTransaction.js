const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be positive']
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'bank', 'instant', 'demo'],
        required: true
    },
    // Snapshot of the wallet balance immediately after this transaction completed.
    // Essential for auditing and reconstructing balance history.
    balanceAfter: {
        type: Number,
        min: 0
    },
    // Card fields (optional — only for card payments)
    cardNumber: {
        type: String
    },
    cardHolder: {
        type: String
    },
    // UPI fields (optional — only for UPI payments)
    upiId: {
        type: String
    },
    // Bank transfer fields (optional — only for bank payments)
    bankAccount: {
        type: String
    },
    bankIfsc: {
        type: String
    },
    bankName: {
        type: String
    },
    bankHolder: {
        type: String
    },
    // Idempotency key to prevent duplicate transactions
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true // allows nulls, but enforces uniqueness when present
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    failureReason: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for efficient user transaction lookups
paymentTransactionSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
