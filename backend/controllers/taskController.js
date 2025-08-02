const Task = require('../models/taskModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('../utils/emailService');
const { sendTaskStatusNotification } = require('../utils/notificationHelper');
const pool = require('../config/db');  
const STATUS_TO_PROGRESS = {
  'not_started': 0,
  'in_progress': 33,
  'in_review': 66,
  'completed': 100
};
exports.createTask = async (req, res) => {
  try {
    const taskData = { ...req.body, created_by: req.user.id };
    const taskId = await Task.create(taskData);
    
    // Get the full task with all details including comments
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(500).json({
        success: false,
        message: 'Task was created but could not be retrieved',
      });
    }
    
    // Send notification if task is assigned to someone
    if (taskData.assigned_to) {
      try {
        const assignee = await User.findById(taskData.assigned_to);
        const assigner = await User.findById(req.user.id);
        
        if (assignee && assignee.email) {
          // Create notification in database
          await Notification.create({
            userId: taskData.assigned_to,
            title: 'New Task Assigned',
            message: `You have been assigned to a new task: ${taskData.title}`,
            type: 'email',
            relatedEntity: 'task',
            relatedEntityId: taskId,
            status: 'unread'
          });
          
          // Send email notification
          const emailSubject = `New Task Assigned: ${taskData.title}`;
          const emailText = `Hello ${assignee.username || 'there'},\n\n` +
            `You have been assigned to a new task by ${assigner ? assigner.username : 'an administrator'}.\n\n` +
            `Task: ${taskData.title}\n` +
            `Description: ${taskData.description || 'No description provided'}\n` +
            `Due Date: ${taskData.due_date ? new Date(taskData.due_date).toLocaleDateString() : 'No due date'}\n\n` +
            `Please log in to view and manage your tasks.\n\n` +
            `Thank you,\nThe TaskMaster Team`;
            
          await emailService.sendNotificationEmail(
            assignee.email,
            emailSubject,
            emailText
          );
          
          console.log(`Notification sent to ${assignee.email} for task assignment`);
        }
      } catch (error) {
        console.error('Error sending assignment notification:', error);
        // Don't fail the request if notification fails
      }
    }
    
    // Return the complete task data including comments
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create task',
      error: error.message 
    });
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
      return res.status(404).json({ success: false, message: 'Task not found' });
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

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// In taskController.js - updateTask function
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };
    
    // Don't allow changing the creator
    delete updates.created_by;

    // Get current task state before update
    const currentTask = await Task.findById(id);
    if (!currentTask) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // If user is not admin, filter updates to only allow specific fields
    if (req.user.role !== 'admin') {
      const allowedFields = ['priority', 'status', 'comments', 'progress'];
      updates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});
    }

    // Update the task
    const affectedRows = await Task.update(id, updates);
    
    if (!affectedRows) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found or no changes made' 
      });
    }

    // Get the updated task
    const updatedTask = await Task.findById(id);
    
    // Check if status or progress was updated by a regular user
    if (req.user.role !== 'admin') {
      const statusChanged = updates.status && updates.status !== currentTask.status;
      const progressChanged = updates.progress && updates.progress !== currentTask.progress;
      
      if (statusChanged || progressChanged) {
        try {
          // Send notification in the background
          await sendTaskStatusNotification(
            { ...updatedTask, oldProgress: currentTask.progress },
            currentTask.status,
            req.user,
            '',
            statusChanged,
            progressChanged
          );
          console.log('Notification sent for task update');
        } catch (error) {
          console.error('Error sending notification:', error);
          // Don't fail the request if notification fails
        }
      }
    }
    
    // Send success response with updated task
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error in updateTask:', error);
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
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Save the old status for comparison
    const oldStatus = task.status;
    
    // Check if user is authorized (assigned user or admin)
    const isAssignedUser = task.assigned_to === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isAssignedUser && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this task' 
      });
    }

    // Only proceed if status is actually changing
    if (status === oldStatus) {
      return res.json({ 
        success: true, 
        message: 'Status unchanged',
        data: { taskId: task.id, status: status }
      });
    }
// Calculate new progress based on status
const newProgress = STATUS_TO_PROGRESS[status] !== undefined ? 
STATUS_TO_PROGRESS[status] : 
task.progress;

// Update both status and progress
const updateData = { 
status,
progress: newProgress
};
    // Update the task status
    const affectedRows = await Task.update(taskId, updateData);
    if (!affectedRows) {
      return res.status(404).json({ 
        success: false,
        message: 'Failed to update task status' 
      });
    }

    // Get the updated task with all details
    const updatedTask = await Task.findById(taskId);
    console.log('Sending notification with task:', JSON.stringify(updatedTask, null, 2));
console.log('Updater info:', JSON.stringify(req.user, null, 2));
    // Send notifications in the background (don't wait for it to complete)
    sendTaskStatusNotification(updatedTask, oldStatus, req.user)
      .catch(error => {
        console.error('Background notification error:', error);
        // Continue even if notification fails
      });

    res.json({ 
      success: true, 
      message: 'Task status updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update task status',
      error: error.message 
    });
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