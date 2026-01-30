import pool from '../src/config/database';
import { RowDataPacket } from 'mysql2';

const run = async () => {
    try {
        console.log('Checking Current DB...');
        const [rows] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() as db');
        console.table(rows);

        // Also describe shiplist without schema filter to be safe (if current DB is correct)
        const [desc] = await pool.execute<RowDataPacket[]>('DESCRIBE shiplist');
        console.table(desc);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();
