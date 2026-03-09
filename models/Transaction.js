const mongoose = require('mongoose');

// Delete cached model to avoid stale index warnings
delete mongoose.models.Transaction;

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  coinId: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },

  totalCost: { type: Number },
  fee: { type: Number },
  totalWithFee: { type: Number },

  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },

  idempotencyKey: {
    type: String,
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, type: 1, timestamp: -1 });
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);