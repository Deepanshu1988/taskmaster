const pool = require('../config/db');

const Task = {
 // In taskModel.js - update the create method
// In taskModel.js - update the create method
async create({ title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress = 0 }) {
  console.log('Creating task with data:', { 
    title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress
  });

  // Convert empty string to null for due_date
  const processedDueDate = (due_date === '' || !due_date) ? null : due_date;

  // Ensure Progress is a number between 0 and 100
  const processedProgress = Math.max(0, Math.min(100, Number(Progress) || 0));

  try {
    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title, 
        description, 
        status || 'pending', 
        priority || 'medium', 
        assigned_to, 
        project_id, 
        created_by, 
        processedDueDate,
        processedProgress
      ]
    );
    console.log('Task created with ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
},

  async findAll() {
    const [rows] = await pool.query(`
      SELECT 
        t.*, 
        p.name as project_name,
        p.description as project_description,
        u.username as assignee_username,
        u.email as assignee_email,
        COALESCE(tt.total_time, 0) as total_time,
        tt.last_time_tracked
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN (
        SELECT 
          task_id, 
          SUM(duration) as total_time,
          MAX(updated_at) as last_time_tracked
        FROM task_time_tracking 
        GROUP BY task_id
      ) tt ON t.id = tt.task_id
      ORDER BY t.due_date ASC, t.created_at DESC
    `);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT t.*, 
              p.name as project_name,
              p.description as project_description,
              u.username as assignee_username,
              u.email as assignee_email,
              COALESCE(tt.total_time, 0) as total_time,
              tt.last_time_tracked
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN (
         SELECT 
           task_id, 
           SUM(duration) as total_time,
           MAX(updated_at) as last_time_tracked
         FROM task_time_tracking 
         WHERE task_id = ?
         GROUP BY task_id
       ) tt ON t.id = tt.task_id
       WHERE t.id = ?`,
      [id, id]
    );
    return rows[0];
  },

  async findByUserId(userId, userRole) {
    let query = `
      SELECT 
        t.*, 
        p.name as project_name,
        p.description as project_description,
        u.username as assignee_username,
        u.email as assignee_email,
        COALESCE(tt.total_time, 0) as total_time,
        tt.last_time_tracked
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN (
        SELECT 
          task_id, 
          SUM(duration) as total_time,
          MAX(updated_at) as last_time_tracked
        FROM task_time_tracking 
        GROUP BY task_id
      ) tt ON t.id = tt.task_id
      WHERE ${userRole === 'admin' ? '1=1' : 't.assigned_to = ?'}
      ORDER BY t.due_date ASC, t.created_at DESC
    `;
    
    const [rows] = await pool.query(
      query,
      userRole === 'admin' ? [] : [userId]
    );
    return rows;
  },

  async update(id, updates) {
    try {
      console.log('Update request for task ID:', id);
      console.log('Update data:', updates);
      
      // Don't update the ID
      delete updates.id;
      
      // Don't update created_at
      delete updates.created_at;
      
      // Validate and process progress if it exists in updates
      if (updates.progress !== undefined) {
        // Ensure progress is a number between 0 and 100
        updates.progress = Math.max(0, Math.min(100, Number(updates.progress) || 0));
      }
      
      // If there are no fields to update, return early
      if (Object.keys(updates).length === 0) {
        console.log('No fields to update');
        return 0;
      }
  
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), id];
      
      console.log('Generated SQL fields:', fields);
      console.log('Generated SQL values:', values);
      
      // First, try with updated_at
      let query = `UPDATE tasks SET ${fields}, updated_at = NOW() WHERE id = ?`;
      
      try {
        const [result] = await pool.query(query, values);
        console.log('Update result with updated_at:', result);
        return result.affectedRows;
      } catch (error) {
        // If the error is about unknown column 'updated_at', try without it
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage.includes('updated_at')) {
          console.log('updated_at column not found, trying without it');
          query = `UPDATE tasks SET ${fields} WHERE id = ?`;
          const [result] = await pool.query(query, values);
          return result.affectedRows;
        }
        // If it's a different error, rethrow it
        throw error;
      }
    } catch (error) {
      console.error('Error in task update:', {
        message: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
        sql: error.sql,
        stack: error.stack
      });
      throw error;
    }
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Find tasks by user ID
/*async findByUserId(userId) {
  const query = `
    SELECT t.*, u.username as assignee_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.assigned_to = ?
    ORDER BY t.due_date ASC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
},*/

// Update task status
async updateStatus(id, status) {
  const query = `
    UPDATE tasks 
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
},

// Get task comments
async getComments(taskId) {
  const query = `
    SELECT c.*, u.username as username
    FROM task_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = $1
    ORDER BY c.created_at DESC
  `;
  const result = await pool.query(query, [taskId]);
  return result.rows;
},
  
  // Add a comment
async addComment({ task_id, user_id, comment }) {
  const query = `
    INSERT INTO task_comments (task_id, user_id, comment, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING *
  `;
  const result = await pool.query(query, [task_id, user_id, comment]);
  return result.rows[0];
},

// Get comment with user info
async getCommentWithUser(commentId) {
  const query = `
    SELECT c.*, u.name as username
    FROM task_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = $1
  `;
  const result = await pool.query(query, [commentId]);
  return result.rows[0];
}

};

module.exports = Task;