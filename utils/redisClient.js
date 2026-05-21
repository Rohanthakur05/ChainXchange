const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

let redisClient = null;

const connectRedis = async () => {
  // Skip Redis if REDIS_URL is not provided
  if (!process.env.REDIS_URL) {
    console.log('⚠️ Redis disabled - no REDIS_URL provided');

    // Mock client methods so app doesn't crash
    redisClient = {
      get: async () => null,
      setEx: async () => 'OK',
      del: async () => 0
    };

    return;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL
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

  try {
    console.log('Redis client initialized and connecting...');
    await redisClient.connect();
  } catch (error) {
    console.warn('⚠️ Failed to connect to Redis. Running without cache:', error.message);

    redisClient = {
      get: async () => null,
      setEx: async () => 'OK',
      del: async () => 0
    };
  }
};

module.exports = {
  get redisClient() {
    return redisClient;
  },
  connectRedis
};