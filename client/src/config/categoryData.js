/**
 * Crypto Category Mapping
 * Maps coin IDs (from CoinGecko) to their categories
 */

export const CATEGORIES = {
    all: { name: 'All', icon: '📊', color: 'var(--text-primary)' },
    layer1: { name: 'Layer 1', icon: '⛓️', color: '#00B5AD' },
    layer2: { name: 'Layer 2', icon: '🔗', color: '#6435C9' },
    defi: { name: 'DeFi', icon: '🏦', color: '#2185D0' },
    meme: { name: 'Memecoins', icon: '🐕', color: '#F2711C' },
    stablecoin: { name: 'Stablecoins', icon: '💵', color: '#21BA45' },
    nft: { name: 'NFT', icon: '🎨', color: '#E03997' },
    exchange: { name: 'Exchange', icon: '💱', color: '#FBBD08' },
    privacy: { name: 'Privacy', icon: '🔒', color: '#767676' },
    gaming: { name: 'Gaming', icon: '🎮', color: '#A333C8' }
};

// Map coin IDs to categories
// This covers the top 100+ coins from CoinGecko
export const COIN_CATEGORIES = {
    // Layer 1 - Major Blockchains
    bitcoin: ['layer1'],
    ethereum: ['layer1', 'defi'],
    solana: ['layer1'],
    cardano: ['layer1'],
    avalanche: ['layer1', 'defi'],
    polkadot: ['layer1'],
    tron: ['layer1'],
    near: ['layer1'],
    cosmos: ['layer1'],
    aptos: ['layer1'],
    sui: ['layer1'],
    fantom: ['layer1', 'defi'],
    algorand: ['layer1'],
    hedera: ['layer1'],
    vechain: ['layer1'],
    elrond: ['layer1'],
    flow: ['layer1', 'nft'],
    tezos: ['layer1', 'nft'],
    kaspa: ['layer1'],
    sei: ['layer1'],

    // Layer 2 Solutions
    matic: ['layer2'],
    'polygon-ecosystem-token': ['layer2'],
    arbitrum: ['layer2'],
    optimism: ['layer2'],
    immutable: ['layer2', 'gaming'],
    'mantle': ['layer2'],
    starknet: ['layer2'],

    // DeFi Tokens
    uniswap: ['defi'],
    chainlink: ['defi'],
    aave: ['defi'],
    lido: ['defi'],
    maker: ['defi'],
    'the-graph': ['defi'],
    'pancakeswap-token': ['defi'],
    'curve-dao-token': ['defi'],
    '1inch': ['defi'],
    compound: ['defi'],
    sushi: ['defi'],
    yearn: ['defi'],
    synthetix: ['defi'],
    jupiter: ['defi'],
    raydium: ['defi'],
    ondo: ['defi'],
    pendle: ['defi'],

    // Memecoins
    dogecoin: ['meme'],
    'shiba-inu': ['meme'],
    pepe: ['meme'],
    bonk: ['meme'],
    floki: ['meme'],
    'dogwifhat': ['meme'],
    'brett': ['meme'],
    'mog-coin': ['meme'],
    'popcat': ['meme'],
    'cat-in-a-dogs-world': ['meme'],

    // Stablecoins
    tether: ['stablecoin'],
    'usd-coin': ['stablecoin'],
    dai: ['stablecoin', 'defi'],
    'first-digital-usd': ['stablecoin'],
    'true-usd': ['stablecoin'],
    'pax-dollar': ['stablecoin'],
    frax: ['stablecoin', 'defi'],
    usdd: ['stablecoin'],

    // Exchange Tokens
    binancecoin: ['exchange', 'layer1'],
    'okb': ['exchange'],
    'crypto-com-chain': ['exchange'],
    'kucoin-shares': ['exchange'],
    'bitget-token': ['exchange'],
    'gate-token': ['exchange'],
    'mx-token': ['exchange'],
    'leo-token': ['exchange'],

    // NFT & Metaverse
    'axie-infinity': ['nft', 'gaming'],
    'the-sandbox': ['nft', 'gaming'],
    'decentraland': ['nft', 'gaming'],
    'enjincoin': ['nft', 'gaming'],
    'render-token': ['nft'],
    'fetch-ai': ['nft'],
    blur: ['nft'],
    'magic-token': ['nft', 'gaming'],

    // Gaming
    'gala': ['gaming'],
    'illuvium': ['gaming'],
    'stepn': ['gaming'],
    'echelon-prime': ['gaming'],
    'beam': ['gaming'],
    'xai': ['gaming'],
    'pixels': ['gaming'],

    // Privacy
    monero: ['privacy'],
    zcash: ['privacy'],
    dash: ['privacy'],

    // Other notable coins
    xrp: ['layer1'],
    'leo-token': ['exchange'],
    'wrapped-bitcoin': ['defi'],
    'staked-ether': ['defi'],
    stellar: ['layer1'],
    litecoin: ['layer1'],
    'bitcoin-cash': ['layer1'],
    'ethereum-classic': ['layer1'],
    'internet-computer': ['layer1'],
    filecoin: ['layer1'],
    quant: ['layer1'],
    mantra: ['layer1'],
    injective: ['layer1', 'defi'],
    thorchain: ['defi'],
    theta: ['layer1'],
    artificialtoken: ['layer1'],
    worldcoin: ['layer1'],
    pyth: ['defi'],
    bittensor: ['layer1'],
};

/**
 * Get categories for a coin
 * @param {string} coinId - CoinGecko coin ID
 * @returns {string[]} Array of category IDs
 */
export const getCoinCategories = (coinId) => {
    return COIN_CATEGORIES[coinId?.toLowerCase()] || [];
};

/**
 * Check if coin belongs to a category
 * @param {string} coinId - CoinGecko coin ID
 * @param {string} categoryId - Category ID
 * @returns {boolean}
 */
export const coinBelongsToCategory = (coinId, categoryId) => {
    if (categoryId === 'all') return true;
    const categories = getCoinCategories(coinId);
    return categories.includes(categoryId);
};

/**
 * Filter coins by category
 * @param {Array} coins - Array of coin objects with 'id' property
 * @param {string} categoryId - Category ID to filter by
 * @returns {Array} Filtered coins
 */
export const filterCoinsByCategory = (coins, categoryId) => {
    if (categoryId === 'all') return coins;
    return coins.filter(coin => coinBelongsToCategory(coin.id, categoryId));
};
