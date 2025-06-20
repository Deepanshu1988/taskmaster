const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ username, email, password, role = 'user', department = '', status }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Get department name if department ID is provided
      let departmentName = department;
      if (department) {
        const [dept] = await pool.query('SELECT name FROM departments WHERE id = ?', [department]);
        if (dept.length > 0) {
          departmentName = dept[0].name;
        }
      }
      
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, role, departmentName, status]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error in User.create:', error);
      throw error;
    }
  },

  async findByEmail(email) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0];
    } catch (error) {
      console.error('Error in User.findByEmail:', error);
      throw error;
    }
  },

  async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error in User.findById:', error);
      throw error;
    }
  },
  async getAll() {
    const [rows] = await pool.query(`
        SELECT 
            u.*, 
            d.name as department_name 
        FROM users u
        LEFT JOIN departments d ON u.department = d.name
        ORDER BY u.created_at DESC
    `);
    return rows;
},
async getAllUsers() {
  const [rows] = await pool.query(`
    SELECT id, username, email, role 
    FROM users
    WHERE role = 'admin'
  `);
  return rows;
},
async updatePreferences(userId, preferences) {
  try {
    const [result] = await pool.query(
      'UPDATE users SET notification_preferences = ? WHERE id = ?',
      [JSON.stringify(preferences), userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
},

// Update the findById method to include notification_preferences
async findById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows[0] && rows[0].notification_preferences) {
      rows[0].notification_preferences = 
        typeof rows[0].notification_preferences === 'string'
          ? JSON.parse(rows[0].notification_preferences)
          : rows[0].notification_preferences;
    }
    return rows[0];
  } catch (error) {
    console.error('Error in User.findById:', error);
    throw error;
  }
},


};

module.exports = User;