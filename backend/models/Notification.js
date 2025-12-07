const { pool } = require('../config/db');

class Notification {
    static async create({ userId, message, type = 'info' }) {
        const { rows } = await pool.query(
            'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3) RETURNING *',
            [userId, message, type]
        );
        return rows[0];
    }

    static async listByUser(userId) {
        const { rows } = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
            [userId]
        );
        return rows;
    }

    static async markAsRead(id) {
        await pool.query('UPDATE notifications SET read = true WHERE id = $1', [id]);
    }

    static async markAllAsRead(userId) {
        await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [userId]);
    }
}

module.exports = Notification;
