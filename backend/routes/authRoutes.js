const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Trim any whitespace from the URL path
router.use((req, res, next) => {
  req.url = req.url.trim();
  next();
});

// Routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
router.post('/update-password', (req, res) => {
  // Handle update password if needed
  res.status(200).json({ message: 'Password update endpoint' });
});
router.post('/create-test-user', (req, res) => authController.createTestUser(req, res));

module.exports = router;