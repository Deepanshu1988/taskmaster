const { Op } = require('sequelize');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const emailService = require('../utils/emailService');

class NotificationController {
  // Create a new notification
  static async createNotification(req, res) {
    console.log('\n--- Creating Notification ---');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {

      console.log('Notification created:', {
        id: notification.id,
        type: notification.type,
        scheduledAt: notification.scheduledAt
    });
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
      console.error('Error in createNotification:', error);
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
    console.log('\n--- Sending Notification ---');
    console.log('Notification ID:', notification.id);
    console.log('Type:', notification.type);
    console.log('Title:', notification.title);
    console.log('Recipient User ID:', notification.userId);
    
    try {
        const user = notification.User;
        
        if (!user) {
            console.error('User not found for notification');
            return;
        }
        
        console.log('User found:', user.email);
        console.log('User notification prefs:', JSON.stringify(user.notificationPreferences, null, 2));
        
        // Rest of your existing code...
    } catch (error) {
        console.error('Error in sendNotification:', error);
        throw error;
    }
}
}

// Schedule job to send notifications every minute
setInterval(() => {
  NotificationController.sendScheduledNotifications().catch(console.error);
}, 60000);

module.exports = NotificationController;
