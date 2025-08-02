const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const pool = require('../config/db');
const logger = require('../utils/logger');

router.use(authenticate);

// Get all users
router.get('/get/users', async (req, res) => {
  const start = Date.now();
  try {
    await userController.getUsers(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Get single user
router.get('/get/user/:id', async (req, res) => {
  const start = Date.now();
  try {
    await userController.getUser(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Update user
router.put('/update/user/:id', async (req, res) => {
  const start = Date.now();
  try {
    await userController.updateUser(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Update user preferences
router.put('/update/user/:id/preferences', async (req, res) => {
  const start = Date.now();
  try {
    await userController.updateUserPreferences(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Delete user
router.delete('/delete/user/:id', async (req, res) => {
  const start = Date.now();
  try {
    await userController.deleteUser(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Create user
router.post('/create/user', async (req, res) => {
  const start = Date.now();
  try {
    await userController.createUser(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Test database connection
router.get('/test-db', async (req, res) => {
  const start = Date.now();
  try {
    const [result] = await pool.query('SELECT 1 as test');
    res.json({ success: true, result });
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    console.error('Database test error:', error);
    logger.logRequest(req, res, Date.now() - start);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;