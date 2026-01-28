import pool from '../config/database';

async function main() {
    try {
        console.log('Verifying SKU-TEST data...');

        // 1. Get Stock
        const [stock] = await pool.execute<any[]>(
            "SELECT inStock FROM StockList WHERE sku = 'SKU-TEST'"
        );
        const inStock = stock[0]?.inStock || 0;
        console.log(`Current In Stock: ${inStock}`);

        // 2. Get Received Entries
        const [entries] = await pool.execute<any[]>(
            `SELECT arrival_date, quantity, unit_price 
             FROM entry_list 
             WHERE sku = 'SKU-TEST' AND status = 'RECEIVED' 
             ORDER BY arrival_date DESC`
        );
        console.log('Received Entries (FIFO Order):');
        console.table(entries);

        // 3. Simulate Calculation
        let remaining = inStock;
        let totalValue = 0;
        console.log('\n--- FIFO Calculation Simulation ---');

        for (const entry of entries) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, entry.quantity);
            const val = take * Number(entry.unit_price);
            console.log(`Taking ${take} from batch ${entry.arrival_date.toISOString().split('T')[0]} @ ${entry.unit_price} = ${val}`);
            totalValue += val;
            remaining -= take;
        }

        if (remaining > 0) {
            console.log(`Remaining ${remaining} uses Fallback Price (Needs Strategy Check)`);
        }

        console.log(`\nTotal FIFO Value: ${totalValue}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
