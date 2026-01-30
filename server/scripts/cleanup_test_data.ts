import '../src/config/env';
import pool from '../src/config/database';

const run = async () => {
    try {
        console.log('Cleaning up test data...');

        // 1. Delete Test Ships from ShipList
        // Patterns used in scripts: MOCK-%, STRESS-%, FAIL-%, VERIFY-%
        const shipPatterns = ['MOCK-%', 'STRESS-%', 'FAIL-%', 'VERIFY-%'];
        for (const pat of shipPatterns) {
            const [res]: any = await pool.execute('DELETE FROM shiplist WHERE outbound_id LIKE ?', [pat]);
            if (res.affectedRows > 0) {
                console.log(`Deleted ${res.affectedRows} rows from shiplist matching ${pat}`);
            }
        }

        // 2. Delete Test Stocks from StockList
        // Patterns used in scripts: SKU-STRESS-%, SKU-FAIL-%, SKU-VERIFY%, SKU-CASE-TEST-%, TEST-SINGLE-%
        const stockPatterns = ['SKU-STRESS-%', 'SKU-FAIL-%', 'SKU-VERIFY%', 'SKU-CASE-TEST-%', 'TEST-SINGLE-%'];

        for (const pat of stockPatterns) {
            const [res]: any = await pool.execute('DELETE FROM StockList WHERE sku LIKE ?', [pat]);
            if (res.affectedRows > 0) {
                console.log(`Deleted ${res.affectedRows} rows from StockList matching ${pat}`);
            }
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (e) {
        console.error('Cleanup failed', e);
        process.exit(1);
    }
};

run();
