const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Public routes (temporarily removing auth for testing)
router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;