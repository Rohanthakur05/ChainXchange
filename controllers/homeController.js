const { fetchCoinGeckoDataWithCache } = require('../utils/geckoApi');

/**
 * Home Controller
 * Handles main application pages and dashboard
 */
class HomeController {
    /**
     * Display home page with market overview
     */
    /**
     * Get home page market data
     */
    static async getHomeData(req, res) {
        try {
            // Fetch top cryptocurrencies for homepage display
            const topCryptos = await fetchCoinGeckoDataWithCache(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h&locale=en',
                null,
                'home-top-cryptos',
                5 * 60 * 1000 // 5 minutes cache
            );

            // If API fails, use fallback data
            if (!topCryptos || topCryptos.length === 0) {
                const fallbackData = [
                    {
                        id: "bitcoin",
                        symbol: "btc",
                        name: "Bitcoin",
                        current_price: 45000,
                        market_cap_rank: 1,
                        price_change_percentage_24h: 2.5,
                        market_cap: 800000000000,
                        total_volume: 30000000000,
                        image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
                    },
                    {
                        id: "ethereum",
                        symbol: "eth",
                        name: "Ethereum",
                        current_price: 3000,
                        market_cap_rank: 2,
                        price_change_percentage_24h: 1.8,
                        market_cap: 350000000000,
                        total_volume: 15000000000,
                        image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
                    }
                ];

                return res.json({
                    topCryptos: fallbackData,
                    isFallback: true
                });
            }

            res.json({ topCryptos });
        } catch (error) {
            console.error('Home page error:', error);
            res.status(500).json({ error: 'Unable to load market data' });
        }
    }
}

module.exports = HomeController;