const Task = require('../models/taskModel');

exports.createTask = async (req, res) => {
  try {
    const taskData = { ...req.body, created_by: req.user.id };
    const taskId = await Task.create(taskData);
    res.status(201).json({ id: taskId, ...taskData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    let tasks;
    
    if (req.user.role === 'admin') {
      // Admin can see all tasks with project and assignee info
      tasks = await Task.findAll();
    } else {
      // Regular users only see tasks where they are involved
      tasks = await Task.findByUserId(req.user.id, req.user.role);
    }
    
    // Format the response to include project, assignee, and time tracking data
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      progress: task.Progress || 0,
      total_time: task.total_time || 0,
      last_time_tracked: task.last_time_tracked,
      project: task.project_id ? {
        id: task.project_id,
        name: task.project_name,
        description: task.project_description
      } : null,
      assignee: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assignee_username,
        email: task.assignee_email
      } : null
    }));
    
    res.json({ 
      success: true, 
      data: formattedTasks
    });
  } catch (error) {
    console.error('Error in getTasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tasks',
      error: error.message 
    });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    // Format the response to include project, assignee, and time tracking data
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      progress: task.Progress || 0,
      total_time: task.total_time || 0,
      last_time_tracked: task.last_time_tracked,
      project: task.project_id ? {
        id: task.project_id,
        name: task.project_name,
        description: task.project_description
      } : null,
      assignee: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assignee_username,
        email: task.assignee_email
      } : null
    };

    res.json({ 
      success: true, 
      data: formattedTask 
    });
  } catch (error) {
    console.error('Error in getTask:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch task',
      error: error.message 
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow changing the creator
    delete updates.created_by;
    
    const affectedRows = await Task.update(id, updates);
    
    if (!affectedRows) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found or no changes made' 
      });
    }
    
    const updatedTask = await Task.findById(id);
    res.json({ 
      success: true, 
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update task',
      error: error.message 
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const affectedRows = await Task.delete(req.params.id);
    if (!affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In taskController.js
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.findByUserId(req.user.id, req.user.role);
    
    // Format the response to include project, assignee, and time tracking data
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      progress: task.Progress || 0,
      total_time: task.total_time || 0,
      last_time_tracked: task.last_time_tracked,
      project: task.project_id ? {
        id: task.project_id,
        name: task.project_name,
        description: task.project_description
      } : null,
      assignee: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assignee_username,
        email: task.assignee_email
      } : null
    }));
    
    res.json({ 
      success: true, 
      data: formattedTasks 
    });
  } catch (error) {
    console.error('Error in getMyTasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your tasks',
      error: error.message 
    });
  }
};

// For admin to get all tasks
exports.getAllTasks = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Admin access required' 
      });
    }
    
    const tasks = await Task.findAll();
    
    // Format the response to include project, assignee, and time tracking data
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      progress: task.Progress || 0,
      total_time: task.total_time || 0,
      last_time_tracked: task.last_time_tracked,
      project: task.project_id ? {
        id: task.project_id,
        name: task.project_name,
        description: task.project_description
      } : null,
      assignee: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assignee_username,
        email: task.assignee_email
      } : null
    }));
    
    res.json({ 
      success: true, 
      data: formattedTasks 
    });
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch all tasks',
      error: error.message 
    });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (task.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const affectedRows = await Task.update(req.params.id, { status });
    if (!affectedRows) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is assigned to this task or is admin
    if (task.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to comment on this task' });
    }

    const commentData = {
      task_id: req.params.id,
      user_id: req.user.id,
      comment,
      created_at: new Date()
    };

    const commentId = await Task.addComment(commentData);
    res.status(201).json({ 
      id: commentId,
      ...commentData,
      user: {
        id: req.user.id,
        username: req.user.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    await pool.query(
      'UPDATE tasks SET status = ? WHERE id = ? AND assignee_id = ?',
      [status, id, req.user.id]
    );

    res.json({ message: 'Task status updated' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Error updating task status' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    const { id: taskId } = req.params;

    await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, req.user.id, comment]
    );

    res.status(201).json({ message: 'Comment added' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
};

exports.getTaskCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let query = `
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE 1=1
    `;
    
    const params = [];
    
    if (!isAdmin) {
      // For non-admin users, only count their assigned tasks
      query += ` AND (assigned_to = ? OR created_by = ?)`;
      params.push(userId, userId);
    }
    // For admin, no additional conditions - they see all tasks
    
    const [counts] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        pending: counts[0]?.pending || 0,
        in_progress: counts[0]?.in_progress || 0,
        completed: counts[0]?.completed || 0
      }
    });
  } catch (error) {
    console.error('Error getting task counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task counts',
      error: error.message
    });
  }
};