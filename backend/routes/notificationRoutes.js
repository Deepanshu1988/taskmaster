const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

// Create a new notification (admin only)
router.post('/create/notification', authenticate, async (req, res, next) => {
  const start = Date.now();
  try {
    await notificationController.createNotification(req, res, next);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    next(error);
  }
});

// Get user's notifications
router.get('/get/notifications/user/:userId', authenticate, async (req, res, next) => {
  const start = Date.now();
  try {
    await notificationController.getUserNotifications(req, res, next);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    next(error);
  }
});

// Mark notification as read
router.patch('/mark-as-read/:id', authenticate, async (req, res, next) => {
  const start = Date.now();
  try {
    await notificationController.markAsRead(req, res, next);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    next(error);
  }
});

// Delete notification
router.delete('/delete/notification/:id', authenticate, async (req, res, next) => {
  const start = Date.now();
  try {
    await notificationController.deleteNotification(req, res, next);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    next(error);
  }
});

router.get('/test-email', async (req, res) => {
  const start = Date.now();
  try {
    await emailService.sendNotificationEmail(
      'admin@example.com',
      'Test Email',
      'This is a test email'
    );
    logger.logRequest(req, res, Date.now() - start);
    res.json({ success: true });
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    console.error('Email test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
