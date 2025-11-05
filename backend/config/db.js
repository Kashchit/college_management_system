const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Ensure proper SSL mode for Neon
if (connectionString.includes('neon.tech') && !connectionString.includes('sslmode')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString?.includes('neon.tech') ? { 
    rejectUnauthorized: false,
    require: true 
  } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10, // Maximum pool size
  allowExitOnIdle: true,
  // Retry configuration
  keepAlive: true,
  keepAliveInitialDelayMillis: 0
});

// Initialize database tables
const initDB = async () => {
  try {
    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        embedding REAL[] NOT NULL,
        enrolled_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create admins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) DEFAULT 'General',
        timestamp TIMESTAMP DEFAULT NOW(),
        confidence REAL NOT NULL
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_id ON students(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
      CREATE INDEX IF NOT EXISTS idx_admin_email ON admins(email);
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { pool, initDB };

