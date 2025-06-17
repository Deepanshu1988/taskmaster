const pool = require('../config/db');

const TimeTracking = {
  // Start tracking time for a task
  async startTracking({ task_id, user_id, notes = '' }) {
    const [result] = await pool.query(
      'INSERT INTO task_time_tracking (task_id, user_id, start_time, notes) VALUES (?, ?, NOW(), ?)',
      [task_id, user_id, notes]
    );
    
    // Update task's last_time_tracked
    await pool.query(
      'UPDATE tasks SET last_time_tracked = NOW() WHERE id = ?',
      [task_id]
    );
    
    return result.insertId;
  },
  
  // Stop tracking time for a task
  async stopTracking(timeEntryId, notes = '') {
    // Get the entry first to calculate duration
    const [entries] = await pool.query(
      'SELECT * FROM task_time_tracking WHERE id = ?',
      [timeEntryId]
    );
    
    if (entries.length === 0) {
      throw new Error('Time entry not found');
    }
    
    const entry = entries[0];
    const now = new Date();
    const startTime = new Date(entry.start_time);
    const duration = Math.floor((now - startTime) / 1000); // in seconds
    
    // Update the time entry
    const [result] = await pool.query(
      `UPDATE task_time_tracking 
       SET end_time = NOW(), 
           duration = ?, 
           notes = CONCAT(IFNULL(notes, ''), IF(notes IS NOT NULL, ' ', ''), ?)
       WHERE id = ?`,
      [duration, notes, timeEntryId]
    );
    
    // Update the task's total time
    await pool.query(
      'UPDATE tasks SET total_time = total_time + ? WHERE id = ?',
      [duration, entry.task_id]
    );
    
    return result.affectedRows > 0;
  },
  
  // Get all time entries for a task
  async getTaskTimeEntries(taskId) {
    const [rows] = await pool.query(
      `SELECT t.*, u.username, u.email 
       FROM task_time_tracking t
       JOIN users u ON t.user_id = u.id
       WHERE t.task_id = ?
       ORDER BY t.start_time DESC`,
      [taskId]
    );
    return rows;
  },
  
  // Get time entries for a user
  async getUserTimeEntries(userId, { startDate, endDate } = {}) {
    let query = `SELECT t.*, tk.title as task_title, p.name as project_name 
                FROM task_time_tracking t
                JOIN tasks tk ON t.task_id = tk.id
                LEFT JOIN projects p ON tk.project_id = p.id
                WHERE t.user_id = ?`;
    
    const params = [userId];
    
    if (startDate) {
      query += ' AND t.start_time >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND t.start_time <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY t.start_time DESC';
    
    const [rows] = await pool.query(query, params);
    return rows;
  },
  
  // Get current active time entry for a user
  async getActiveTimeEntry(userId) {
    const [rows] = await pool.query(
      `SELECT t.*, tk.title as task_title 
       FROM task_time_tracking t
       JOIN tasks tk ON t.task_id = tk.id
       WHERE t.user_id = ? AND t.end_time IS NULL
       ORDER BY t.start_time DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },
  
  // Format seconds to HH:MM:SS
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  },
  
  // Get time summary for a task
  async getTaskTimeSummary(taskId) {
    const [result] = await pool.query(
      `SELECT 
         COUNT(*) as total_entries,
         SUM(duration) as total_seconds,
         SUM(CASE WHEN end_time IS NULL THEN 1 ELSE 0 END) as active_entries
       FROM task_time_tracking 
       WHERE task_id = ?`,
      [taskId]
    );
    
    const summary = result[0] || { total_entries: 0, total_seconds: 0, active_entries: 0 };
    
    return {
      totalEntries: summary.total_entries,
      totalTime: summary.total_seconds || 0,
      activeEntries: summary.active_entries,
      formattedTime: this.formatDuration(summary.total_seconds || 0)
    };
  }
};

module.exports = TimeTracking;
