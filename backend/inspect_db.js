const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function inspect() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected.');

        const res = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
      ORDER BY 
        table_name, column_name;
    `);

        console.log('Schema Information:');
        let currentTable = '';
        res.rows.forEach(row => {
            if (row.table_name !== currentTable) {
                console.log(`\nTable: ${row.table_name}`);
                currentTable = row.table_name;
            }
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspect();
