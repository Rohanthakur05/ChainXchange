import api from '../utils/api';
import { safeGet, DEFAULT_TIMEOUT_MS } from '../utils/safeRequest';
import {
    logRequestStart,
    logRequestSuccess,
    logRequestFailed,
    logLoadingFinished,
} from '../utils/requestLog';
import { FALLBACK_MARKETS } from '../data/fallbackMarkets';

const LABEL = 'markets';
const CACHE_KEY = 'cx_markets_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;

let memoryCache = null;
let memoryCacheExpiry = 0;
let inflightPromise = null;
let inflightAbort = null;

export function parseMarketsResponse(data) {
    if (Array.isArray(data)) return data;
    if (data?.coins && Array.isArray(data.coins)) return data.coins;
    return [];
}

function readSessionCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.coins?.length || Date.now() > parsed.expiry) return null;
        return parsed.coins;
    } catch {
        return null;
    }
}

function writeSessionCache(coins) {
    try {
        sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ coins, expiry: Date.now() + CACHE_TTL_MS })
        );
    } catch {
        /* ignore */
    }
}

async function requestMarketsOnce(signal) {
    logRequestStart(LABEL, { url: '/crypto' });
    const response = await safeGet(api, '/crypto', {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        signal,
        label: LABEL,
    });
    const coins = parseMarketsResponse(response.data);
    if (!coins.length) {
        throw new Error('Empty market response');
    }
    logRequestSuccess(LABEL, { count: coins.length, isFallback: Boolean(response.data?.isFallback) });
    return {
        coins,
        isFallback: Boolean(response.data?.isFallback),
        fromCache: false,
    };
}

async function fetchFromNetwork(signal) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (signal?.aborted) throw new Error('Aborted');
        try {
            return await requestMarketsOnce(signal);
        } catch (err) {
            lastError = err;
            logRequestFailed(LABEL, err, { attempt: attempt + 1, maxAttempts: MAX_RETRIES + 1 });
            if (attempt < MAX_RETRIES && !signal?.aborted) {
                await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

function resolveFallback(err) {
    const stale = memoryCache?.length ? memoryCache : readSessionCache();
    if (stale?.length) {
        return { coins: stale, isFallback: true, fromCache: true, error: err };
    }
    return {
        coins: FALLBACK_MARKETS,
        isFallback: true,
        fromCache: false,
        error: err,
    };
}

export async function fetchMarkets({ force = false, signal: externalSignal } = {}) {
    const now = Date.now();

    if (!force && memoryCache?.length && now < memoryCacheExpiry) {
        return { coins: memoryCache, isFallback: false, fromCache: true };
    }

    if (!force) {
        const session = readSessionCache();
        if (session?.length) {
            memoryCache = session;
            memoryCacheExpiry = now + CACHE_TTL_MS;
            return { coins: session, isFallback: false, fromCache: true };
        }
    }

    if (!force && inflightPromise) {
        return inflightPromise;
    }

    const controller = new AbortController();
    inflightAbort = controller;
    if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    inflightPromise = fetchFromNetwork(controller.signal)
        .then((result) => {
            memoryCache = result.coins;
            memoryCacheExpiry = Date.now() + CACHE_TTL_MS;
            writeSessionCache(result.coins);
            return result;
        })
        .catch((err) => {
            if (err?.message === 'Aborted') throw err;
            return resolveFallback(err);
        })
        .finally(() => {
            logLoadingFinished(LABEL);
            inflightPromise = null;
            inflightAbort = null;
        });

    return inflightPromise;
}

export function abortMarketsFetch() {
    inflightAbort?.abort();
}

export function prefetchMarkets() {
    fetchMarkets().catch((err) => {
        if (err?.message !== 'Aborted') {
            logRequestFailed(LABEL, err, { phase: 'prefetch' });
        }
    });
}

export function getCachedMarkets() {
    if (memoryCache?.length && Date.now() < memoryCacheExpiry) {
        return memoryCache;
    }
    return readSessionCache() || FALLBACK_MARKETS;
}

export function hasValidMarketCache() {
    if (memoryCache?.length && Date.now() < memoryCacheExpiry) return true;
    return Boolean(readSessionCache()?.length);
}

export function findCoinById(coinId) {
    return getCachedMarkets().find((c) => c.id === coinId) || null;
}

export default {
    fetchMarkets,
    prefetchMarkets,
    abortMarketsFetch,
    getCachedMarkets,
    hasValidMarketCache,
    findCoinById,
    parseMarketsResponse,
};
