import pool from '../src/config/database';
import { RowDataPacket } from 'mysql2';

const run = async () => {
    try {
        console.log('Checking for Invalid Dates...');
        // Check for 0 day or 0 month
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, product_model, outbound_date, quantity 
             FROM shiplist 
             WHERE DAY(outbound_date) = 0 OR MONTH(outbound_date) = 0`
        );

        if (rows.length > 0) {
            console.log(`Found ${rows.length} rows with invalid dates!`);
            console.table(rows);
        } else {
            console.log('No invalid dates found.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();
