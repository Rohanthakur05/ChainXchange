const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const MongoStore = require('connect-mongo');

const { config, validateEnv } = require('./config/env');
const connectDB = require('./config/database.js');
const { connectRedis } = require('./utils/redisClient.js');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.js');
const cryptoRoutes = require('./routes/crypto.js');
const paymentRoutes = require('./routes/payment.js');
const alertsRoutes = require('./routes/alerts.js');
const watchlistRoutes = require('./routes/watchlist.js');
const portfolioRoutes = require('./routes/portfolio.js');

const { optionalAuth } = require('./middleware/auth');
const HomeController = require('./controllers/homeController');
const { fetchCoinGeckoDataWithCache } = require('./utils/geckoApi');

validateEnv();

const app = express();
const server = http.createServer(app);

/* ─── Trust proxy (Render / Railway / nginx) ─────────────────── */
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

/* ─── Socket.IO ──────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/* ─── Security & Core Middleware ─────────────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://s3.tradingview.com'],
            frameSrc: ["'self'", 'https://s.tradingview.com'],
            connectSrc: [
              "'self'",
              'wss:',
              'https://api.coingecko.com',
              'https://*.onrender.com',
              'https://*.vercel.app'
            ],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:']
          }
        }
      : false
  })
);

app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookieSecret));
app.use(compression());

/* ─── CORS ───────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && config.clientUrl.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ─── Rate limiting (global) ─────────────────────────────────── */
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      errorCode: 'RATE_LIMITED'
    },
    skip: (req) => req.path === '/health' || req.path === '/api/health'
  })
);

/* ─── Session ────────────────────────────────────────────────── */
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoUri,
      ttl: 24 * 60 * 60
    }),
    cookie: {
      secure: config.cookieSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use(optionalAuth);

/* ─── Health & Root (always available) ───────────────────────── */
const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.env,
    version: '1.0.0'
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'ChainXchange API is running',
    environment: config.env,
    docs: {
      health: '/health',
      auth: '/auth',
      payment: '/payment',
      crypto: '/crypto'
    }
  });
});

/* ─── API Routes ─────────────────────────────────────────────── */
app.use('/auth', authRoutes);
app.use('/crypto', cryptoRoutes);
app.use('/payment', paymentRoutes);
app.use('/alerts', alertsRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.get('/api/home', HomeController.getHomeData);

/* ─── Production SPA (Express 5 compatible wildcard) ─────────── */
if (config.isProduction) {
  const clientDist = path.join(__dirname, 'client/dist');

  app.use(express.static(clientDist));

  // Express 5 requires named wildcard — `*` is invalid in path-to-regexp v8+
  app.get('/{*splat}', (req, res, next) => {
    // Let API paths fall through to 404 handler
    const apiPrefixes = ['/auth', '/crypto', '/payment', '/alerts', '/watchlist', '/api', '/health'];
    if (apiPrefixes.some((p) => req.path.startsWith(p))) {
      return next();
    }

    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        logger.warn('SPA index.html not found — run npm run vercel-build', { path: clientDist });
        return next();
      }
    });
  });
}

/* ─── Error Handlers ─────────────────────────────────────────── */
app.use(notFoundHandler);
app.use(globalErrorHandler);

/* ─── Socket.IO ──────────────────────────────────────────────── */
io.on('connection', (socket) => {
  logger.debug('WebSocket client connected', { socketId: socket.id });

  socket.on('subscribe_coin', (coinId) => {
    if (typeof coinId === 'string' && coinId.length < 50) {
      socket.join(`coin:${coinId}`);
    }
  });

  socket.on('unsubscribe_coin', (coinId) => {
    socket.leave(`coin:${coinId}`);
  });

  socket.on('disconnect', () => {
    logger.debug('WebSocket client disconnected', { socketId: socket.id });
  });
});

/* ─── Market Price Broadcaster ───────────────────────────────── */
const BROADCAST_INTERVAL_MS = 15000;

const broadcastPrices = async () => {
  try {
    const coins = await fetchCoinGeckoDataWithCache(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      null,
      'ws-price-broadcast',
      30000
    );

    if (!Array.isArray(coins)) return;

    const marketSnapshot = coins.map((c) => ({
      id: c.id,
      price: c.current_price,
      change24h: c.price_change_percentage_24h,
      volume: c.total_volume
    }));

    io.emit('market_update', marketSnapshot);

    coins.forEach((coin) => {
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
    logger.warn('Price broadcast failed', { error: err.message });
  }
};

/* ─── Graceful shutdown ──────────────────────────────────────── */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* ─── Start server ───────────────────────────────────────────── */
if (require.main === module) {
  const startServer = async () => {
    try {
      await connectDB();

      try {
        await connectRedis();
      } catch (e) {
        logger.warn('Redis unavailable — caching disabled', { error: e.message });
      }

      setInterval(broadcastPrices, BROADCAST_INTERVAL_MS);

      server.listen(config.port, () => {
        logger.info('Server started', {
          url: `http://localhost:${config.port}`,
          health: `http://localhost:${config.port}/health`,
          environment: config.env
        });
      });
    } catch (err) {
      logger.error('Failed to start server', { error: err.message });
      process.exit(1);
    }
  };

  startServer();
}

module.exports = { app, server, io };
