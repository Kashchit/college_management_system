const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, name, studentId, role = 'STUDENT' }) {
    const hashed = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password, name, student_id, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, student_id, role, created_at
    `;
    const result = await pool.query(query, [email.toLowerCase().trim(), hashed, name.trim(), studentId || null, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    const result = await pool.query(query, [email.trim()]);
    return result.rows[0] || null;
  }

  static async comparePassword(plain, hash) {
    return await bcrypt.compare(plain, hash);
  }
}

module.exports = User;
