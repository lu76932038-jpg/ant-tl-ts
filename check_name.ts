
import pool from './server/src/config/database';

async function check() {
    try {
        const [rows]: any = await pool.query('SELECT customer_name FROM customerlist WHERE customer_code = "CUST050612"');
        console.log('DB Name Result:', JSON.stringify(rows));
    } catch (err: any) {
        console.error('Query Error:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

check();
