const { pool } = require('../config/db');

class Announcement {
    static async create({ title, content, createdBy, targetAudience = 'ALL', subjectId = null }) {
        const result = await pool.query(
            'INSERT INTO announcements (title, content, created_by, target_audience, subject_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, createdBy, targetAudience, subjectId]
        );
        return result.rows[0];
    }

    static async list(userRole, userId) {
        // Teachers see their own announcements
        if (userRole === 'TEACHER') {
            const result = await pool.query(
                'SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.created_by = $1 ORDER BY a.created_at DESC',
                [userId]
            );
            return result.rows;
        }

        // Students see ALL announcements + subject specific ones they are enrolled in
        if (userRole === 'STUDENT') {
            const result = await pool.query(`
        SELECT a.*, u.name as author_name 
        FROM announcements a 
        JOIN users u ON a.created_by = u.id 
        WHERE a.target_audience = 'ALL' 
        OR (a.target_audience = 'SUBJECT' AND a.subject_id IN (
            SELECT subject_id FROM subject_enrollments WHERE user_id = $1
        ))
        ORDER BY a.created_at DESC
      `, [userId]);
            return result.rows;
        }

        return [];
    }
}

module.exports = Announcement;
