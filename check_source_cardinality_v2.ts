
import mysql from 'mysql2/promise';
// Fix import path - use server/src/config/database
const dbConfig = require('./server/src/config/database').default;
// Wait, database.ts exports default pool. But we need to query data_sync_config.
// Let's just create a connection to local DB manually to get config, to avoid import mess.
// Actually, let's try to import correctly.
// Running from root: d:\anti\anttools\ant-tl-ts001
import { createPool } from 'mysql2/promise';
// We'll just hardcodish read the config file or just use the local DB credentials if we knew them.
// But valid way is to fix import.
// The previous error was: import db from './server/src/config/database';
// transform to: import db from './server/src/config/database.ts'; for ts-node? 
// No, ts-node should resolve.
// Let's try to use absolute path or relative from root.
import db from './server/src/config/database';

async function main() {
    try {
        console.log('Reading local config...');
        // We can just read the config from the database directly using the imported pool
        const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = 'outbound_data_sync_config'") as any[];

        if (rows.length === 0) {
            console.log('No config found.');
            process.exit(0);
        }

        const config = JSON.parse(rows[0].config_value);
        console.log(`Connecting to Source DB: ${config.host} ...`);

        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            connectTimeout: 60000
        });

        console.log('Connected. Counting rows...');

        let sql = config.sql.trim();
        if (sql.endsWith(';')) sql = sql.slice(0, -1);

        // Count Total
        const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (\n${sql}\n) as t`) as any;
        console.log(`[Result] Total Rows (Lines): ${total}`);

        // Count Unique OutboundIDs
        // Assuming column 'outbound_id' exists in the result set.
        try {
            // We need to know the alias. The user screenshot shows 'outbound_id'.
            const [[{ unique_orders }]] = await connection.execute(`SELECT COUNT(DISTINCT outbound_id) as unique_orders FROM (\n${sql}\n) as t`) as any;
            console.log(`[Result] Unique Orders (outbound_id): ${unique_orders}`);
            console.log(`[Analysis] Ratio: ${(total / unique_orders).toFixed(2)} lines per order.`);

            if (total > unique_orders) {
                console.log(`[Conclusion] PROVEN: There are duplicate outbound_ids (Multi-line orders).`);
            } else {
                console.log(`[Conclusion] outbound_ids are unique.`);
            }

        } catch (e) {
            console.log('Error counting unique IDs (maybe column name mismatch):', (e as Error).message);
        }

        await connection.end();
        await db.end(); // close local pool

    } catch (error) {
        console.error('Script Error:', error);
    }
}

main();
