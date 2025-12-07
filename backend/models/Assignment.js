const { pool } = require('../config/db');

class Assignment {
    static async create({ subjectId, title, description, dueDate, createdBy }) {
        const { rows } = await pool.query(
            'INSERT INTO assignments (subject_id, title, description, due_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [subjectId, title, description, dueDate, createdBy]
        );
        return rows[0];
    }

    static async listBySubject(subjectId) {
        const { rows } = await pool.query(
            'SELECT * FROM assignments WHERE subject_id = $1 ORDER BY created_at DESC',
            [subjectId]
        );
        return rows;
    }

    static async findById(id) {
        const { rows } = await pool.query('SELECT * FROM assignments WHERE id = $1', [id]);
        return rows[0];
    }
}

module.exports = Assignment;
