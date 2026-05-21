const logger = require('../utils/logger');

/**
 * HTTP request logger (morgan-style, zero extra dependencies).
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP', {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip
    });
  });

  next();
};

module.exports = requestLogger;
