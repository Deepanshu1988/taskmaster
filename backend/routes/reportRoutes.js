const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/reports/time-report
router.get('/time-report', reportController.getTimeReport);

module.exports = router;