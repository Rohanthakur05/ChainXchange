/**
 * News Service
 * 
 * Fetches crypto news from CryptoCompare API
 * with caching and deduplication.
 */

const CRYPTOCOMPARE_BASE = 'https://min-api.cryptocompare.com/data/v2/news/';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache
const newsCache = new Map();

/**
 * Fetch news for a specific coin
 * @param {string} coinSymbol - Coin symbol (e.g., 'BTC', 'ETH')
 * @param {number} limit - Number of articles to fetch
 * @returns {Promise<Array>} Array of news articles
 */
export const fetchCoinNews = async (coinSymbol, limit = 10) => {
    const cacheKey = `${coinSymbol.toUpperCase()}_${limit}`;

    // Check cache
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }

    try {
        const symbol = coinSymbol.toUpperCase();
        const url = `${CRYPTOCOMPARE_BASE}?categories=${symbol}&excludeCategories=Sponsored`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`News API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.Data) {
            return [];
        }

        // Transform and deduplicate
        const articles = deduplicateNews(data.Data)
            .slice(0, limit)
            .map(transformArticle);

        // Cache results
        newsCache.set(cacheKey, {
            data: articles,
            timestamp: Date.now()
        });

        return articles;
    } catch (err) {
        console.error('Failed to fetch news:', err);

        // Return cached data if available, even if stale
        if (cached) {
            return cached.data;
        }

        throw err;
    }
};

/**
 * Fetch general crypto news
 * @param {number} limit - Number of articles
 * @returns {Promise<Array>} Array of news articles
 */
export const fetchGeneralNews = async (limit = 20) => {
    const cacheKey = `general_${limit}`;

    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }

    try {
        const url = `${CRYPTOCOMPARE_BASE}?lang=EN&excludeCategories=Sponsored`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`News API error: ${response.status}`);
        }

        const data = await response.json();

        const articles = deduplicateNews(data.Data || [])
            .slice(0, limit)
            .map(transformArticle);

        newsCache.set(cacheKey, {
            data: articles,
            timestamp: Date.now()
        });

        return articles;
    } catch (err) {
        console.error('Failed to fetch general news:', err);
        if (cached) return cached.data;
        throw err;
    }
};

/**
 * Transform raw API article to our format
 */
const transformArticle = (article) => ({
    id: article.id,
    title: article.title,
    body: article.body?.substring(0, 200) + '...',
    source: article.source_info?.name || article.source,
    publishedAt: new Date(article.published_on * 1000),
    url: article.url,
    imageUrl: article.imageurl,
    categories: article.categories?.split('|') || [],
    tags: article.tags?.split('|') || []
});

/**
 * Deduplicate news by title similarity
 */
const deduplicateNews = (articles) => {
    const seen = new Set();
    return articles.filter(article => {
        // Normalize title for comparison
        const normalized = article.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const key = normalized.substring(0, 50);

        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

/**
 * Format relative time ago
 */
export const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
        return `${minutes}m ago`;
    } else if (hours < 24) {
        return `${hours}h ago`;
    } else if (days < 7) {
        return `${days}d ago`;
    } else {
        return date.toLocaleDateString();
    }
};

/**
 * Clear news cache
 */
export const clearNewsCache = () => {
    newsCache.clear();
};

export default {
    fetchCoinNews,
    fetchGeneralNews,
    formatTimeAgo,
    clearNewsCache
};
