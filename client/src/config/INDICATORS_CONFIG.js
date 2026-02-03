/**
 * Indicators Configuration
 * Central config for all available technical indicators
 * 
 * Each indicator has:
 * - id: Unique identifier
 * - name: Display name
 * - description: Brief explanation
 * - category: Overlay, Momentum, Volume, or Volatility
 * - studyId: TradingView study identifier
 */

export const INDICATOR_CATEGORIES = {
    ALL: 'all',
    OVERLAYS: 'overlays',
    MOMENTUM: 'momentum',
    VOLUME: 'volume',
    VOLATILITY: 'volatility'
};

export const INDICATORS = [
    // ========== OVERLAYS (On Price Chart) ==========
    {
        id: 'sma',
        name: 'Simple Moving Average (SMA)',
        shortName: 'SMA',
        description: 'Average price over a specified period',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'MASimple@tv-basicstudies'
    },
    {
        id: 'ema',
        name: 'Exponential Moving Average (EMA)',
        shortName: 'EMA',
        description: 'Weighted average giving more weight to recent prices',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'MAExp@tv-basicstudies'
    },
    {
        id: 'vwap',
        name: 'VWAP',
        shortName: 'VWAP',
        description: 'Volume Weighted Average Price',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'VWAP@tv-basicstudies'
    },
    {
        id: 'bb',
        name: 'Bollinger Bands',
        shortName: 'BB',
        description: 'Volatility bands above and below moving average',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'BB@tv-basicstudies'
    },
    {
        id: 'pivots',
        name: 'Pivot Points',
        shortName: 'Pivots',
        description: 'Support and resistance levels based on prior period',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'PivotPointsStandard@tv-basicstudies'
    },
    {
        id: 'ichimoku',
        name: 'Ichimoku Cloud',
        shortName: 'Ichimoku',
        description: 'Multi-component indicator showing support, resistance, and momentum',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'IchimokuCloud@tv-basicstudies'
    },
    {
        id: 'psar',
        name: 'Parabolic SAR',
        shortName: 'PSAR',
        description: 'Trailing stop and reversal indicator',
        category: INDICATOR_CATEGORIES.OVERLAYS,
        studyId: 'PSAR@tv-basicstudies'
    },

    // ========== MOMENTUM (Separate Panel) ==========
    {
        id: 'rsi',
        name: 'Relative Strength Index (RSI)',
        shortName: 'RSI',
        description: 'Measures overbought/oversold conditions (0-100)',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'RSI@tv-basicstudies'
    },
    {
        id: 'stochrsi',
        name: 'Stochastic RSI',
        shortName: 'Stoch RSI',
        description: 'RSI applied to RSI values for more sensitivity',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'StochasticRSI@tv-basicstudies'
    },
    {
        id: 'macd',
        name: 'MACD',
        shortName: 'MACD',
        description: 'Moving Average Convergence Divergence',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'MACD@tv-basicstudies'
    },
    {
        id: 'momentum',
        name: 'Momentum',
        shortName: 'MOM',
        description: 'Rate of price change over time',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'Momentum@tv-basicstudies'
    },
    {
        id: 'stoch',
        name: 'Stochastic',
        shortName: 'Stoch',
        description: 'Compares closing price to price range',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'Stochastic@tv-basicstudies'
    },
    {
        id: 'cci',
        name: 'Commodity Channel Index (CCI)',
        shortName: 'CCI',
        description: 'Measures price deviation from average',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'CCI@tv-basicstudies'
    },
    {
        id: 'williams',
        name: 'Williams %R',
        shortName: 'Williams',
        description: 'Momentum indicator similar to Stochastic',
        category: INDICATOR_CATEGORIES.MOMENTUM,
        studyId: 'WilliamsR@tv-basicstudies'
    },

    // ========== VOLUME (Separate Panel) ==========
    {
        id: 'volume',
        name: 'Volume',
        shortName: 'Vol',
        description: 'Trading volume bars',
        category: INDICATOR_CATEGORIES.VOLUME,
        studyId: 'Volume@tv-basicstudies'
    },
    {
        id: 'volumema',
        name: 'Volume Moving Average',
        shortName: 'Vol MA',
        description: 'Moving average of volume',
        category: INDICATOR_CATEGORIES.VOLUME,
        studyId: 'MAVolumeWeighted@tv-basicstudies'
    },
    {
        id: 'obv',
        name: 'On Balance Volume (OBV)',
        shortName: 'OBV',
        description: 'Cumulative volume based on price direction',
        category: INDICATOR_CATEGORIES.VOLUME,
        studyId: 'OBV@tv-basicstudies'
    },
    {
        id: 'vwma',
        name: 'Volume Weighted MA',
        shortName: 'VWMA',
        description: 'Moving average weighted by volume',
        category: INDICATOR_CATEGORIES.VOLUME,
        studyId: 'VWMA@tv-basicstudies'
    },

    // ========== VOLATILITY (Separate Panel) ==========
    {
        id: 'atr',
        name: 'Average True Range (ATR)',
        shortName: 'ATR',
        description: 'Measures market volatility',
        category: INDICATOR_CATEGORIES.VOLATILITY,
        studyId: 'ATR@tv-basicstudies'
    },
    {
        id: 'adx',
        name: 'Average Directional Index (ADX)',
        shortName: 'ADX',
        description: 'Measures trend strength',
        category: INDICATOR_CATEGORIES.VOLATILITY,
        studyId: 'ADX@tv-basicstudies'
    }
];

// Helper to get indicator by ID
export const getIndicatorById = (id) => INDICATORS.find(ind => ind.id === id);

// Helper to get indicators by category
export const getIndicatorsByCategory = (category) => {
    if (category === INDICATOR_CATEGORIES.ALL) return INDICATORS;
    return INDICATORS.filter(ind => ind.category === category);
};

// Helper to search indicators
export const searchIndicators = (query, category = INDICATOR_CATEGORIES.ALL) => {
    const indicators = getIndicatorsByCategory(category);
    if (!query) return indicators;

    const lowerQuery = query.toLowerCase();
    return indicators.filter(ind =>
        ind.name.toLowerCase().includes(lowerQuery) ||
        ind.shortName.toLowerCase().includes(lowerQuery) ||
        ind.description.toLowerCase().includes(lowerQuery)
    );
};

export default INDICATORS;
