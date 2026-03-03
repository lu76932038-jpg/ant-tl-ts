import pool from './src/config/database';
import { RowDataPacket } from 'mysql2';

async function check() {
    try {
        const [customerlist] = await pool.query<RowDataPacket[]>('SHOW CREATE TABLE customerlist');
        const [creditRisk] = await pool.query<RowDataPacket[]>('SHOW CREATE TABLE customer_credit_risk');
        console.log("=== CUSTOMERLIST ===");
        console.log(customerlist[0]['Create Table']);
        console.log("\n=== CUSTOMER_CREDIT_RISK ===");
        console.log(creditRisk[0]['Create Table']);

        // Let's also test the query itself
        console.log("\n=== TESTING QUERY ===");
        const sql = `
            SELECT c.customer_code, c.customer_name
            FROM customerlist c
            LEFT JOIN customer_credit_risk r ON c.customer_code = r.customer_code
            WHERE r.customer_code IS NULL
            LIMIT 5
        `;
        const [rows] = await pool.query<RowDataPacket[]>(sql);
        console.log("Query success. Rows:", rows.length);
        console.log(rows);

    } catch (error) {
        console.error("Query failed with error:", error);
    } finally {
        process.exit(0);
    }
}

check();
