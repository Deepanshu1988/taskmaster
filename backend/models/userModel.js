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
}
};

module.exports = User;