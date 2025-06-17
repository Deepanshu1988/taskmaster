const User = require('../models/userModel');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  try {
    console.log('Received user data:', req.body);
    
    const { username, email, password, role = 'user', department = '' ,status} = req.body;
    // If department is an object, extract just the ID
    const departmentId = department && department.id ? department.id : department;
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user using the User model
    const userId = await User.create({
      username,
      email,
      password,
      role,
      department:departmentId,
      status:status
    });

    // Get the newly created user (without password)
    const newUser = await User.findById(userId);
    delete newUser.password; // Remove password from response

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    console.log('getUsers called');
    
    // Remove the admin check to allow all authenticated users
    // The authenticate middleware will still ensure the user is logged in
    
    console.log('Executing SQL query...');
    
    // First, check if the database connection is working
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('Database connection test:', rows);
    
    // Get users with basic information only (no sensitive data)
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.department,
        COALESCE(u.status, 'active') as status,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);

    console.log('Users fetched successfully, count:', users.length);
    res.json(users);
    
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// In userController.js - Update getUser method
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Don't return the password
    const { password, ...userData } = user[0];
    
    // Ensure notification preferences exist
    userData.notification_preferences = userData.notification_preferences || {
      email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
      in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
      push: { enabled: false, taskReminders: false, mentions: false }
    };
    
    res.json({ 
      success: true, 
      data: userData 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// In userController.js - update the updateUser function
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { 
      username, 
      email, 
      role, 
      department = 'Unassigned', 
      status = 'active'
    } = req.body;
    console.log('Received update request for user ID:', userId);
    console.log('Request body:', req.body);
    

    console.log('Updating user with data:', { userId, username, email, role, department, status });

    // Check if user exists
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only include fields that exist in the database
    const updateFields = [];
    const updateValues = [];
    
    // List of valid database fields
    const validFields = ['username', 'email', 'role', 'department', 'status'];
    
    // Only add fields that are in the request body and in our valid fields list
    validFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = NOW()');
    
    // Add WHERE condition
    updateValues.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    console.log('Executing query:', query);
    console.log('With values:', updateValues);

    await pool.query(query, updateValues);

    // Get updated user data
    const [updatedUser] = await pool.query(
      'SELECT id, username, email, role, department, status, created_at, updated_at FROM users WHERE id = ?', 
      [userId]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Update user error:', {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Failed to update user',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        sql: error.sql,
        sqlMessage: error.sqlMessage
      })
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In userController.js
exports.getAllUsers = async (req, res) => {
  try {
      const users = await User.getAll();
      res.json({
          success: true,
          data: users
      });
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to fetch users',
          error: error.message
      });
  }
};

exports.updateUserPreferences = async (req, res) => {
  try {
    const userId = req.params.id;
    const { notificationPreferences } = req.body;

    // Update user preferences in the database
    await pool.query(
      'UPDATE users SET notification_preferences = ? WHERE id = ?',
      [JSON.stringify(notificationPreferences), userId]
    );

    res.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      notificationPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences' 
    });
  }
};