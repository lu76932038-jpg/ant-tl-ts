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
        const sql = `
            SELECT 
                r.*,
                c.customer_name
            FROM customer_credit_risk r
            JOIN customerlist c ON r.customer_code = c.customer_code
            ORDER BY r.updated_at DESC
            LIMIT 5
        `;
        const [rows] = await pool.query(sql);
        console.log("Success! Rows:");
        console.log(rows);
    } catch (error) {
        console.error("Query failed with error:");
        console.error(error);
    } finally {
        process.exit(0);
    }
}
check();
