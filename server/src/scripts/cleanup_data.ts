import pool from '../config/database';

async function cleanupData() {
    try {
        console.log('--- Starting Database Cleanup (TRIM SKU/Status) ---');

        // 1. TRIM StockList SKU
        const [res1]: any = await pool.execute('UPDATE StockList SET sku = TRIM(sku), status = TRIM(status), name = TRIM(name)');
        console.log(`1. Cleaned StockList: ${res1.affectedRows} rows updated.`);

        // 2. TRIM UserFavoriteStock SKU
        const [res2]: any = await pool.execute('UPDATE UserFavoriteStock SET sku = TRIM(sku)');
        console.log(`2. Cleaned UserFavoriteStock: ${res2.affectedRows} rows updated.`);

        console.log('--- Cleanup Completed ---');
        process.exit(0);
    } catch (e) {
        console.error('Cleanup failed:', e);
        process.exit(1);
    }
}
cleanupData();
