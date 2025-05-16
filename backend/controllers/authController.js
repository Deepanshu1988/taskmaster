const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const db = require('../config/db');

// Fallback JWT secret if not set in env
const DEFAULT_JWT_SECRET = 'taskmaster_default_secret_2025';

exports.signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.create({ username, email, password: hashedPassword, role });
    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET || DEFAULT_JWT_SECRET, { 
      expiresIn: '1h',
      algorithm: 'HS256'
    });
    res.status(201).json({ 
      token, 
      user: { 
        id: userId, 
        username, 
        email, 
        role 
      } 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    // Log the raw request body
    console.log('Raw request body:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Query to find user by email
    const query = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [results] = await db.query(query, [email]);
      console.log('Database query results:', results);
      
      if (results.length === 0) {
        console.log('No user found for email:', email);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = results[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });
      
      if (!user.password) {
        console.log('User has no password stored');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isPasswordMatch);

      if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign({ 
        id: user.id, 
        role: user.role 
      }, process.env.JWT_SECRET || DEFAULT_JWT_SECRET, {
        expiresIn: '1h',
        algorithm: 'HS256'
      });

      console.log('Successfully generated token');
      
      res.json({ 
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    const updateQuery = 'UPDATE users SET password = ? WHERE email = ?';
    const [result] = await db.query(updateQuery, [hashedPassword, email]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.createTestUser = async (req, res) => {
  try {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
    const values = ['test@example.com', hashedPassword, 'user'];
    
    const [result] = await db.query(query, values);
    
    res.json({
      message: 'Test user created successfully',
      userId: result.insertId,
      email: 'test@example.com',
      password: password // This is the plain text password you can use to login
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
};