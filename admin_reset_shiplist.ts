
import pool from './server/src/config/database';
import { ShipListModel } from './server/src/models/ShipList';

async function main() {
    try {
        console.log('Resetting shiplist table...');

        // Drop table to ensure clean state and schema application
        // We use DROP TABLE IF EXISTS
        await pool.execute('DROP TABLE IF EXISTS shiplist');
        console.log('Dropped shiplist table.');

        // Re-initialize
        await ShipListModel.initializeTable();
        console.log('Re-initialized shiplist table with correct schema.');

        console.log('DONE. Please restart your backend server and run Sync again.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
main();
