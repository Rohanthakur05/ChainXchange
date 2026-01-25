const async = require('async');
const axios = require('axios');
const { setTimeout: promiseTimeout } = require('timers/promises');
const redisClient = require('./redisClient'); // Import the shared client

const geckoQueue = async.queue(async (task) => {
    console.log('Processing CoinGecko request...'); // Debug log
    let attempt = 0;
    const maxAttempts = 3;
    let lastError = null;
    let result = null;

    while (attempt < maxAttempts) {
        attempt++;
        try {
            console.log('Fetching from CoinGecko:', task.url); // Temporary debug log
            const response = await axios({
                method: 'get',
                url: task.url,
                timeout: 30000, // 30-second timeout for all requests
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'ChainXchange/1.0'
                }
            });

            if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
                throw new Error('Empty response from CoinGecko');
            }

            result = response.data;
            console.log('CoinGecko response success'); // Temporary debug log
            break; // Exit the loop on success
        } catch (error) {
            lastError = error;
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 10;
                await promiseTimeout(retryAfter * 1000);
                continue;
            } else {
                throw error; // Re-throw the error to be caught by the Promise
            }
        }
    }

    if (lastError && !result) {
        throw lastError; // Throw the last error if all attempts failed
    }

    return result; // Return the successful result
}, 1);

function fetchCoinGeckoData(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
        geckoQueue.push({ url: endpoint, params: params })
            .then(resolve)
            .catch(reject);
    });
}

const memoryCache = new Map();
const MEMORY_CACHE_TTL = 30 * 1000; // 30 seconds

// Garbage collection for memory cache every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
        if (now > value.expiry) {
            memoryCache.delete(key);
        }
    }
}, 5 * 60 * 1000).unref(); // .unref() allows process to exit if this is the only thing running

async function fetchCoinGeckoDataWithCache(endpoint, params = null, cacheKey, ttlSeconds) {
    const now = Date.now();

    // 1. Check L1 Memory Cache
    if (memoryCache.has(cacheKey)) {
        const cachedItem = memoryCache.get(cacheKey);
        if (now < cachedItem.expiry) {
            // console.log(`[L1 Cache HIT] ${cacheKey}`);
            return cachedItem.data;
        } else {
            memoryCache.delete(cacheKey);
        }
    }

    try {
        // 2. Check L2 Redis Cache
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            // console.log(`[L2 Cache HIT] ${cacheKey}`);
            const parsedData = JSON.parse(cachedData);

            // Populate L1 cache for next time
            memoryCache.set(cacheKey, {
                data: parsedData,
                expiry: now + MEMORY_CACHE_TTL
            });

            return parsedData;
        }
    } catch (cacheError) {
        console.error(`Redis GET error for key ${cacheKey}:`, cacheError.message);
        // Don't throw, just proceed to fetch
    }

    // 3. If not in cache, fetch data
    // console.log(`[Cache MISS] Fetching data for key: ${cacheKey}`);
    const data = await fetchCoinGeckoData(endpoint, params);
    if (!data) {
        throw new Error('No data received from CoinGecko');
    }

    // 4. Store in L2 Redis Cache
    try {
        await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
    } catch (cacheError) {
        console.error(`Redis SETEX error for key ${cacheKey}:`, cacheError.message);
    }

    // 5. Store in L1 Memory Cache
    memoryCache.set(cacheKey, {
        data: data,
        expiry: now + MEMORY_CACHE_TTL
    });

    return data;
}

module.exports = {
    fetchCoinGeckoDataWithCache: fetchCoinGeckoDataWithCache,
    fetchCoinGeckoData: fetchCoinGeckoData,
};