# ChainXchange — Professional Crypto Trading Platform

[![GitHub stars](https://img.shields.io/github/stars/Rohanthakur05/ChainXchange?style=social)](https://github.com/Rohanthakur05/ChainXchange/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Rohanthakur05/ChainXchange?style=social)](https://github.com/Rohanthakur05/ChainXchange/network/members)
[![GitHub issues](https://img.shields.io/github/issues/Rohanthakur05/ChainXchange)](https://github.com/Rohanthakur05/ChainXchange/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade cryptocurrency trading and portfolio management platform built with the MERN stack. Designed to replicate the experience of professional exchanges like Binance, Groww, and CoinDCX — with real-time prices, JWT-secured auth, atomic trade execution, and a Redis-backed caching layer.

---

## 🚀 Key Features

### 📈 Pro Trading Terminal (`/terminal/:coinId`)
- **Full-Screen Focus:** Distraction-free trading interface removing sidebars and widgets
- **Advanced Charting:** Integrated TradingView Lightweight Charts for professional analysis
- **Indicator System:** Complete suite of technical indicators (RSI, MACD, Bollinger Bands, EMA)
  - State persisted per-coin in localStorage
  - Single unified control panel for all chart modes
- **Order Management:** Fast buy/sell execution directly from the terminal with confirmation modals and full fee breakdown

### 💼 Portfolio Analytics (`/portfolio`)
- **Full Portfolio Overview:** Holdings, total value, per-asset P&L, and average buy price
- **Historical Performance:** Interactive Area Chart showing portfolio value over the last 30 days
- **Asset Allocation:** Pie chart distribution of your crypto assets
- **Real-time P&L:** Instant profit/loss tracking calculated against live CoinGecko prices
- **Redis-Cached:** Portfolio data cached at two tiers (personal + global market cache) for sub-200ms responses

### ⭐ Watchlist Manager
- **Instant Add/Remove:** Star any coin to add it to your watchlist
- **Dashboard Widget:** Real-time prices of your favorite assets
- **Smart Filtering:** Filter the Markets table to show only watched coins
- **Persistent:** Watchlist stored securely per-user in MongoDB

### 🔔 Price Alerts & Notifications
- **Flexible Triggers:** "Price Above", "Price Below", "% Increase", or "% Decrease"
- **Real-time Bell:** Topbar notification icon shows triggered alerts instantly
- **Alert Management:** View, pause, and delete active alerts from the Profile section

### 🔌 Real-time WebSocket Prices
- **Socket.IO Broadcaster:** Server pushes live market prices to all connected clients every 15 seconds
- **Per-Coin Rooms:** Subscribe to specific coin rooms for targeted price updates
- **Non-blocking Loop:** Broadcast loop is async-safe and won't hang on CoinGecko rate limits

### 🛡️ Security
- **JWT Authentication:** Stateless, cookie-based JWT tokens with automatic expiry and invalidation
- **Rate Limiting:** Auth routes protected against brute-force attacks
- **Account Lockout:** Failed login attempt tracking with timed lockout
- **Atomic Trades:** Buy/sell operations use MongoDB replica set transactions to prevent race conditions and negative balances
- **Input Validation:** Express middleware validates all trade inputs before processing

### ⌨️ Keyboard Shortcuts (Power Users)
| Key | Action |
|-----|--------|
| `/` | Open global search |
| `?` | Show all keyboard shortcuts |
| `B` | Quick buy (on coin page) |
| `S` | Quick sell (on coin page) |
| `W` | Toggle watchlist (on coin page) |
| `ESC` | Close any modal/overlay |

---

## ⚙️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18 + Vite** | Fast SPA with hot module replacement |
| **Axios** | HTTP client with centralized error classification |
| **Recharts** | Portfolio performance and allocation charts |
| **TradingView Lightweight Charts** | Candlestick and technical analysis |
| **Socket.IO Client** | Real-time WebSocket price updates |
| **Lucide React** | Modern, consistent icon system |
| **CSS Modules** | Scoped styling for maintainable, collision-free CSS |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | RESTful API server |
| **MongoDB + Mongoose** | Database for Users, Transactions, Portfolios, and Alerts |
| **Redis** | Two-tier caching for CoinGecko API responses |
| **Socket.IO** | Real-time WebSocket price broadcasting |
| **JWT + cookie-parser** | Secure, stateless authentication |
| **Helmet + Compression** | Security headers and response compression |
| **connect-mongo** | MongoDB-backed session storage |

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Register a new user |
| `POST` | `/auth/login` | ❌ | Login, receive JWT cookie |
| `POST` | `/auth/logout` | ✅ | Logout and clear cookie |
| `GET` | `/crypto` | ❌ | Top 100 coins from CoinGecko |
| `GET` | `/crypto/detail/:coinId` | Optional | Full coin data + user holding |
| `GET` | `/crypto/portfolio` | ✅ | Full portfolio with live P&L |
| `GET` | `/crypto/portfolio/history` | ✅ | 30-day portfolio value history |
| `GET` | `/crypto/transactions` | ✅ | Transaction history with filters |
| `POST` | `/crypto/buy` | ✅ | Buy order (atomic) |
| `POST` | `/crypto/sell` | ✅ | Sell order (atomic) |
| `GET` | `/api/portfolio` | ✅ | Portfolio summary (full detail) |
| `GET` | `/api/portfolio/summary` | ✅ | Lightweight holdings summary |
| `GET` | `/api/home` | ❌ | Home page market snapshot |
| `GET/POST` | `/alerts` | ✅ | Manage price alerts |
| `GET/POST` | `/watchlist` | ✅ | Manage watchlist |
| `POST` | `/payment/deposit` | ✅ | Add funds to wallet |
| `GET` | `/health` | ❌ | Server + DB health check |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** — local (with replica set for transactions) or Atlas
- **Redis** — local or cloud instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rohanthakur05/ChainXchange.git
   cd ChainXchange
   ```

2. **Install dependencies**
   ```bash
   # Backend
   npm install

   # Frontend
   cd client && npm install && cd ..
   ```

3. **Environment setup**

   Create a `.env` file in the project root:
   ```env
   PORT=8000
   MONGO_URI=mongodb://127.0.0.1:27017/crypto-trading?replicaSet=rs0
   JWT_SECRET=your_strong_jwt_secret
   COOKIE_SECRET=your_cookie_secret
   SESSION_SECRET=your_session_secret
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   ```

   > **Note:** MongoDB must be running as a replica set to support atomic trade transactions. For local development, start MongoDB with `mongod --replSet rs0` and run `rs.initiate()` once in `mongosh`.

4. **Run the application**
   ```bash
   # Terminal 1 — Backend (with auto-reload)
   nodemon app.js

   # Terminal 2 — Frontend dev server
   cd client && npm run dev
   ```

5. **Open in browser**

   [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
ChainXchange/
├── app.js                    # Express server entry point
├── config/
│   └── database.js           # MongoDB connection with retry logic
├── controllers/
│   ├── authController.js     # Register, login, logout
│   ├── cryptoController.js   # Markets, portfolio, chart data
│   ├── tradeController.js    # Atomic buy/sell with transactions
│   ├── paymentController.js  # Wallet deposit/withdrawal
│   ├── watchlistController.js
│   └── homeController.js
├── middleware/
│   ├── auth.js               # JWT verification (isAuthenticated, optionalAuth)
│   └── validate.js           # Trade input validation
├── models/
│   ├── User.js               # User schema (wallet, watchlist, security)
│   ├── Portfolio.js          # Per-coin holdings (quantity, avg buy price)
│   ├── Transaction.js        # Trade history (buy/sell, idempotency key)
│   ├── Alert.js              # Price alert definitions
│   └── PaymentTransaction.js # Deposit/withdrawal records
├── routes/
│   ├── auth.js
│   ├── crypto.js             # Trading + portfolio routes
│   ├── portfolio.js          # /api/portfolio standalone router
│   ├── alerts.js
│   ├── payment.js
│   └── watchlist.js
├── utils/
│   ├── geckoApi.js           # CoinGecko fetch with Redis cache
│   ├── redisClient.js        # Shared Redis client
│   └── tradeGuard.js         # Idempotency + slippage checks
├── client/                   # React + Vite frontend
│   └── src/
│       ├── components/       # Reusable UI (Button, Badge, Chart, etc.)
│       ├── pages/            # Portfolio, Markets, Terminal, Auth, etc.
│       ├── context/          # AuthContext, ThemeContext
│       ├── services/         # portfolioService.js, priceService.js
│       └── utils/            # api.js (Axios), errors.js
└── tests/                    # Jest unit tests
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rohan Thakur** — Lead Developer

- GitHub: [@Rohanthakur05](https://github.com/Rohanthakur05)

---

<p align="center">Made with ❤️ for the crypto community</p>
