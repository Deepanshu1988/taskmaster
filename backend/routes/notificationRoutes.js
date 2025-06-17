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
      const testEmail = 'your-test-email@example.com'; // Replace with test email
      console.log('Sending test email to:', testEmail);
      
      await emailService.sendNotificationEmail(
        testEmail,
        'Test Email from TaskMaster',
        'This is a test email to verify email functionality.'
      );
      
      res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email',
        error: error.message 
      });
    }
  });

module.exports = router;
