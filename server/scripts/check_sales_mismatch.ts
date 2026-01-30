import pool from '../src/config/database';
import { RowDataPacket } from 'mysql2';

const run = async () => {
    try {
        console.log('Checking for Sales Data Mismatch...');

        // 1. Get all SKUs
        const [skus] = await pool.execute<RowDataPacket[]>('SELECT DISTINCT product_model FROM shiplist');

        for (const row of skus) {
            const sku = row.product_model;

            // 2. Query Monthly Sum
            const [monthly] = await pool.execute<RowDataPacket[]>(
                `SELECT 
                    DATE_FORMAT(outbound_date, '%Y-%m') as month,
                    SUM(quantity) as qty
                 FROM shiplist
                 WHERE product_model = ?
                 GROUP BY month`,
                [sku]
            );

            // 3. Query Daily Sum (emulating Controller logic but summing it up)
            // Controller uses: GROUP BY outbound_date
            const [daily] = await pool.execute<RowDataPacket[]>(
                `SELECT 
                    DATE_FORMAT(outbound_date, '%Y-%m') as month,
                    SUM(quantity) as qty
                 FROM (
                     SELECT 
                        outbound_date,
                        SUM(quantity) as quantity
                     FROM shiplist
                     WHERE product_model = ?
                     GROUP BY outbound_date
                 ) as daily_agg
                 GROUP BY month`,
                [sku]
            );

            // Compare
            const monthMap = new Map<string, number>();
            monthly.forEach((r: any) => monthMap.set(r.month, Number(r.qty)));

            const dailyMap = new Map<string, number>();
            daily.forEach((r: any) => dailyMap.set(r.month, Number(r.qty)));

            let hasMismatch = false;
            for (const [m, q] of dailyMap) {
                const mq = monthMap.get(m) || 0;
                if (Math.abs(mq - q) > 0.01) {
                    console.log(`Mismatch found for SKU: ${sku}, Month: ${m}`);
                    console.log(`  Monthly Agg: ${mq}`);
                    console.log(`  Daily Agg Sum: ${q}`);
                    hasMismatch = true;

                    // Dump raw rows for this month
                    const [rows] = await pool.execute<RowDataPacket[]>(
                        `SELECT * FROM shiplist WHERE product_model = ? AND DATE_FORMAT(outbound_date, '%Y-%m') = ?`,
                        [sku, m]
                    );
                    console.log('  Raw Rows:', rows.length);
                    // console.table(rows);
                }
            }
            // Also check if MonthMap has entries DailyMap doesn't (should match)
        }

        console.log('Check complete.');
        process.exit(0);

    } catch (error) {
        console.error('Check failed', error);
        process.exit(1);
    }
};

run();
