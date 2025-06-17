const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const db = require('../config/db');
require('../utils/emailService');
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Email service starting...');
console.log('Using Gmail account:', process.env.GMAIL_EMAIL);

// Create transporter with direct SMTP settings
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
});

// Test the transporter
transporter.verify(function(error, success) {
    if (error) {
        console.error('Error with email configuration:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

exports.sendPasswordResetEmail = async (email, resetToken) => {
    try {
        console.log('Attempting to send email to:', email);
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: `"TaskMaster" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset for your TaskMaster account.</p>
                    <p>Click the button below to reset your password (valid for 1 hour):</p>
                    <div style="margin: 25px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #4CAF50; 
                                  color: white; 
                                  padding: 12px 24px; 
                                  text-decoration: none; 
                                  border-radius: 4px;">
                            Reset Password
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>${resetUrl}</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        console.log('Sending email with options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
            console.error('SMTP Error:', error.response);
        }
        return false;
    }
};
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
      console.log('User found:', { id: user.id, email: user.email, role: user.role, status: user.status });
      
      // Check if user is active
      if (user.status === 'inactive') {
        console.log('Login attempt for inactive user:', email);
        return res.status(403).json({ error: 'Your account is inactive. Please contact the administrator.' });
      }
      
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


const https = require('https');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }

    const user = users[0];
    
    // Create a reset token
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save the reset token to the database
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?', 
      [resetToken, user.id]
    );

    // Send password reset email
    const emailSent = await exports.sendPasswordResetEmail(email, resetToken);
    
    if (!emailSent) {
      console.error('Failed to send password reset email to:', email);
      // Don't tell the user the email failed to send (security best practice)
    }
    
    res.status(200).json({ 
      message: 'If your email is registered, you will receive a password reset link'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
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