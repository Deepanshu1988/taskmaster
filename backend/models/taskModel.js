const pool = require('../config/db');

class Task {
  // In taskModel.js - update the create method
  // In taskModel.js - update the create method
  static async create({ title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress = 0, comments = null }) {
    console.log('Creating task with data:', { 
      title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress, comments,
      commentsType: typeof comments,
      isCommentsEmpty: comments === '' || comments === null || comments === undefined
    });

    // Convert empty string to null for due_date
    const processedDueDate = (due_date === '' || !due_date) ? null : due_date;

    // Ensure Progress is a number between 0 and 100
    const processedProgress = Math.max(0, Math.min(100, Number(Progress) || 0));

    // Handle comments - convert empty string to null, but keep other falsy values as is
    const processedComments = (comments === '') ? null : comments;
    console.log('Processed comments:', processedComments);
    console.log('Processed comments before DB insert:', {
      original: comments,
      processed: processedComments,
      type: typeof processedComments
    });

    try {
      const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, priority, assigned_to, project_id, created_by, due_date, Progress, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          title, 
          description, 
          status || 'pending', 
          priority || 'medium', 
          assigned_to, 
          project_id, 
          created_by, 
          processedDueDate,
          processedProgress,
          processedComments
        ]
      );
      
      console.log('Task created with ID:', result.insertId);
      
      // Verify the data was stored correctly
      const [savedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
      console.log('Task data from database after creation:', savedTask[0]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  static async findAll() {
    const [rows] = await pool.query(`
      SELECT 
        t.*, 
        p.name as project_name,
        p.description as project_description,
        u.username as assignee_username,
        u.email as assignee_email,
        COALESCE(tt.total_time, 0) as total_time,
        tt.last_time_tracked,
        t.comments
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
  }

  static async findById(id) {
    try {
      console.log('Finding task by ID:', id);
      
      // First get the task with basic info
      const [tasks] = await pool.query(
        `SELECT t.*, 
                p.name as project_name,
                p.description as project_description,
                u1.username as creator_name,
                u2.username as assignee_name,
                COALESCE(tt.total_time, 0) as total_time,
                tt.last_time_tracked,
                t.comments
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN users u1 ON t.created_by = u1.id
         LEFT JOIN users u2 ON t.assigned_to = u2.id
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

      console.log('Raw task data from database:', tasks[0]);
      
      if (tasks.length === 0) {
        console.log('No task found with ID:', id);
        return null;
      }

      const task = tasks[0];
      console.log('Task data before processing:', JSON.stringify(task, null, 2));
      
      return task;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  static async findByUserId(userId, userRole) {
    const [tasks] = await pool.query(
      `SELECT 
        t.*, 
        p.name as project_name,
        p.description as project_description,
        u1.username as creator_name,
        u2.username as assignee_name,
        u2.email as assignee_email,
        COALESCE(tt.total_time, 0) as total_time,
        tt.last_time_tracked,
        t.comments
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN (
        SELECT 
          task_id, 
          SUM(duration) as total_time,
          MAX(updated_at) as last_time_tracked
        FROM task_time_tracking 
        GROUP BY task_id
      ) tt ON t.id = tt.task_id
      WHERE ${userRole === 'admin' ? '1=1' : 't.assigned_to = ?'}
      ORDER BY t.due_date ASC, t.created_at DESC`,
      userRole === 'admin' ? [] : [userId]
    );

    return tasks;
  }

  static async update(id, updates) {
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
      console.log('Executing SQL query:', query);
      console.log('With values:', values);
      
      try {
        const [result] = await pool.query(query, values);
        console.log('Update result:', {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows,
          message: result.message
        });
        return result.affectedRows;
      } catch (error) {
        // If the error is about unknown column 'updated_at', try without it
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage.includes('updated_at')) {
          console.log('updated_at column not found, trying without it');
          query = `UPDATE tasks SET ${fields} WHERE id = ?`;
          console.log('Executing fallback SQL query:', query);
          const [result] = await pool.query(query, values);
          console.log('Fallback update result:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
            message: result.message
          });
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
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async updateStatus(id, status) {
    const [result] = await pool.query(
      'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result.affectedRows;
  }

  static async getComments(taskId) {
    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.email 
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at DESC`,
      [taskId]
    );
    return rows;
  }

  static async addComment({ task_id, user_id, comment }) {
    const [result] = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, comment, created_at)
       VALUES (?, ?, ?, NOW())`,
      [task_id, user_id, comment]
    );
    return result.insertId;
  }

  static async getCommentWithUser(commentId) {
    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.email 
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );
    return rows[0] || null;
  }
}

module.exports = Task;