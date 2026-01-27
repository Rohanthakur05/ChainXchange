const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/auth.js');
const cryptoRoutes = require('./routes/crypto.js');
const paymentRoutes = require('./routes/payment.js');
const alertsRoutes = require('./routes/alerts.js');
const User = require('./models/User.js');
const { isAuthenticated } = require('./middleware/auth');
const HomeController = require('./controllers/homeController');
const CryptoController = require('./controllers/cryptoController');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow Vite dev server
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));
app.use(compression());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-trading', {
    retryWrites: true,
    w: 'majority'
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-trading',
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// User Authentication Middleware (for API)
app.use(async (req, res, next) => {
    if (req.cookies.user) {
        try {
            const user = await User.findById(req.cookies.user).select('-password').lean();
            // Attach user to request object instead of locals (locals is for views)
            req.user = user;
        } catch (error) {
            console.error('Error fetching user:', error);
            req.user = null;
            res.clearCookie('user');
        }
    } else {
        req.user = null;
    }
    next();
});

// API Routes
app.use('/auth', authRoutes);
app.use('/crypto', cryptoRoutes);
app.use('/payment', paymentRoutes);
app.use('/alerts', alertsRoutes);
app.get('/api/home', HomeController.getHomeData); // New API endpoint for home data

// WebSocket Setup for real-time updates
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Serve React App in Production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
    });
} else {
    // Basic root for dev API check
    app.get('/', (req, res) => {
        res.json({ message: 'ChainXchange API is running' });
    });
}

// Error Handling
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

module.exports = app;