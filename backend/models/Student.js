const { pool } = require('../config/db');

class Student {
  static async create(studentId, name, embedding) {
    const query = `
      INSERT INTO students (student_id, name, embedding)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [studentId.trim(), name.trim(), embedding]);
    return result.rows[0];
  }

  static async findByStudentId(studentId) {
    const query = 'SELECT * FROM students WHERE student_id = $1';
    const result = await pool.query(query, [studentId]);
    return result.rows[0] || null;
  }

  static async findAll() {
    const query = 'SELECT id, student_id, name, enrolled_at FROM students ORDER BY enrolled_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findAllWithEmbeddings() {
    const query = 'SELECT student_id, name, embedding FROM students';
    const result = await pool.query(query);
    return result.rows.map(row => ({
      studentId: row.student_id,
      name: row.name,
      embedding: row.embedding
    }));
  }
}

module.exports = Student;
