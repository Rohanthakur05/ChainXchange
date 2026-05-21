const mongoose = require('mongoose');
const { config } = require('../config/env');
const logger = require('../utils/logger');

/**
 * 404 handler — must be registered after all routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    errorCode: 'NOT_FOUND',
    path: req.path
  });
};

/**
 * Map known errors to structured API responses.
 */
const globalErrorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    error: err.message,
    name: err.name,
    code: err.code,
    ...(config.isDevelopment && { stack: err.stack })
  });

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const fields = Object.keys(err.errors || {});
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${fields.join(', ')}`,
      errorCode: 'VALIDATION_ERROR',
      fields
    });
  }

  // Duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record — this operation was already processed.',
      errorCode: 'DUPLICATE_ENTRY'
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errorCode: 'INVALID_ID'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      errorCode: 'AUTH_INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
      errorCode: 'AUTH_SESSION_EXPIRED'
    });
  }

  // Payment domain errors (thrown from paymentService)
  if (err.errorCode) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      ...(config.isDevelopment && err.debug && { debug: err.debug })
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: config.isDevelopment ? err.message : 'Internal server error',
    errorCode: err.code || 'SERVER_ERROR',
    ...(config.isDevelopment && { debug: err.message })
  });
};

module.exports = { notFoundHandler, globalErrorHandler };
