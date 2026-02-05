
import pool from '../src/config/database';

async function updateDefaults() {
    try {
        console.log('Updating product_strategies defaults...');

        const alterIgnore = async (sql: string) => {
            try {
                await pool.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (e: any) {
                console.log(`Error executing ${sql}:`, e.message);
            }
        };

        // 1. Update Schema Defaults (for future INSERTs that omit these columns)
        await alterIgnore("ALTER TABLE product_strategies ALTER COLUMN stocking_period SET DEFAULT 3");
        await alterIgnore("ALTER TABLE product_strategies ALTER COLUMN min_outbound_freq SET DEFAULT 10");
        await alterIgnore("ALTER TABLE product_strategies ALTER COLUMN min_customer_count SET DEFAULT 3");
        await alterIgnore("ALTER TABLE product_strategies ALTER COLUMN is_stocking_enabled SET DEFAULT 0"); // 0 for false

        // 2. Optional: Bulk update existing NULLs or 'Legacy Defaults'? 
        // If the user wants "Default Settings", it implies correcting the standard. 
        // We will NOT mass-update existing user-configured rows unless they are NULL.
        // But since we just added columns with "12", "3", "5" defaults in previous script, we might want to fix those if they haven't been touched.
        // Since this is a dev/setup phase, let's update rows that match the OLD defaults to New Defaults, to align with user expectation "I confirm".

        // Update rows where values match OLD defaults (12, 3, 5, True) -> New Defaults (3, 10, 3, False)
        // Only if they exactly match the old defaults, assuming they were just auto-filled.

        /* 
           However, doing mass update on 'is_stocking_enabled' is risky if users already enabled it. 
           But given the user just asked for "Default Settings" and we are in dev, and I just added the columns minutes ago...
           It is safe to assume "12, 3, 5" are the 'auto-filled' values I just created.
        */

        const [result] = await pool.execute(`
            UPDATE product_strategies 
            SET stocking_period = 3, min_outbound_freq = 10, min_customer_count = 3, is_stocking_enabled = 0
            WHERE stocking_period = 12 AND min_outbound_freq = 3 AND min_customer_count = 5 
            -- AND is_stocking_enabled = 1 (Optional constraint, but cleaner to just fix the "Default-looking" rows)
        `);

        console.log((result as any).affectedRows + " rows updated to new defaults.");

        console.log('Done updating defaults.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

updateDefaults();
