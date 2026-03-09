const axios = require("axios");
const redis = require("../config/redis");

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false";

async function fetchMarketData() {
  try {
    console.log("Fetching market data...");

    const { data } = await axios.get(COINGECKO_URL);

    await redis.set("market_data", JSON.stringify(data), "EX", 20);

    console.log("Market data cached in Redis");
  } catch (err) {
    console.error("Market fetch error:", err.message);
  }
}

module.exports = { fetchMarketData };