const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Authentication Routes
// router.get('/signup', AuthController.showSignup); // Handled by React
router.post('/signup', AuthController.signup);
// router.get('/login', AuthController.showLogin); // Handled by React
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);
router.get('/profile', isAuthenticated, AuthController.getProfile);

module.exports = router;