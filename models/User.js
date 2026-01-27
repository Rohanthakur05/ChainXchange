const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    password: { type: String, required: true },
    wallet: { type: Number, default: 0 },
    watchlist: [{ type: String }] // Array of coin IDs
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);