/**
 * Centralized environment configuration with startup validation.
 */
const dotenv = require('dotenv');

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

const parseOrigins = (value, fallback) => {
  if (!value || !value.trim()) return fallback;
  return value.split(',').map((o) => o.trim()).filter(Boolean);
};

const config = {
  env: NODE_ENV,
  isProduction,
  isDevelopment,
  port: parseInt(process.env.PORT, 10) || 8000,

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-trading',
  redisUrl: process.env.REDIS_URL || '',

  jwtSecret: process.env.JWT_SECRET || 'chainxchange-dev-secret-change-in-production',
  cookieSecret: process.env.COOKIE_SECRET || 'chainxchange-cookie-secret',
  sessionSecret: process.env.SESSION_SECRET || 'chainxchange-session-secret',

  clientUrl: parseOrigins(process.env.CLIENT_URL, [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8000'
  ]),

  // Secure cookies only when explicitly enabled or on HTTPS production
  cookieSecure:
    process.env.COOKIE_SECURE === 'true' ||
    (isProduction && process.env.COOKIE_SECURE !== 'false' && process.env.FORCE_HTTP_COOKIES !== 'true'),

  trustProxy: process.env.TRUST_PROXY !== 'false',

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,

  paymentMaxDeposit: parseFloat(process.env.PAYMENT_MAX_DEPOSIT) || 100000,
  logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')
};

const validateEnv = () => {
  const warnings = [];

  if (isProduction && config.jwtSecret.includes('dev-secret')) {
    warnings.push('JWT_SECRET is using a development default — set a strong secret in production.');
  }

  if (isProduction && !process.env.MONGO_URI) {
    warnings.push('MONGO_URI is not set — using local MongoDB fallback.');
  }

  if (isProduction && config.clientUrl.every((o) => o.includes('localhost'))) {
    warnings.push('CLIENT_URL still points to localhost — set your deployed frontend URL for CORS.');
  }

  warnings.forEach((w) => console.warn(`[config] ⚠️  ${w}`));

  return config;
};

module.exports = { config, validateEnv };
