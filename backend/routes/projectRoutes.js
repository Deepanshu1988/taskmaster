const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Public routes (no admin check needed)
router.get('/', projectController.getProjects);

// Protected routes (require admin)
router.post('/', isAdmin, projectController.createProject);
router.put('/:id', isAdmin, projectController.updateProject);
router.delete('/:id', isAdmin, projectController.deleteProject);

module.exports = router;
