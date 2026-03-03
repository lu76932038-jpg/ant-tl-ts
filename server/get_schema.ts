import mysql from 'mysql2/promise';

async function check() {
    const pool = mysql.createPool({
        host: '172.16.50.100',
        user: 'root',
        password: 'fdsfds**i876',
        database: 'anti',
        port: 3306
    });

    try {
        const [rows] = await pool.query('SHOW CREATE TABLE customerlist');
        console.log((rows as any[])[0]['Create Table']);
    } catch (error) {
        console.error("Query failed with error:", error);
    } finally {
        process.exit(0);
    }
}
check();
