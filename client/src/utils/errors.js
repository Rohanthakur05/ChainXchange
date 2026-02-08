/**
 * Centralized Error Handling System
 * 
 * Provides consistent, user-friendly error messages for the trading app.
 * All error codes and messages are centralized here for easy maintenance
 * and future i18n support.
 */

// ============================================
// ERROR CODES
// ============================================

export const ErrorCode = {
    // Network Errors
    NETWORK_OFFLINE: 'NETWORK_OFFLINE',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    NETWORK_DNS_FAILURE: 'NETWORK_DNS_FAILURE',

    // API Errors
    API_SERVER_ERROR: 'API_SERVER_ERROR',
    API_RATE_LIMITED: 'API_RATE_LIMITED',
    API_BAD_REQUEST: 'API_BAD_REQUEST',
    API_NOT_FOUND: 'API_NOT_FOUND',
    API_INVALID_RESPONSE: 'API_INVALID_RESPONSE',

    // Authentication Errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

    // Validation Errors
    VALIDATION_INVALID_AMOUNT: 'VALIDATION_INVALID_AMOUNT',
    VALIDATION_ZERO_AMOUNT: 'VALIDATION_ZERO_AMOUNT',
    VALIDATION_NEGATIVE_AMOUNT: 'VALIDATION_NEGATIVE_AMOUNT',
    VALIDATION_EXCEEDS_BALANCE: 'VALIDATION_EXCEEDS_BALANCE',
    VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',

    // Trading Errors
    TRADE_INSUFFICIENT_BALANCE: 'TRADE_INSUFFICIENT_BALANCE',
    TRADE_INSUFFICIENT_HOLDINGS: 'TRADE_INSUFFICIENT_HOLDINGS',
    TRADE_MARKET_CLOSED: 'TRADE_MARKET_CLOSED',
    TRADE_PAIR_DISABLED: 'TRADE_PAIR_DISABLED',
    TRADE_MINIMUM_NOT_MET: 'TRADE_MINIMUM_NOT_MET',
    TRADE_FAILED: 'TRADE_FAILED',

    // Watchlist Errors
    WATCHLIST_LIMIT_REACHED: 'WATCHLIST_LIMIT_REACHED',
    WATCHLIST_ALREADY_EXISTS: 'WATCHLIST_ALREADY_EXISTS',

    // Fallback
    UNKNOWN: 'UNKNOWN',
};

// ============================================
// ERROR MESSAGES (i18n-ready structure)
// ============================================

const errorMessages = {
    // Network Errors
    [ErrorCode.NETWORK_OFFLINE]: {
        title: 'No Internet Connection',
        message: 'Please check your network connection and try again.',
        suggestion: 'Make sure you\'re connected to the internet',
        severity: 'error',
    },
    [ErrorCode.NETWORK_TIMEOUT]: {
        title: 'Request Timeout',
        message: 'The server is taking too long to respond.',
        suggestion: 'Please try again in a moment',
        severity: 'warning',
    },
    [ErrorCode.NETWORK_DNS_FAILURE]: {
        title: 'Connection Failed',
        message: 'Unable to reach the server.',
        suggestion: 'Check if the server is running',
        severity: 'error',
    },

    // API Errors
    [ErrorCode.API_SERVER_ERROR]: {
        title: 'Server Error',
        message: 'Something went wrong on our end.',
        suggestion: 'Please try again later',
        severity: 'error',
    },
    [ErrorCode.API_RATE_LIMITED]: {
        title: 'Too Many Requests',
        message: 'You\'re making requests too quickly.',
        suggestion: 'Wait a moment before trying again',
        severity: 'warning',
    },
    [ErrorCode.API_BAD_REQUEST]: {
        title: 'Invalid Request',
        message: 'The request could not be processed.',
        suggestion: 'Check your input and try again',
        severity: 'error',
    },
    [ErrorCode.API_NOT_FOUND]: {
        title: 'Not Found',
        message: 'The requested resource doesn\'t exist.',
        suggestion: 'Check the URL or try searching',
        severity: 'warning',
    },
    [ErrorCode.API_INVALID_RESPONSE]: {
        title: 'Invalid Response',
        message: 'Received unexpected data from the server.',
        suggestion: 'Please try again',
        severity: 'error',
    },

    // Authentication Errors
    [ErrorCode.AUTH_REQUIRED]: {
        title: 'Login Required',
        message: 'You need to be logged in to perform this action.',
        suggestion: 'Please sign in to continue',
        severity: 'warning',
    },
    [ErrorCode.AUTH_SESSION_EXPIRED]: {
        title: 'Session Expired',
        message: 'Your session has expired for security reasons.',
        suggestion: 'Please log in again',
        severity: 'warning',
    },
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect.',
        suggestion: 'Check your credentials and try again',
        severity: 'error',
    },

    // Validation Errors
    [ErrorCode.VALIDATION_INVALID_AMOUNT]: {
        title: 'Invalid Amount',
        message: 'Please enter a valid number.',
        suggestion: 'Use numbers only, e.g., 0.5 or 100',
        severity: 'error',
    },
    [ErrorCode.VALIDATION_ZERO_AMOUNT]: {
        title: 'Amount Required',
        message: 'The amount cannot be zero.',
        suggestion: 'Enter an amount greater than zero',
        severity: 'error',
    },
    [ErrorCode.VALIDATION_NEGATIVE_AMOUNT]: {
        title: 'Invalid Amount',
        message: 'The amount cannot be negative.',
        suggestion: 'Enter a positive number',
        severity: 'error',
    },
    [ErrorCode.VALIDATION_EXCEEDS_BALANCE]: {
        title: 'Exceeds Balance',
        message: 'You don\'t have enough funds for this transaction.',
        suggestion: 'Add funds or reduce the amount',
        severity: 'error',
    },
    [ErrorCode.VALIDATION_REQUIRED_FIELD]: {
        title: 'Required Field',
        message: 'This field is required.',
        suggestion: 'Please fill in the required information',
        severity: 'error',
    },

    // Trading Errors
    [ErrorCode.TRADE_INSUFFICIENT_BALANCE]: {
        title: 'Insufficient Balance',
        message: 'You don\'t have enough funds to complete this purchase.',
        suggestion: 'Add money to your wallet',
        severity: 'error',
    },
    [ErrorCode.TRADE_INSUFFICIENT_HOLDINGS]: {
        title: 'Insufficient Holdings',
        message: 'You don\'t have enough of this asset to sell.',
        suggestion: 'Reduce the sell amount',
        severity: 'error',
    },
    [ErrorCode.TRADE_MARKET_CLOSED]: {
        title: 'Market Unavailable',
        message: 'This market is currently closed or under maintenance.',
        suggestion: 'Try again later',
        severity: 'warning',
    },
    [ErrorCode.TRADE_PAIR_DISABLED]: {
        title: 'Trading Pair Disabled',
        message: 'This trading pair is temporarily unavailable.',
        suggestion: 'Try a different pair or check back later',
        severity: 'warning',
    },
    [ErrorCode.TRADE_MINIMUM_NOT_MET]: {
        title: 'Minimum Not Met',
        message: 'The order amount is below the minimum required.',
        suggestion: 'Increase your order amount',
        severity: 'error',
    },
    [ErrorCode.TRADE_FAILED]: {
        title: 'Trade Failed',
        message: 'Unable to complete your trade.',
        suggestion: 'Please try again',
        severity: 'error',
    },

    // Watchlist Errors
    [ErrorCode.WATCHLIST_LIMIT_REACHED]: {
        title: 'Watchlist Limit',
        message: 'You\'ve reached the maximum number of watchlists.',
        suggestion: 'Remove a watchlist to create a new one',
        severity: 'warning',
    },
    [ErrorCode.WATCHLIST_ALREADY_EXISTS]: {
        title: 'Already Exists',
        message: 'A watchlist with this name already exists.',
        suggestion: 'Choose a different name',
        severity: 'warning',
    },

    // Fallback
    [ErrorCode.UNKNOWN]: {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        suggestion: 'Please try again or contact support',
        severity: 'error',
    },
};

// ============================================
// ERROR PARSING & CLASSIFICATION
// ============================================

/**
 * Classify an error and return its error code
 */
export const classifyError = (error) => {
    // Network errors (no response)
    if (!error.response && error.message) {
        if (!navigator.onLine) return ErrorCode.NETWORK_OFFLINE;
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return ErrorCode.NETWORK_TIMEOUT;
        }
        if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
            return ErrorCode.NETWORK_DNS_FAILURE;
        }
        return ErrorCode.NETWORK_OFFLINE;
    }

    // HTTP status-based classification
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        // Check for specific error codes from backend
        if (data?.code) {
            const backendCode = data.code.toUpperCase();
            if (Object.values(ErrorCode).includes(backendCode)) {
                return backendCode;
            }
        }

        // Check for common backend error messages
        const errorMsg = (data?.error || data?.message || '').toLowerCase();

        if (errorMsg.includes('insufficient') && errorMsg.includes('balance')) {
            return ErrorCode.TRADE_INSUFFICIENT_BALANCE;
        }
        if (errorMsg.includes('insufficient') && errorMsg.includes('holding')) {
            return ErrorCode.TRADE_INSUFFICIENT_HOLDINGS;
        }
        if (errorMsg.includes('invalid') && errorMsg.includes('amount')) {
            return ErrorCode.VALIDATION_INVALID_AMOUNT;
        }

        // HTTP status classification
        switch (status) {
            case 400: return ErrorCode.API_BAD_REQUEST;
            case 401: return ErrorCode.AUTH_REQUIRED;
            case 403: return ErrorCode.AUTH_SESSION_EXPIRED;
            case 404: return ErrorCode.API_NOT_FOUND;
            case 429: return ErrorCode.API_RATE_LIMITED;
            case 500:
            case 502:
            case 503:
            case 504:
                return ErrorCode.API_SERVER_ERROR;
            default:
                return ErrorCode.UNKNOWN;
        }
    }

    return ErrorCode.UNKNOWN;
};

/**
 * Parse any error into a structured, user-friendly format
 */
export const parseError = (error, context = {}) => {
    const code = classifyError(error);
    const baseMessage = errorMessages[code] || errorMessages[ErrorCode.UNKNOWN];

    // Build the parsed error object
    const parsed = {
        code,
        title: baseMessage.title,
        message: baseMessage.message,
        suggestion: baseMessage.suggestion,
        severity: baseMessage.severity,
        // Keep original for debugging
        originalError: error,
    };

    // Enhance message with context
    if (context.amount !== undefined && code === ErrorCode.TRADE_INSUFFICIENT_BALANCE) {
        const needed = context.required - context.available;
        if (needed > 0) {
            parsed.message = `You need $${needed.toFixed(2)} more to complete this purchase.`;
        }
    }

    if (context.coinSymbol && code === ErrorCode.TRADE_INSUFFICIENT_HOLDINGS) {
        parsed.message = `You don't have enough ${context.coinSymbol.toUpperCase()} to sell.`;
    }

    // Use backend message if it's more specific
    const backendMessage = error.response?.data?.error || error.response?.data?.message;
    if (backendMessage && backendMessage.length < 100 && code === ErrorCode.UNKNOWN) {
        parsed.message = backendMessage;
    }

    return parsed;
};

/**
 * Format an error for display (simple string version)
 */
export const formatErrorMessage = (error, context = {}) => {
    const parsed = parseError(error, context);
    return parsed.message;
};

/**
 * Log error for debugging (silent, won't show to user)
 */
export const logError = (error, context = {}) => {
    const parsed = parseError(error, context);
    console.error(`[${parsed.code}] ${parsed.title}:`, {
        message: parsed.message,
        context,
        originalError: error,
    });
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate trading amount and return error if invalid
 */
export const validateTradeAmount = (amount, balance, type = 'buy') => {
    const numAmount = parseFloat(amount);

    if (amount === '' || amount === undefined || amount === null) {
        return { valid: false, code: ErrorCode.VALIDATION_REQUIRED_FIELD };
    }

    if (isNaN(numAmount)) {
        return { valid: false, code: ErrorCode.VALIDATION_INVALID_AMOUNT };
    }

    if (numAmount === 0) {
        return { valid: false, code: ErrorCode.VALIDATION_ZERO_AMOUNT };
    }

    if (numAmount < 0) {
        return { valid: false, code: ErrorCode.VALIDATION_NEGATIVE_AMOUNT };
    }

    if (type === 'buy' && numAmount > balance) {
        return {
            valid: false,
            code: ErrorCode.TRADE_INSUFFICIENT_BALANCE,
            context: { required: numAmount, available: balance }
        };
    }

    if (type === 'sell' && numAmount > balance) {
        return {
            valid: false,
            code: ErrorCode.TRADE_INSUFFICIENT_HOLDINGS,
        };
    }

    return { valid: true };
};

/**
 * Get error message by code
 */
export const getErrorMessage = (code) => {
    return errorMessages[code] || errorMessages[ErrorCode.UNKNOWN];
};

export default {
    ErrorCode,
    classifyError,
    parseError,
    formatErrorMessage,
    logError,
    validateTradeAmount,
    getErrorMessage,
};
