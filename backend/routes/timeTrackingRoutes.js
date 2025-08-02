const express = require('express');
const router = express.Router();
const timeTrackingController = require('../controllers/timeTrackingController');
const { authenticate } = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const logger = require('../utils/logger');

// Apply authentication middleware to all routes
router.use(authenticate);

// Start tracking time for a task
router.post(
  '/start',
  [
    body('task_id').isInt().withMessage('Task ID must be an integer'),
    body('notes').optional().isString().trim()
  ],
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.startTracking(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Stop tracking time for a task
router.post(
  '/stop',
  [
    body('timeEntryId').isInt().withMessage('Time entry ID must be an integer'),
    body('notes').optional().isString().trim()
  ],
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.stopTracking(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Get time entries for a specific task
router.get(
  '/task/:taskId',
  [
    param('taskId').isInt().withMessage('Task ID must be an integer')
  ],
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.getTaskTimeEntries(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Get current user's time entries (optionally filtered by date range)
router.get(
  '/user/entries',
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.getUserTimeEntries(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Get active time entry for current user
router.get(
  '/active',
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.getActiveTimeEntry(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Get time summary for a task
router.get(
  '/task/:taskId/summary',
  [
    param('taskId').isInt().withMessage('Task ID must be an integer')
  ],
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.getTaskTimeSummary(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

// Delete a time entry
router.delete(
  '/:timeEntryId',
  [
    param('timeEntryId').isInt().withMessage('Time entry ID must be an integer')
  ],
  async (req, res, next) => {
    const start = Date.now();
    try {
      await timeTrackingController.deleteTimeEntry(req, res, next);
      logger.logRequest(req, res, Date.now() - start);
    } catch (error) {
      logger.logRequest(req, res, Date.now() - start);
      next(error);
    }
  }
);

module.exports = router;
