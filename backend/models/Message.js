const { pool } = require('../config/db');

class Message {
    static async create({ room, author, message, file, time }) {
        // Ensure table exists (basic check, ideally should be in migration)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                message TEXT,
                file JSONB,
                time VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const { rows } = await pool.query(
            'INSERT INTO messages (room, author, message, file, time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [room, author, message, file, time]
        );
        return rows[0];
    }

    static async findByRoom(room) {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                message TEXT,
                file JSONB,
                time VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const { rows } = await pool.query(
            'SELECT * FROM messages WHERE room = $1 ORDER BY created_at ASC',
            [room]
        );
        return rows;
    }
}

module.exports = Message;
