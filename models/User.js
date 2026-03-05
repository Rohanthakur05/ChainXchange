const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ─── Core identity ───────────────────────────────────────────
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { type: String, required: true },

    // ─── Wallet ──────────────────────────────────────────────────
    wallet: { type: Number, default: 0, min: 0 },

    // ─── Watchlist ───────────────────────────────────────────────
    watchlist: [{ type: String }],

    // ─── Security — account lockout ──────────────────────────────
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // ─── Profile (optional, add richer data later) ───────────────
    displayName: { type: String, trim: true },
    avatar: { type: String },

    // ─── Notification preferences ────────────────────────────────
    notifications: {
        priceAlerts: { type: Boolean, default: true },
        tradeConfirmations: { type: Boolean, default: true }
    }
}, { timestamps: true });

// Index for login lookup by email
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);