const db = require('../config/db');

class Department {
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM departments ORDER BY name');
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
    return rows[0];
  }

  static async create({ name, description }) {
    const [result] = await db.query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description]
    );
    return { id: result.insertId, name, description };
  }

  static async update(id, { name, description }) {
    await db.query(
      'UPDATE departments SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, id]
    );
    return { id, name, description };
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM departments WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Department;