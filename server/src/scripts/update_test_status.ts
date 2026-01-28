import pool from '../config/database';

async function main() {
    try {
        console.log('Updating SKU-TEST entries to RECEIVED...');

        const [result] = await pool.execute(
            "UPDATE entry_list SET status = 'RECEIVED' WHERE sku = 'SKU-TEST' AND status = 'PENDING'"
        );

        console.log('Update result:', result);
        console.log('Successfully updated entries to RECEIVED.');

    } catch (error) {
        console.error('Error updating entries:', error);
    } finally {
        await pool.end();
    }
}

main();
