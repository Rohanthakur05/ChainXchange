const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const createNoopClient = () => ({
  get: async () => null,
  setEx: async () => 'OK',
  del: async () => 0
});

let redisClient = process.env.REDIS_URL ? null : createNoopClient();

const connectRedis = async () => {
  // Skip Redis if REDIS_URL is not provided
  if (!process.env.REDIS_URL) {
    console.log('⚠️ Redis disabled - no REDIS_URL provided');
    redisClient = createNoopClient();
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

    redisClient = createNoopClient();
  }
};

module.exports = {
  get redisClient() {
    return redisClient || createNoopClient();
  },
  connectRedis
};