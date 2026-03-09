const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-trading';

        // Connect to MongoDB
        const conn = await mongoose.connect(MONGO_URI, {
            // Optional: add these for robust timeout handling
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            retryWrites: true,
            w: 'majority'
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Setup connection event listeners for better monitoring
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        // If critical connection fails at startup, we should exit
        throw error;
    }
};

module.exports = connectDB;
