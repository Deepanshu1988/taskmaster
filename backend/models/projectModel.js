const pool = require('../config/db');

const Project = {
  async create({ name, description, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, created_by]
    );
    return result.insertId;
  },

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM projects');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    return rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    const [result] = await pool.query(`UPDATE projects SET ${fields} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = Project;