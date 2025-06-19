const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Create a new notification (admin only)
router.post('/', authenticate, notificationController.createNotification);

// Get user's notifications
router.get('/user/:userId', notificationController.getUserNotifications);

// Mark notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// Delete notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

router.get('/test-email', async (req, res) => {
  try {
    await emailService.sendNotificationEmail(
      'admin@example.com',
      'Test Email',
      'This is a test email'
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
