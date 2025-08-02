const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const logger = require('../utils/logger');

// Trim any whitespace from the URL path
router.use((req, res, next) => {
  req.url = req.url.trim();
  next();
});

// Routes with logging
router.post('/signup', async (req, res) => {
  const start = Date.now();
  try {
    await authController.signup(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const start = Date.now();
  try {
    await authController.login(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

router.post('/forgot-password', async (req, res) => {
  const start = Date.now();
  try {
    await authController.forgotPassword(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

router.post('/reset-password', async (req, res) => {
  const start = Date.now();
  try {
    await authController.resetPassword(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

router.post('/update-password', async (req, res) => {
  const start = Date.now();
  try {
    res.status(200).json({ message: 'Password update endpoint' });
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

router.post('/create-test-user', async (req, res) => {
  const start = Date.now();
  try {
    await authController.createTestUser(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

module.exports = router;