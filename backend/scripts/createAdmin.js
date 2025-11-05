require('dotenv').config();
const { pool } = require('../config/db');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL');

    const email = process.argv[2] || 'admin@college.edu';
    const password = process.argv[3] || 'admin123';

    // Check if admin already exists
    const existing = await Admin.findByEmail(email);
    
    if (existing) {
      // Update password
      const hashedPassword = await require('bcryptjs').hash(password, 10);
      await pool.query('UPDATE admins SET password = $1 WHERE email = $2', [hashedPassword, email]);
      console.log('Admin password reset successfully!');
    } else {
      // Create new admin
      await Admin.create(email, password);
      console.log('Admin created successfully!');
    }

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\n✅ You can now login with these credentials');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin();
