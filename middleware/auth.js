const User = require('../models/User'); // Import your User model

const isAuthenticated = async (req, res, next) => {
    try {
        if (req.cookies.user) {
            const user = await User.findById(req.cookies.user);
            if (user) {
                req.user = user; // Make the user object available in the request
                res.locals.user = user; // Make the user object available in the views
                return next(); // User is authenticated, proceed to the next middleware or route handler
            }
        }
        // Return JSON 401 for API calls (React SPA compatibility)
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    } catch (error) {
        console.error('Authentication Middleware Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const isNotAuthenticated = (req, res, next) => {
    if (!req.cookies.user) {
        return next(); // User is not authenticated, proceed
    }
    return res.redirect('/auth/login'); // Redirect authenticated users away from login/signup pages
};

module.exports = { isAuthenticated, isNotAuthenticated };