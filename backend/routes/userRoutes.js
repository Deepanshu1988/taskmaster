const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const pool = require('../config/db');

router.use(authenticate);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
//router.put('/:id', userController.editUser);
router.put('/:id/preferences', userController.updateUserPreferences);

router.delete('/:id', userController.deleteUser);
router.post('/', userController.createUser);  // createUser
//router.post('/login', userController.loginUser);  // loginUser

router.get('/test-db', async (req, res) => {
    try {
      const [result] = await pool.query('SELECT 1 as test');
      res.json({ success: true, result });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  });

module.exports = router;