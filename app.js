const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/database.js');
const { connectRedis } = require('./utils/redisClient.js');

const authRoutes = require('./routes/auth.js');
const cryptoRoutes = require('./routes/crypto.js');
const paymentRoutes = require('./routes/payment.js');
const alertsRoutes = require('./routes/alerts.js');
const watchlistRoutes = require('./routes/watchlist.js');
const { optionalAuth } = require('./middleware/auth');
const HomeController = require('./controllers/homeController');
const { fetchCoinGeckoDataWithCache } = require('./utils/geckoApi');

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ─── Environment ────────────────────────────────────────────── */
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-trading';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS: read allowed origins from environment — never hardcode
const ALLOWED_ORIGINS = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];

/* ─── Socket.IO with env-driven CORS ────────────────────────── */
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

/* ─── Core Middleware ────────────────────────────────────────── */
app.use(helmet({
    // Allow TradingView iframes from the coin detail page
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://s3.tradingview.com'],
            frameSrc: ["'self'", 'https://s.tradingview.com'],
            connectSrc: ["'self'", 'wss:', 'https://api.coingecko.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        }
    }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'chainxchange-cookie-secret'));
app.use(compression());

/* ─── CORS headers for REST API ─────────────────────────────── */
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

/* ─── Start server after MongoDB connects ────────────────────── */
const startServer = async () => {
    try {
        // 1. Connect to Database (Throws if fails)
        await connectDB();

        // 2. Connect to Redis (Throws if fails)
        await connectRedis();

        /* Session — stored in MongoDB, not memory */
        app.use(session({
            secret: process.env.SESSION_SECRET || 'chainxchange-session-secret',
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 24 * 60 * 60 }),
            cookie: {
                secure: NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            }
        }));

        /* Global optional auth — populates req.user from JWT if present.
           Route-level isAuthenticated still blocks unauthenticated calls. */
        app.use(optionalAuth);

        /* ─── Health check ─────────────────────────────────────── */
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: NODE_ENV
            });
        });

        /* ─── API Routes ───────────────────────────────────────── */
        app.use('/auth', authRoutes);
        app.use('/crypto', cryptoRoutes);
        app.use('/payment', paymentRoutes);
        app.use('/alerts', alertsRoutes);
        app.use('/watchlist', watchlistRoutes);
        app.get('/api/home', HomeController.getHomeData);

        /* ─── Socket.IO — Real-time price broadcasting ─────────── */
        io.on('connection', (socket) => {
            console.log(`[WS] Client connected: ${socket.id}`);

            /* Subscribe to a specific coin's price room */
            socket.on('subscribe_coin', (coinId) => {
                if (typeof coinId === 'string' && coinId.length < 50) {
                    socket.join(`coin:${coinId}`);
                }
            });

            socket.on('unsubscribe_coin', (coinId) => {
                socket.leave(`coin:${coinId}`);
            });

            socket.on('disconnect', () => {
                console.log(`[WS] Client disconnected: ${socket.id}`);
            });
        });

        /* Global market price broadcaster — every 15 seconds.
           Fetches top 50 coins and emits to all connected clients.
           Each page also gets coin-specific updates via its room. */
        const BROADCAST_INTERVAL_MS = 15 * 1000;

        const broadcastPrices = async () => {
            try {
                const coins = await fetchCoinGeckoDataWithCache(
                    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false',
                    null,
                    'ws-price-broadcast',
                    30 * 1000  // 30-second cache for broadcast (slightly shorter than interval)
                );

                if (!Array.isArray(coins)) return;

                // Emit global market update to all clients
                const marketSnapshot = coins.map(c => ({
                    id: c.id,
                    price: c.current_price,
                    change24h: c.price_change_percentage_24h,
                    volume: c.total_volume
                }));
                io.emit('market_update', marketSnapshot);

                // Emit per-coin updates to subscribed clients only
                coins.forEach(coin => {
                    io.to(`coin:${coin.id}`).emit('price_update', {
                        id: coin.id,
                        price: coin.current_price,
                        high24h: coin.high_24h,
                        low24h: coin.low_24h,
                        change24h: coin.price_change_percentage_24h,
                        volume: coin.total_volume,
                        updatedAt: Date.now()
                    });
                });
            } catch (err) {
                // Non-fatal — don't crash the broadcaster
                console.warn('[WS] Price broadcast failed:', err.message);
            }
        };

        // Run once immediately on startup, then on interval
        broadcastPrices();
        setInterval(broadcastPrices, BROADCAST_INTERVAL_MS);

        /* ─── Serve React build in production ─────────────────── */
        if (NODE_ENV === 'production') {
            app.use(express.static(path.join(__dirname, 'client/dist')));
            app.get('*', (req, res) => {
                res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
            });
        } else {
            app.get('/', (req, res) => {
                res.json({ message: 'ChainXchange API is running', dbStatus: 'connected', environment: NODE_ENV });
            });
        }

        /* ─── Error handlers ───────────────────────────────────── */
        app.use((req, res) => {
            res.status(404).json({ error: 'Endpoint not found', path: req.path });
        });

        app.use((err, req, res, next) => {
            console.error('[Error]', err.stack);
            res.status(err.status || 500).json({
                error: NODE_ENV === 'development' ? err.message : 'Internal Server Error'
            });
        });

        server.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`📍 Health: http://localhost:${PORT}/health`);
            console.log(`🌐 Environment: ${NODE_ENV}`);
            console.log(`🔌 WebSocket price broadcaster active (${BROADCAST_INTERVAL_MS / 1000}s interval)`);
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;