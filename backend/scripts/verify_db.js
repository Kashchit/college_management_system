require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');

const verifyDatabase = async () => {
    try {
        console.log('Verifying database is empty...');

        const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

        const tables = result.rows.map(row => row.tablename);
        let notEmptyCount = 0;

        for (const table of tables) {
            const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            const count = parseInt(countResult.rows[0].count, 10);
            if (count > 0) {
                console.error(`Table ${table} is NOT empty. Count: ${count}`);
                notEmptyCount++;
            } else {
                // console.log(`Table ${table} is empty.`);
            }
        }

        if (notEmptyCount === 0) {
            console.log('All tables are empty. Verification successful.');
            process.exit(0);
        } else {
            console.error(`Verification failed. ${notEmptyCount} tables are not empty.`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error verifying database:', error);
        process.exit(1);
    }
};

verifyDatabase();
