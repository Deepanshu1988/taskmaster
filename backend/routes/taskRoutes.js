const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const taskController = require('../controllers/taskController');
const { authenticate, ensureTaskOwnerOrAdmin, protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const Project = require('../models/projectModel');
const pool = require('../config/db');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'task-attachments');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'task-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per task
    }
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Create task - only admin can create tasks
router.post('/create/task', 
    isAdmin, 
    upload.array('attachments', 5),
    async (req, res) => {
      const start = Date.now();
      try {
        const result = await taskController.createTask(req, res);
        logger.logRequest(req, res, Date.now() - start);
        return result;
      } catch (error) {
        logger.logRequest(req, res, Date.now() - start);
        throw error;
      }
    }
);

// Get tasks - filtered by user role (admin sees all, users see their own)
router.get('/get/tasks', async (req, res) => {
  const start = Date.now();
  try {
    const tasks = await taskController.getTasks(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return tasks;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Get single task - users can only access their own tasks unless admin
router.get('/get/task/:id', async (req, res) => {
  const start = Date.now();
  try {
    if (req.user.role === 'admin') {
      const task = await taskController.getAllTasks(req, res);
      logger.logRequest(req, res, Date.now() - start);
      return task;
    } else {
      const task = await taskController.getMyTasks(req, res);
      logger.logRequest(req, res, Date.now() - start);
      return task;
    }
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Update task - only admin can update task details
router.put('/update/task/:id', async (req, res) => {
  const start = Date.now();
  try {
    const result = await taskController.updateTask(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return result;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});
router.patch('/update/task/:id', ensureTaskOwnerOrAdmin, async (req, res) => {
  const start = Date.now();
  try {
    const result = await taskController.updateTask(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return result;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Delete task - only admin can delete tasks
router.delete('/delete/task/:id', isAdmin, async (req, res) => {
  const start = Date.now();
  try {
    const result = await taskController.deleteTask(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return result;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Regular user's tasks
router.get('/get/my-tasks', async (req, res) => {
  const start = Date.now();
  try {
    const tasks = await taskController.getMyTasks(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return tasks;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});
router.get('/get/counts', async (req, res) => {
  const start = Date.now();
  try {
    const counts = await taskController.getTaskCounts(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return counts;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Task status update
router.patch('/update/task/:id/status', ensureTaskOwnerOrAdmin, async (req, res) => {
  const start = Date.now();
  try {
    const result = await taskController.updateTaskStatus(req, res);
    logger.logRequest(req, res, Date.now() - start);
    return result;
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Task Comments
// Update the GET endpoint to match the POST endpoint's path pattern
router.get('/get/task/:id/comments', async (req, res) => {
  const start = Date.now();
  try {
    const taskId = req.params.id;
    console.log('Fetching comments for task ID:', taskId);
    
    const [rows] = await pool.query(
      `SELECT comments FROM tasks WHERE id = ?`,
      [taskId]
    );
    
    if (rows.length === 0) {
      logger.logRequest(req, res, Date.now() - start);
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }
    
    let comments = [];
    const commentsData = rows[0].comments;
    
    if (commentsData) {
      try {
        // Try to parse as JSON first
        comments = JSON.parse(commentsData);
      } catch (e) {
        // If not valid JSON, treat as plain text
        if (typeof commentsData === 'string') {
          comments = [{ 
            id: 1, 
            comment: commentsData, 
            created_at: new Date().toISOString() 
          }];
        }
      }
    }
    
    console.log('Found comments:', comments);
    logger.logRequest(req, res, Date.now() - start);
    res.json({ 
      success: true, 
      data: Array.isArray(comments) ? comments : [comments] 
    });
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch comments',
      error: error.message 
    });
  }
});

router.post('/create/task/:id/comments', async (req, res) => {
  const start = Date.now();
  try {
    const { comment } = req.body;
    const taskId = req.params.id;
    const userId = req.user.id;
    
    if (!comment) {
      logger.logRequest(req, res, Date.now() - start);
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }
    
    const commentId = await Task.addComment({
      task_id: taskId,
      user_id: userId,
      comment: comment
    });
    
    // Get the comment with user details
    const commentWithUser = await Task.getCommentWithUser(commentId);
    
    if (!commentWithUser) {
      throw new Error('Failed to retrieve the created comment');
    }
    
    logger.logRequest(req, res, Date.now() - start);
    res.status(201).json({ 
      success: true, 
      data: commentWithUser,
      message: 'Comment added successfully' 
    });
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

module.exports = router;