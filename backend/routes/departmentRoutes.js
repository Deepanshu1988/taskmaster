const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const logger = require('../utils/logger');

// Get all departments
router.get('/get/departments', async (req, res) => {
  const start = Date.now();
  try {
    await departmentController.getDepartments(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Create a new department
router.post('/post/departments', async (req, res) => {
  const start = Date.now();
  try {
    await departmentController.createDepartment(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Update a department
router.put('/put/departments/:id', async (req, res) => {
  const start = Date.now();
  try {
    await departmentController.updateDepartment(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

// Delete a department
router.delete('/delete/departments/:id', async (req, res) => {
  const start = Date.now();
  try {
    await departmentController.deleteDepartment(req, res);
    logger.logRequest(req, res, Date.now() - start);
  } catch (error) {
    logger.logRequest(req, res, Date.now() - start);
    throw error;
  }
});

module.exports = router;