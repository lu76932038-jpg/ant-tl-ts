const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        const [rows] = await pool.execute('SELECT supplier_code, name, rating FROM suppliers WHERE status = "ACTIVE" ORDER BY name ASC');
        console.log('DEBUG_SUPPLIERS_RESULT:', JSON.stringify(rows));
    } catch (e) {
        console.error('DEBUG_SUPPLIERS_ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
