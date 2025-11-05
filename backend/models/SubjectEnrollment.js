const { pool } = require('../config/db');

class SubjectEnrollment {
  static async enroll(subjectId, userId) {
    const { rows } = await pool.query(
      `INSERT INTO subject_enrollments(subject_id, user_id) VALUES($1,$2)
       ON CONFLICT(subject_id, user_id) DO NOTHING
       RETURNING *`,
      [subjectId, userId]
    );
    return rows[0] || null;
  }

  static async listStudents(subjectId) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.student_id
       FROM subject_enrollments se
       JOIN users u ON u.id = se.user_id
       WHERE se.subject_id = $1`,
      [subjectId]
    );
    return rows;
  }
}

module.exports = SubjectEnrollment;
