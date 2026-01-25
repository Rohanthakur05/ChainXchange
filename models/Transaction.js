const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['buy', 'sell'] },
    coinId: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalCost: { type: Number },
    sellValue: { type: Number },
    timestamp: { type: Date, default: Date.now }
});

// Indexes for efficient querying and sorting
transactionSchema.index({ userId: 1, timestamp: -1 }); // For default history view
transactionSchema.index({ userId: 1, type: 1, timestamp: -1 }); // For filtered history view

module.exports = mongoose.model('Transaction', transactionSchema);