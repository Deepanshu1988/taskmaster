const db = require('../config/db');

class Project {
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY name');
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    return rows[0];
  }

  static async create({ name, description, status = 'active', start_date, end_date }) {
    const [result] = await db.query(
      'INSERT INTO projects (name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [name, description, status, start_date, end_date]
    );
    return { id: result.insertId, name, description, status, start_date, end_date };
  }

  static async update(id, { name, description, status, start_date, end_date }) {
    await db.query(
      'UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE id = ?',
      [name, description, status, start_date, end_date, id]
    );
    return { id, name, description, status, start_date, end_date };
  }

  static async delete(id) {
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Project;
