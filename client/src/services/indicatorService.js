/**
 * Indicator Calculation Service
 * 
 * Frontend-based technical indicator calculations for alerts.
 * Uses OHLCV data to compute RSI, MACD, and MA crossovers.
 */

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {number[]} prices - Array of prices (oldest first)
 * @param {number} period - EMA period
 * @returns {number[]} EMA values
 */
export const calculateEMA = (prices, period) => {
    if (prices.length < period) return [];

    const multiplier = 2 / (period + 1);
    const emaValues = [];

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }
    emaValues.push(sum / period);

    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
        const ema = (prices[i] - emaValues[emaValues.length - 1]) * multiplier + emaValues[emaValues.length - 1];
        emaValues.push(ema);
    }

    return emaValues;
};

/**
 * Calculate Simple Moving Average (SMA)
 * @param {number[]} prices - Array of prices
 * @param {number} period - SMA period
 * @returns {number[]} SMA values
 */
export const calculateSMA = (prices, period) => {
    if (prices.length < period) return [];

    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += prices[i - j];
        }
        smaValues.push(sum / period);
    }

    return smaValues;
};

/**
 * Calculate RSI (Relative Strength Index)
 * @param {number[]} prices - Array of closing prices (oldest first)
 * @param {number} period - RSI period (default 14)
 * @returns {{ value: number, values: number[] }} Current RSI and history
 */
export const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) {
        return { value: null, values: [] };
    }

    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }

    // Separate gains and losses
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

    // Calculate initial average gain/loss
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    const rsiValues = [];

    // First RSI value
    if (avgLoss === 0) {
        rsiValues.push(100);
    } else {
        const rs = avgGain / avgLoss;
        rsiValues.push(100 - (100 / (1 + rs)));
    }

    // Calculate remaining RSI values using smoothed method
    for (let i = period; i < changes.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

        if (avgLoss === 0) {
            rsiValues.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsiValues.push(100 - (100 / (1 + rs)));
        }
    }

    return {
        value: rsiValues[rsiValues.length - 1],
        values: rsiValues
    };
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {number[]} prices - Array of closing prices
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal line period (default 9)
 * @returns {Object} MACD line, signal line, histogram, and crossover state
 */
export const calculateMACD = (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    if (prices.length < slowPeriod + signalPeriod) {
        return { macdLine: null, signalLine: null, histogram: null, crossover: null };
    }

    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);

    // Align arrays (slow EMA starts later)
    const offset = slowPeriod - fastPeriod;
    const macdLine = [];

    for (let i = 0; i < slowEMA.length; i++) {
        macdLine.push(fastEMA[i + offset] - slowEMA[i]);
    }

    // Signal line is EMA of MACD line
    const signalLine = calculateEMA(macdLine, signalPeriod);

    // Histogram
    const histogramOffset = macdLine.length - signalLine.length;
    const histogram = signalLine.map((signal, i) => macdLine[i + histogramOffset] - signal);

    // Detect crossover
    let crossover = null;
    if (histogram.length >= 2) {
        const current = histogram[histogram.length - 1];
        const previous = histogram[histogram.length - 2];

        if (previous < 0 && current >= 0) {
            crossover = 'bullish'; // MACD crossed above signal
        } else if (previous > 0 && current <= 0) {
            crossover = 'bearish'; // MACD crossed below signal
        }
    }

    return {
        macdLine: macdLine[macdLine.length - 1],
        signalLine: signalLine[signalLine.length - 1],
        histogram: histogram[histogram.length - 1],
        crossover,
        history: {
            macdLine,
            signalLine,
            histogram
        }
    };
};

/**
 * Detect Moving Average Crossover
 * @param {number[]} prices - Array of closing prices
 * @param {number} fastPeriod - Fast MA period (default 9)
 * @param {number} slowPeriod - Slow MA period (default 21)
 * @param {string} maType - 'sma' or 'ema' (default 'ema')
 * @returns {Object} Crossover state
 */
export const detectMACrossover = (prices, fastPeriod = 9, slowPeriod = 21, maType = 'ema') => {
    const calcFn = maType === 'ema' ? calculateEMA : calculateSMA;

    const fastMA = calcFn(prices, fastPeriod);
    const slowMA = calcFn(prices, slowPeriod);

    if (fastMA.length < 2 || slowMA.length < 2) {
        return { crossover: null, fastMA: null, slowMA: null };
    }

    // Align arrays
    const offset = fastMA.length - slowMA.length;
    const currentFast = fastMA[fastMA.length - 1];
    const previousFast = fastMA[fastMA.length - 2];
    const currentSlow = slowMA[slowMA.length - 1];
    const previousSlow = slowMA[slowMA.length - 2];

    let crossover = null;

    // Golden cross: fast crosses above slow
    if (previousFast <= previousSlow && currentFast > currentSlow) {
        crossover = 'golden';
    }
    // Death cross: fast crosses below slow
    else if (previousFast >= previousSlow && currentFast < currentSlow) {
        crossover = 'death';
    }

    return {
        crossover,
        fastMA: currentFast,
        slowMA: currentSlow
    };
};

/**
 * Evaluate indicator alert condition
 * @param {Object} alert - Alert configuration
 * @param {number[]} prices - Price history array
 * @returns {{ triggered: boolean, currentValue: any, message: string }}
 */
export const evaluateIndicatorAlert = (alert, prices) => {
    const { indicatorType, config } = alert;

    switch (indicatorType) {
        case 'rsi': {
            const rsi = calculateRSI(prices, config.rsi?.period || 14);
            if (rsi.value === null) {
                return { triggered: false, currentValue: null, message: 'Insufficient data' };
            }

            const { threshold, direction } = config.rsi;
            const triggered = direction === 'below'
                ? rsi.value <= threshold
                : rsi.value >= threshold;

            return {
                triggered,
                currentValue: rsi.value.toFixed(2),
                message: triggered
                    ? `RSI is ${rsi.value.toFixed(2)} (${direction} ${threshold})`
                    : `RSI at ${rsi.value.toFixed(2)}`
            };
        }

        case 'macd': {
            const macd = calculateMACD(prices);
            if (macd.crossover === null && macd.histogram === null) {
                return { triggered: false, currentValue: null, message: 'Insufficient data' };
            }

            const { signal } = config.macd;
            const triggered = (signal === 'bullish_cross' && macd.crossover === 'bullish') ||
                (signal === 'bearish_cross' && macd.crossover === 'bearish');

            return {
                triggered,
                currentValue: macd.crossover,
                message: triggered
                    ? `MACD ${signal.replace('_', ' ')} detected!`
                    : `MACD: ${macd.histogram?.toFixed(4) || 'N/A'}`
            };
        }

        case 'ma_crossover': {
            const { fastPeriod = 9, slowPeriod = 21, signal, maType = 'ema' } = config.ma || {};
            const result = detectMACrossover(prices, fastPeriod, slowPeriod, maType);

            if (result.crossover === null && result.fastMA === null) {
                return { triggered: false, currentValue: null, message: 'Insufficient data' };
            }

            const triggered = (signal === 'golden' && result.crossover === 'golden') ||
                (signal === 'death' && result.crossover === 'death');

            return {
                triggered,
                currentValue: result.crossover,
                message: triggered
                    ? `${signal === 'golden' ? 'Golden' : 'Death'} cross detected!`
                    : `Fast MA: ${result.fastMA?.toFixed(2)}, Slow MA: ${result.slowMA?.toFixed(2)}`
            };
        }

        default:
            return { triggered: false, currentValue: null, message: 'Unknown indicator' };
    }
};

/**
 * Indicator alert configurations for UI
 */
export const INDICATOR_ALERT_TYPES = {
    rsi: {
        id: 'rsi',
        name: 'RSI',
        fullName: 'Relative Strength Index',
        description: 'Alert when RSI crosses above/below a threshold (30 = oversold, 70 = overbought)',
        defaultConfig: {
            threshold: 30,
            direction: 'below',
            period: 14
        }
    },
    macd: {
        id: 'macd',
        name: 'MACD',
        fullName: 'Moving Average Convergence Divergence',
        description: 'Alert on bullish (buy signal) or bearish (sell signal) crossovers',
        defaultConfig: {
            signal: 'bullish_cross'
        }
    },
    ma_crossover: {
        id: 'ma_crossover',
        name: 'MA Crossover',
        fullName: 'Moving Average Crossover',
        description: 'Alert when fast MA crosses slow MA (Golden/Death cross)',
        defaultConfig: {
            fastPeriod: 9,
            slowPeriod: 21,
            signal: 'golden',
            maType: 'ema'
        }
    }
};

export default {
    calculateRSI,
    calculateMACD,
    calculateEMA,
    calculateSMA,
    detectMACrossover,
    evaluateIndicatorAlert,
    INDICATOR_ALERT_TYPES
};
