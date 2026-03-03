import mysql from 'mysql2/promise';

async function check() {
    const pool = mysql.createPool({
        host: '172.16.30.42',
        user: 'ant_tool_user',
        password: '001003009',
        database: 'ant_tool_prod',
        port: 3306
    });

    try {
        const sql = `SELECT * FROM customerlist ORDER BY created_at DESC LIMIT 5`;
        const [rows] = await pool.query(sql);
        console.log("Success! Active records in 'customerlist':", (rows as any[]).length);
        console.log(rows);
    } catch (error) {
        console.error("Query failed with error:");
        console.error(error);
    } finally {
        process.exit(0);
    }
}
check();
