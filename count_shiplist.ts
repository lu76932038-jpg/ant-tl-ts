
import pool from './server/src/config/database';

async function main() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as total FROM shiplist') as any[];
        console.log(`Shiplist Total Count: ${rows[0].total}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}
main();
