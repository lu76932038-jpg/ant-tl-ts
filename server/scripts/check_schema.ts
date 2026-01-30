import pool from '../src/config/database';
import { RowDataPacket } from 'mysql2';

const run = async () => {
    try {
        console.log('Checking Schema...');
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT COLUMN_NAME, DATA_TYPE 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_NAME = 'shiplist' AND TABLE_SCHEMA = 'ant_tl_ts001'`
        );
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();
