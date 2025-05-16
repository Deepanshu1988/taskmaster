const pool = require('../config/db');

const Task = {
  async create({ title, description, status, priority, assigned_to, project_id, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, assigned_to, project_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, status || 'pending', priority || 'medium', assigned_to, project_id, created_by]
    );
    return result.insertId;
  },

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM tasks');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    return rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    const [result] = await pool.query(`UPDATE tasks SET ${fields} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = Task;