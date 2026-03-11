const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// Create a single client instance
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected');
});

redisClient.on('ready', () => {
  console.log('🚀 Redis is ready to receive commands');
});

// Create an explicit connection function
const connectRedis = async () => {
  try {
    console.log('Redis client initialized and connecting...');
    await redisClient.connect();
  } catch (error) {
    console.warn('⚠️ Failed to connect to Redis. Running without cache:', error.message);
    // Stub out the methods if connection fails so app doesn't crash on Vercel
    redisClient.get = async () => null;
    redisClient.setEx = async () => 'OK';
    redisClient.del = async () => 0;
  }
};

module.exports = {
  redisClient,
  connectRedis
};