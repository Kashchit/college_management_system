const { pool } = require('../config/db');

class Submission {
    static async create({ assignmentId, studentId, content }) {
        const { rows } = await pool.query(
            `INSERT INTO submissions (assignment_id, student_id, content) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (assignment_id, student_id) 
       DO UPDATE SET content = $3, submitted_at = CURRENT_TIMESTAMP 
       RETURNING *`,
            [assignmentId, studentId, content]
        );
        return rows[0];
    }

    static async listByAssignment(assignmentId) {
        const { rows } = await pool.query(
            `SELECT s.*, u.name as student_name, u.email as student_email 
       FROM submissions s 
       JOIN users u ON s.student_id = u.id 
       WHERE s.assignment_id = $1`,
            [assignmentId]
        );
        return rows;
    }

    static async grade(id, { grade, feedback }) {
        const { rows } = await pool.query(
            'UPDATE submissions SET grade = $1, feedback = $2 WHERE id = $3 RETURNING *',
            [grade, feedback, id]
        );
        return rows[0];
    }

    static async findByStudentAndAssignment(studentId, assignmentId) {
        const { rows } = await pool.query(
            'SELECT * FROM submissions WHERE student_id = $1 AND assignment_id = $2',
            [studentId, assignmentId]
        );
        return rows[0];
    }
}

module.exports = Submission;
