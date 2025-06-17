const jwt = require('jsonwebtoken');
const Task = require('../models/taskModel');

// Fallback JWT secret if not set in env
const DEFAULT_JWT_SECRET = 'taskmaster_default_secret_2025';

const authenticate = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add this new middleware for task ownership check
const ensureTaskOwnerOrAdmin = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    if (isAdmin || task.assigned_to === userId || task.created_by === userId) {
      req.task = task;
      next();
    } else {
      res.status(403).json({ success: false, message: 'Forbidden' });
    }
  } catch (error) {
    console.error('Error in ensureTaskOwnerOrAdmin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  authenticate,
  ensureTaskOwnerOrAdmin
};