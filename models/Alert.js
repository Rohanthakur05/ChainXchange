const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coinId: {
        type: String,
        required: true
    },
    coinSymbol: {
        type: String,
        required: true
    },
    coinName: {
        type: String,
        required: true
    },

    // Alert Type
    type: {
        type: String,
        enum: [
            'price_above',      // Price crosses above target
            'price_below',      // Price crosses below target
            'price_range',      // Price exits a range
            'pct_increase',     // Price increases by X%
            'pct_decrease'      // Price decreases by X%
        ],
        required: true
    },

    // Condition Values
    targetPrice: { type: Number },           // For price_above, price_below
    rangeMin: { type: Number },              // For price_range
    rangeMax: { type: Number },              // For price_range
    percentageThreshold: { type: Number },   // For pct_increase, pct_decrease
    referencePrice: { type: Number },        // Price when alert was created

    // State
    status: {
        type: String,
        enum: ['active', 'triggered', 'paused', 'expired'],
        default: 'active'
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    triggeredAt: { type: Date },
    expiresAt: { type: Date },               // Optional expiration

    // Notification Settings
    notifyOnce: { type: Boolean, default: true },
    notificationSent: { type: Boolean, default: false },

    // Last evaluation tracking (for preventing false triggers)
    lastCheckedPrice: { type: Number },
    lastCheckedAt: { type: Date }
});

// Indexes for efficient querying
alertSchema.index({ userId: 1, status: 1 });           // User's alerts by status
alertSchema.index({ coinId: 1, status: 1 });           // Active alerts per coin (for batch evaluation)
alertSchema.index({ status: 1, coinId: 1 });           // For alert evaluator service
alertSchema.index({ userId: 1, createdAt: -1 });       // User's alerts chronological

module.exports = mongoose.model('Alert', alertSchema);
