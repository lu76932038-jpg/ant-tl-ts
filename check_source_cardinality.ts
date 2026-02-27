
import mysql from 'mysql2/promise';
import db from './server/src/config/database';

async function main() {
    try {
        // 1. Get Source Config
        const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = 'outbound_data_sync_config'") as any[];
        if (rows.length === 0) {
            console.log('No config found.');
            return;
        }
        const config = JSON.parse(rows[0].config_value);
        console.log('Connecting to source DB:', config.host);

        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            connectTimeout: 60000
        });

        // 2. Count Total Rows
        let sql = config.sql.trim();
        if (sql.endsWith(';')) sql = sql.slice(0, -1);

        console.log('Counting total rows...');
        const [[{ total_rows }]] = await connection.execute(`SELECT COUNT(*) as total_rows FROM (\n${sql}\n) as t`) as any;
        console.log(`Total Rows (Lines): ${total_rows}`);

        // 3. Count Unique Outbound IDs
        console.log('Counting unique outbound_ids...');
        // Need to parse the ID column name from the subquery or just wrap it. 
        // The user's SQL likely aliases the ID as outbound_id.
        // Let's assume the outer query can select outbound_id.
        try {
            const [[{ unique_ids }]] = await connection.execute(`SELECT COUNT(DISTINCT outbound_id) as unique_ids FROM (\n${sql}\n) as t`) as any;
            console.log(`Unique Outbound IDs (Orders): ${unique_ids}`);
            console.log(`Ratio (Lines/Order): ${(total_rows / unique_ids).toFixed(2)}`);
        } catch (e) {
            console.log('Could not count unique IDs (column name might differ):', (e as Error).message);
            // Try 'id' if 'outbound_id' fails?
            // Actually let's try to preview the columns first to be sure.
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}
main();
