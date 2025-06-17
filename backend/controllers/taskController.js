const Task = require('../models/taskModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('../utils/emailService');

exports.createTask = async (req, res) => {
  try {
    const taskData = { ...req.body, created_by: req.user.id };
    const taskId = await Task.create(taskData);
    
    // Get the full task with all details
    const task = await Task.findById(taskId);
    
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
    
    res.status(201).json({ id: taskId, ...task });
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
    
    // Check if this is an assignment or reassignment
    let assignedToChanged = false;
    let previousAssignee = null;
    let currentTask = null;
    
    if (updates.assigned_to !== undefined) {  
      currentTask = await Task.findById(id);
      if (currentTask) {
        const newAssignee = updates.assigned_to;
        const currentAssignee = currentTask.assigned_to;
        
        // Check if assignment is actually changing
        assignedToChanged = (newAssignee !== currentAssignee) && 
                          (!newAssignee || !currentAssignee || newAssignee.toString() !== currentAssignee.toString());
        
        previousAssignee = currentAssignee;
        console.log('Assignment change detected:', {
          newAssignee,
          currentAssignee,
          assignedToChanged,
          previousAssignee
        });
      }
    }
    
    const affectedRows = await Task.update(id, updates);
    
    if (!affectedRows) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found or no changes made' 
      });
    }
    
    const updatedTask = await Task.findById(id);
    
    // Send notification if task was assigned or reassigned
    if (assignedToChanged && updatedTask.assigned_to) {
      try {
        console.log('Preparing to send assignment notification for task:', {
          taskId: updatedTask.id,
          newAssignee: updatedTask.assigned_to,
          assigner: req.user.id
        });
        
        const [assignee, assigner] = await Promise.all([
          User.findById(updatedTask.assigned_to),
          User.findById(req.user.id)
        ]);
        
        if (!assignee) {
          console.error('Assignee not found with ID:', updatedTask.assigned_to);
        } else if (!assignee.email) {
          console.error('Assignee has no email address:', assignee.id);
        } else {
          console.log('Creating notification for assignee:', assignee.email);
          
          // Create notification in database
          await Notification.create({
            userId: updatedTask.assigned_to,
            title: 'Task Assigned to You',
            message: `You have been assigned to task: ${updatedTask.title}`,
            type: 'email',
            relatedEntity: 'task',
            relatedEntityId: id,
            status: 'unread'
          });
          
          // Send email notification
          const emailSubject = `Task Assigned: ${updatedTask.title}`;
          const emailText = `Hello ${assignee.username || 'there'},\n\n` +
            `You have been assigned to a task by ${assigner ? assigner.username : 'an administrator'}.\n\n` +
            `Task: ${updatedTask.title}\n` +
            `Description: ${updatedTask.description || 'No description provided'}\n` +
            `Due Date: ${updatedTask.due_date ? new Date(updatedTask.due_date).toLocaleDateString() : 'No due date'}\n` +
            `Status: ${updatedTask.status || 'Not started'}\n\n` +
            `Please log in to view and manage your tasks.\n\n` +
            `Thank you,\nThe TaskMaster Team`;
            
          console.log('Sending assignment email to:', assignee.email);
          await emailService.sendNotificationEmail(
            assignee.email,
            emailSubject,
            emailText
          );
          
          console.log(`✅ Notification sent to ${assignee.email} for task assignment`);
        }
      } catch (error) {
        console.error('❌ Error sending assignment notification:', {
          error: error.message,
          stack: error.stack
        });
        // Don't fail the request if notification fails
      }
    }
    
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

    // Update the task status
    const affectedRows = await Task.update(taskId, { status });
    if (!affectedRows) {
      return res.status(404).json({ 
        success: false,
        message: 'Failed to update task status' 
      });
    }

    // Get the updated task with all details
    const updatedTask = await Task.findById(taskId);
    
    // Send notification to relevant users
    try {
      console.log('\n--- Starting Notification Process ---');
      console.log('Task ID:', task.id);
      console.log('Task Title:', task.title);
      console.log('Assigned To:', task.assigned_to);
      console.log('Created By:', task.created_by);
      console.log('Current User (Updater):', req.user);
      console.log('Old Status:', oldStatus);
      console.log('New Status:', status);

      const updater = await User.findById(req.user.id);
      if (!updater) {
        console.error('Error: Updater user not found');
        throw new Error('Updater user not found');
      }
      console.log('Updater found:', { id: updater.id, email: updater.email, role: updater.role });
      
      const notificationRecipients = [];
      
      // Always notify the assignee if they're not the one making the change
      if (task.assigned_to) {
        const assignee = await User.findById(task.assigned_to);
        if (!assignee) {
          console.error('Error: Assignee not found with ID:', task.assigned_to);
        } else {
          console.log('Task Assignee:', { id: assignee.id, email: assignee.email });
          if (task.assigned_to.toString() !== req.user.id) {
            console.log('Adding assignee to notification recipients:', assignee.email);
            notificationRecipients.push(task.assigned_to);
          } else {
            console.log('Skipping notification - assignee is the one making the change');
          }
        }
      } else {
        console.log('No assignee set for this task');
      }
      
      // If admin is making the change, also notify the task creator if they're different
      if (req.user.role === 'admin' && task.created_by) {
        const creator = await User.findById(task.created_by);
        if (creator) {
          console.log('Task Creator:', { id: creator.id, email: creator.email });
          if (task.created_by.toString() !== req.user.id) {
            console.log('Adding creator to notification recipients:', creator.email);
            notificationRecipients.push(task.created_by);
          } else {
            console.log('Skipping notification - creator is the one making the change');
          }
        } else {
          console.error('Error: Task creator not found with ID:', task.created_by);
        }
      }
      
      console.log('Final notification recipients count:', notificationRecipients.length);
      
      // Process notifications for all recipients
      for (const recipientId of [...new Set(notificationRecipients)]) {
        try {
          console.log('\n--- Processing notification for recipient ID:', recipientId);
          const recipient = await User.findById(recipientId);
          
          if (!recipient) {
            console.error('Error: Recipient not found with ID:', recipientId);
            continue;
          }
          
          console.log('Recipient details:', { 
            id: recipient.id, 
            email: recipient.email,
            username: recipient.username,
            role: recipient.role 
          });
          
          if (!recipient.email) {
            console.error('Error: Recipient has no email address');
            continue;
          }
          
          // Create notification in database
          try {
            const notification = await Notification.create({
              userId: recipient.id,
              title: 'Task Status Updated',
              message: `Status of task "${task.title}" was changed from ${oldStatus} to ${status} by ${updater.username || 'a user'}`,
              type: 'email',
              relatedEntity: 'task',
              relatedEntityId: task.id,
              status: 'unread'
            });
            
            console.log('✅ Notification created in database:', {
              notificationId: notification.id,
              userId: notification.userId,
              message: notification.message
            });
            
            // Send email notification
            const emailSubject = `Task Status Updated: ${task.title}`;
            const emailText = `Hello ${recipient.username || 'there'},\n\n` +
              `The status of a task has been updated by ${updater.username || 'a user'}.\n\n` +
              `Task: ${task.title}\n` +
              `Old Status: ${oldStatus || 'Not specified'}\n` +
              `New Status: ${status || 'Not specified'}\n` +
              `Updated By: ${updater.username || 'System'}\n` +
              `Updated At: ${new Date().toLocaleString()}\n\n` +
              `Please log in to view the updated task details.\n\n` +
              `Thank you,\nThe TaskMaster Team`;
              
            console.log('Sending email to:', recipient.email);
            console.log('Email subject:', emailSubject);
            
            const emailResult = await emailService.sendNotificationEmail(
              recipient.email,
              emailSubject,
              emailText
            );
            
            console.log('✅ Email sent successfully:', {
              messageId: emailResult?.messageId,
              response: emailResult?.response
            });
            
          } catch (error) {
            console.error('❌ Error creating notification or sending email:', {
              error: error.message,
              stack: error.stack
            });
            // Continue with other recipients if one fails
          }
          
        } catch (error) {
          console.error('❌ Error processing recipient:', {
            recipientId,
            error: error.message,
            stack: error.stack
          });
          // Continue with other recipients if one fails
        }
      }
    } catch (error) {
      console.error('❌ Error in notification processing:', {
        error: error.message,
        stack: error.stack
      });
      // Don't fail the request if notification processing fails
    }

    res.json({ 
      success: true, 
      message: 'Task status updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task status:', error);
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