const { pool } = require('../config/db');

class Subject {
  static async create({ name, code, createdBy }) {
    const result = await pool.query(
      `INSERT INTO subjects(name, code, created_by) VALUES($1,$2,$3) RETURNING *`,
      [name.trim(), code.trim(), createdBy || null]
    );
    return result.rows[0];
  }

  static async list() {
    const { rows } = await pool.query(`SELECT * FROM subjects ORDER BY created_at DESC`);
    return rows;
  }

  static async getById(id) {
    const { rows } = await pool.query(`SELECT * FROM subjects WHERE id = $1`, [id]);
    return rows[0] || null;
  }
}

module.exports = Subject;
