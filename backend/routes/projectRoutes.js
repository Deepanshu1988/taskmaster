const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const logger = require('../utils/logger');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all projects
router.get('/get/projects', async (req, res) => {
  const start = Date.now();
  try {
    await projectController.getProjects(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Create new project (Admin only)
router.post('/post/projects', isAdmin, async (req, res) => {
  const start = Date.now();
  try {
    await projectController.createProject(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Update project (Admin only)
router.put('/put/projects/:id', isAdmin, async (req, res) => {
  const start = Date.now();
  try {
    await projectController.updateProject(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Delete project (Admin only)
router.delete('/delete/projects/:id', isAdmin, async (req, res) => {
  const start = Date.now();
  try {
    await projectController.deleteProject(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

module.exports = router;
