const pool = require('../config/db');

class Notification {
  static async create(notificationData) {
    const [result] = await pool.execute(
      `INSERT INTO notifications 
       (user_id, title, message, type, status, related_entity, related_entity_id, scheduled_at, sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())`,
      [
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type || 'email',
        notificationData.status || 'unread',
        notificationData.relatedEntity || null,
        notificationData.relatedEntityId || null,
        notificationData.scheduledAt || null
      ]
    );
    
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId, status = null) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async updateStatus(id, status) {
    await pool.execute(
      'UPDATE notifications SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return this.findById(id);
  }

  static async findDueForSending() {
    const [rows] = await pool.execute(
      `SELECT * FROM notifications 
       WHERE (scheduled_at IS NULL OR scheduled_at <= NOW()) 
       AND status = 'unread'
       AND (type = 'email' OR type IS NULL)`
    );
    return rows;
  }
}

module.exports = Notification;
