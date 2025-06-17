const express = require('express');
const router = express.Router();
const timeTrackingController = require('../controllers/timeTrackingController');
const { authenticate } = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authenticate);

// Start tracking time for a task
router.post(
  '/start',
  [
    body('task_id').isInt().withMessage('Task ID must be an integer'),
    body('notes').optional().isString().trim()
  ],
  timeTrackingController.startTracking
);

// Stop tracking time for a task
router.post(
  '/stop',
  [
    body('timeEntryId').isInt().withMessage('Time entry ID must be an integer'),
    body('notes').optional().isString().trim()
  ],
  timeTrackingController.stopTracking
);

// Get time entries for a specific task
router.get(
  '/task/:taskId',
  [
    param('taskId').isInt().withMessage('Task ID must be an integer')
  ],
  timeTrackingController.getTaskTimeEntries
);

// Get current user's time entries (optionally filtered by date range)
router.get(
  '/user/entries',
  [
    // Optional query params for date filtering
  ],
  timeTrackingController.getUserTimeEntries
);

// Get active time entry for current user
router.get(
  '/active',
  [],
  timeTrackingController.getActiveTimeEntry
);

// Get time summary for a task
router.get(
  '/task/:taskId/summary',
  [
    param('taskId').isInt().withMessage('Task ID must be an integer')
  ],
  timeTrackingController.getTaskTimeSummary
);

// Delete a time entry
router.delete(
  '/:timeEntryId',
  [
    param('timeEntryId').isInt().withMessage('Time entry ID must be an integer')
  ],
  timeTrackingController.deleteTimeEntry
);

module.exports = router;
