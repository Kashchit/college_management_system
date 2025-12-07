require('dotenv').config();
const { pool } = require('../config/db');

async function clearDatabase() {
    try {
        console.log('🧹 Starting database cleanup...');

        // Disable foreign key checks temporarily (if needed, but TRUNCATE CASCADE handles it)
        // In PostgreSQL, TRUNCATE with CASCADE is sufficient.

        console.log('Clearing all tables...');

        // List of tables to clear
        // Order matters if not using CASCADE, but CASCADE makes it easier.
        // We want to keep the admin user if possible, but the request said "remove all fake teacher and student".
        // Usually, we might want to keep the structure but remove data.

        await pool.query(`
            TRUNCATE TABLE 
                submissions, 
                assignments, 
                attendance, 
                subject_enrollments, 
                subjects, 
                notifications,
                otp_store,
                users
            CASCADE;
        `);

        console.log('✅ All tables cleared successfully.');

        // Optional: Re-seed an admin if needed, but the user just said "clear the db".
        // I will just clear it for now. If they need an admin, they can run createAdmin.js

    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await pool.end();
    }
}

clearDatabase();
