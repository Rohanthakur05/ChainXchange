const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    coins: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true,
    collection: 'watchlists'
});

// Compound index: one watchlist name per user (case-insensitive uniqueness)
watchlistSchema.index({ userId: 1, name: 1 }, { unique: true });

// Limit coins per watchlist to prevent abuse
watchlistSchema.pre('save', function (next) {
    if (this.coins.length > 100) {
        return next(new Error('Maximum 100 coins per watchlist'));
    }
    next();
});

module.exports = mongoose.model('Watchlist', watchlistSchema);
