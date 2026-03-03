import pool from './src/config/database';
import { RowDataPacket } from 'mysql2';

async function check() {
    try {
        const sql = `
            SELECT c.customer_code, c.customer_name
            FROM customerlist c
            LEFT JOIN customer_credit_risk r ON c.customer_code = r.customer_code
            WHERE r.customer_code IS NULL
            AND (c.customer_name IS NULL OR c.customer_code IS NULL)
            LIMIT 5
        `;
        const [rows] = await pool.query<RowDataPacket[]>(sql);
        console.log("Rows with NULL names:", rows.length);
        console.log(rows);

    } catch (error) {
        console.error("Query failed with error:", error);
    } finally {
        process.exit(0);
    }
}

check();
