const { Op } = require('sequelize');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const emailService = require('../utils/emailService');

class NotificationController {
  // Create a new notification
  static async createNotification(req, res) {
    try {
      const { userId, title, message, type, relatedEntity, relatedEntityId, scheduledAt } = req.body;
      
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        relatedEntity,
        relatedEntityId,
        scheduledAt: scheduledAt || new Date(),
        status: 'unread'
      });

      // Send immediately if not scheduled for future
      if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
        await this.sendNotification(notification);
      }

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message
      });
    }
  }

  // Get notifications for a user
  static async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;
      
      const where = { userId };
      if (status) where.status = status;
      
      const notifications = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      });

      res.json({
        success: true,
        data: notifications.rows,
        total: notifications.count
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      notification.status = 'read';
      await notification.save();

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification',
        error: error.message
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      notification.status = 'deleted';
      await notification.save();

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  // Send scheduled notifications
  static async sendScheduledNotifications() {
    try {
      const now = new Date();
      const notifications = await Notification.findAll({
        where: {
          status: 'unread',
          scheduledAt: {
            [Op.lte]: now
          },
          sentAt: null
        },
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'notificationPreferences']
        }]
      });

      for (const notification of notifications) {
        await this.sendNotification(notification);
        notification.sentAt = new Date();
        await notification.save();
      }
    } catch (error) {
      console.error('Error sending scheduled notifications:', error);
    }
  }

  // Helper method to send notification based on type
  static async sendNotification(notification) {
    try {
      const user = notification.User;
      
      // Check user preferences before sending
      if (!user || !user.notificationPreferences) return;
      
      const prefs = user.notificationPreferences[notification.type];
      if (!prefs || !prefs.enabled) return;

      switch (notification.type) {
        case 'email':
          await emailService.sendNotificationEmail(
            user.email,
            notification.title,
            notification.message
          );
          break;
        case 'push':
          // TODO: Implement push notification service
          console.log(`Push notification sent: ${notification.title}`);
          break;
        default:
          // In-app notifications are stored in DB and will be fetched by the client
          break;
      }
    } catch (error) {
      console.error(`Error sending ${notification.type} notification:`, error);
      throw error;
    }
  }
}

// Schedule job to send notifications every minute
setInterval(() => {
  NotificationController.sendScheduledNotifications().catch(console.error);
}, 60000);

module.exports = NotificationController;
