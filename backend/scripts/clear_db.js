require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');

const clearDatabase = async () => {
    try {
        console.log('Starting database cleanup...');

        // Get all table names in the public schema
        const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

        const tables = result.rows.map(row => row.tablename);

        if (tables.length === 0) {
            console.log('No tables found to clear.');
            process.exit(0);
        }

        console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

        // Truncate all tables with CASCADE to handle foreign key constraints
        for (const table of tables) {
            console.log(`Clearing table: ${table}`);
            await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
        }

        console.log('All tables cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearDatabase();
