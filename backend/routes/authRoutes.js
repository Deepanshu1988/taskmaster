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
//router.post('/login ', authController.login); // Handle login with trailing space
router.post('/update-password', authController.updateUserPassword);
router.post('/create-test-user', authController.createTestUser); // Test endpoint

module.exports = router;