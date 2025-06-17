const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { ensureTaskOwnerOrAdmin } = require('../middlewares/authMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const { getTaskCounts } = require('../controllers/taskController');
// Apply authentication middleware to all routes
router.use(authenticate);

// Create task - only admin can create tasks
router.post('/', isAdmin, taskController.createTask);

// Get tasks - filtered by user role (admin sees all, users see their own)
router.get('/', taskController.getTasks);
// Regular users get their tasks, admin gets all tasks
router.get('/:id', (req, res, next) => {
  if (req.user.role === 'admin') {
    return taskController.getAllTasks(req, res, next);
  } else {
    (req.user.role === 'admin')
    return taskController.getMyTasks(req, res, next);
  }
});
// Get single task - users can only access their own tasks unless admin
// In taskRoutes.js, update the GET / route
router.get('/', async (req, res) => {
    try {
      const { Op } = require('sequelize');
      const { Task, User, Project } = require('../models');
      
      // For admin, get all tasks. For regular users, get only their tasks
      const whereClause = req.user.role === 'admin' 
        ? {} 
        : {
            [Op.or]: [
              { assigned_to: req.user.id },
              { created_by: req.user.id }
            ]
          };
  
      const tasks = await Task.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'username', 'email']
          },
          {
            model: Project,
            attributes: ['id', 'name', 'description']
          }
        ],
        order: [['created_at', 'DESC']]
      });
  
      res.json({ 
        success: true, 
        data: tasks.map(task => ({
          ...task.get({ plain: true }),
          // Add any additional transformations here if needed
        }))
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch tasks',
        error: error.message 
      });
    }
  });

// Update task - only admin can update task details
router.put('/:id', isAdmin, taskController.updateTask);
router.patch('/:id', ensureTaskOwnerOrAdmin, taskController.updateTask);

// Delete task - only admin can delete tasks
router.delete('/:id', isAdmin, taskController.deleteTask);


// Regular user's tasks
router.get('/my-tasks', authenticate, taskController.getMyTasks);
router.get('/counts', authenticate, taskController.getTaskCounts);

router.patch('/:id/status', ensureTaskOwnerOrAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const task = req.task;
      
      task.status = status;
      await task.save();
      
      res.json({ success: true, data: task });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ success: false, message: 'Failed to update task status' });
    }
  });

// Get task comments
//router.get('/:id/comments', taskController.getTaskComments);

// Add comment to task (only for task owner or admin)
router.post('/:id/comments', ensureTaskOwnerOrAdmin, async (req, res) => {
    try {
      const { comment } = req.body;
      const task = req.task;
      
      const newComment = await task.createComment({
        comment,
        user_id: req.user.id
      });
      
      res.json({ success: true, data: newComment });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
  });

module.exports = router;