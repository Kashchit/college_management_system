const { pool } = require('../config/db');

class LeaveRequest {
    static async create({ studentId, subjectId, startDate, endDate, reason }) {
        const result = await pool.query(
            `INSERT INTO leave_requests (student_id, subject_id, start_date, end_date, reason, status)
             VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
            [studentId, subjectId, startDate, endDate, reason]
        );
        return result.rows[0];
    }

    static async findByStudent(studentId) {
        const result = await pool.query(
            `SELECT lr.*, s.name as subject_name, s.code as subject_code
             FROM leave_requests lr
             LEFT JOIN subjects s ON lr.subject_id = s.id
             WHERE lr.student_id = $1
             ORDER BY lr.created_at DESC`,
            [studentId]
        );
        return result.rows;
    }

    static async findPendingByTeacher(teacherId) {
        const result = await pool.query(
            `SELECT lr.*, u.name as student_name, u.email as student_email, s.name as subject_name
             FROM leave_requests lr
             JOIN users u ON lr.student_id = u.id
             JOIN subjects s ON lr.subject_id = s.id
             WHERE lr.status = 'pending'
             ORDER BY lr.created_at DESC`,
            []
        );
        return result.rows;
    }

    static async updateStatus(id, status, reviewedBy) {
        const result = await pool.query(
            `UPDATE leave_requests
             SET status = $1, reviewed_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [status, reviewedBy, id]
        );
        return result.rows[0];
    }
}

module.exports = LeaveRequest;
