require('dotenv').config();
const { pool } = require('../config/db');

async function alterTable() {
    try {
        console.log('🔄 Altering otp_store table...');
        await pool.query('ALTER TABLE otp_store ALTER COLUMN otp TYPE VARCHAR(255)');
        console.log('✅ Table altered successfully.');
    } catch (error) {
        console.error('❌ Error altering table:', error);
    } finally {
        await pool.end();
    }
}

alterTable();
