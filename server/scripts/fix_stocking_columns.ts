
import pool from '../src/config/database';

async function fixColumns() {
    try {
        console.log('Fixing product_strategies columns...');

        // 1. Check if old column exists and rename logic (or drop and add)
        // Since we are not sure if 'stocking_strategy_period' (line 114 in original) exists, we try to drop it if we want clean state, or just add new ones.
        // Let's just Add columns safely.

        const alterIgnore = async (sql: string) => {
            try {
                await pool.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (e: any) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    // Column exists
                    console.log(`Column exists, skipping: ${sql}`);
                } else if ((e as any).sqlState === '42S22') {
                    // Unknown column (if dropping)
                } else {
                    console.log(`Error executing ${sql}:`, e.message);
                }
            }
        };

        // Attempt to Drop the 'wrong' column name if it exists (Optional, but good for cleanup)
        // await alterIgnore("ALTER TABLE product_strategies DROP COLUMN stocking_strategy_period");

        // Add correct columns
        await alterIgnore("ALTER TABLE product_strategies ADD COLUMN stocking_period INT DEFAULT 12");
        await alterIgnore("ALTER TABLE product_strategies ADD COLUMN min_outbound_freq INT DEFAULT 3");
        await alterIgnore("ALTER TABLE product_strategies ADD COLUMN min_customer_count INT DEFAULT 5");

        // Ensure is_stocking_enabled exists too
        await alterIgnore("ALTER TABLE product_strategies ADD COLUMN is_stocking_enabled BOOLEAN DEFAULT TRUE");

        console.log('Done fixing columns.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixColumns();
