const pool = require('../config/db');

const TaskAttachment = {
  // Create a new attachment record
  async create({ task_id, user_id, file_name, file_path, file_size, file_type }) {
    const [result] = await pool.query(
      `INSERT INTO task_attachments 
       (task_id, user_id, file_name, file_path, file_size, file_type) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task_id, user_id, file_name, file_path, file_size, file_type]
    );
    return this.findById(result.insertId);
  },

  // Find attachment by ID
  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM task_attachments WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Find all attachments for a task
  async findByTaskId(taskId) {
    const [rows] = await pool.query(
      `SELECT ta.*, u.username as uploaded_by 
       FROM task_attachments ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.created_at DESC`,
      [taskId]
    );
    return rows;
  },

  // Delete an attachment
  async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM task_attachments WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Delete all attachments for a task
  async deleteByTaskId(taskId) {
    const [result] = await pool.query(
      'DELETE FROM task_attachments WHERE task_id = ?',
      [taskId]
    );
    return result.affectedRows > 0;
  }
};

module.exports = TaskAttachment;
