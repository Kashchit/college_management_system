const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

class Admin {
  static async create(email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO admins (email, password)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `;
    const result = await pool.query(query, [email.toLowerCase().trim(), hashedPassword]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM admins WHERE LOWER(email) = LOWER($1)';
    const result = await pool.query(query, [email.trim()]);
    return result.rows[0] || null;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = Admin;
