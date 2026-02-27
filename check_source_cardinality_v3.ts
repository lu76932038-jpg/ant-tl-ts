
// Use relative path for local import, ensuring it works with ts-node
import mysql from 'mysql2/promise';

// Hardcode import just to make it work without fiddling with tsconfig paths
// We are in d:\anti\anttools\ant-tl-ts001
// Database file is at: server/src/config/database.ts

// Let's manually create connection to local DB instead of importing
// We can guess local creds? Usually root/password or empty.
// Better way: Read database.ts file content, extract creds using regex? No, risky.
// Let's try importing via require with absolute path logic that ts-node likes?
// Or just fix the relative path: './server/src/config/database' should work if we are in root.
// The error says "Did you mean to import ./server/src/config/database.ts?"
// TS-Node with ESM sometimes requires extension.

import db from './server/src/config/database.ts';

async function main() {
    try {
        console.log('Reading local config...');
        const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = 'outbound_data_sync_config'") as any[];

        if (rows.length === 0) {
            console.log('No config found.');
            process.exit(0);
        }

        const config = JSON.parse(rows[0].config_value);
        console.log(`Config found. Host: ${config.host}`);

        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            connectTimeout: 60000
        });

        console.log('Connected to Source DB. Querying...');

        let sql = config.sql.trim();
        if (sql.endsWith(';')) sql = sql.slice(0, -1);

        // Count Total
        const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (\n${sql}\n) as t`) as any;
        console.log(`Total Rows (Details): ${total}`);

        // Count Unique OutboundIDs
        try {
            const [[{ unique_orders }]] = await connection.execute(`SELECT COUNT(DISTINCT outbound_id) as unique_orders FROM (\n${sql}\n) as t`) as any;
            console.log(`Unique Orders (Headers): ${unique_orders}`);
            console.log(`Items per Order: ${(total / unique_orders).toFixed(2)}`);

            if (Number(total) > Number(unique_orders)) {
                console.log(`\n*** CONCLUSION: YES, DUPLICATES EXIST ***`);
                console.log(`There are ${total} rows but only ${unique_orders} unique outbound_ids.`);
                console.log(`This confirms that one outbound_id has multiple product lines.`);
            } else {
                console.log(`\n*** CONCLUSION: NO DUPLICATES ***`);
            }

        } catch (e) {
            console.log('Error counting unique IDs:', (e as Error).message);
        }

        await connection.end();
        await db.end();

    } catch (error) {
        console.error('Script Error:', error);
    }
}

main();
