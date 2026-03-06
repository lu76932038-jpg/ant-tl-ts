import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

async function getRealSkus() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT sku FROM StockList LIMIT 10');
        console.log('REAL_SKUS:', JSON.stringify(rows.map(r => r.sku)));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
getRealSkus();
