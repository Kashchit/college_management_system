const { pool } = require('../config/db');

class Attendance {
  static async create(studentId, name, subject, confidence) {
    const query = `
      INSERT INTO attendance (student_id, name, subject, confidence)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [studentId, name, subject || 'General', confidence]);
    return result.rows[0];
  }

  static async findRecent(studentId, minutes = 5) {
    const query = `
      SELECT * FROM attendance
      WHERE student_id = $1
      AND timestamp > NOW() - INTERVAL '${minutes} minutes'
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [studentId]);
    return result.rows[0] || null;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.date) {
      query += ` AND DATE(timestamp) = $${paramCount}`;
      params.push(filters.date);
      paramCount++;
    }

    if (filters.subject) {
      query += ` AND subject = $${paramCount}`;
      params.push(filters.subject);
      paramCount++;
    }

    if (filters.studentId) {
      query += ` AND student_id = $${paramCount}`;
      params.push(filters.studentId);
      paramCount++;
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000';

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      name: row.name,
      subject: row.subject,
      timestamp: row.timestamp,
      confidence: row.confidence
    }));
  }
}

module.exports = Attendance;
