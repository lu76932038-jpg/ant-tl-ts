
// v5: Using ESM imports for fs/path and avoiding require.
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Helper to read env manually
function getEnvValue(content: string, key: string, fallback: string): string {
    const regex = new RegExp(`${key}=(.*)`);
    const match = content.match(regex);
    return match ? match[1].trim() : fallback;
}

async function main() {
    try {
        console.log('Connecting to LOCAL DB to fetch config...');

        const envPath = path.resolve(process.cwd(), 'server', '.env');
        let localUser = 'root';
        let localPass = '';
        let localDb = 'ant_tl_ts001';
        let localPort = 3306;

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            localUser = getEnvValue(envContent, 'DB_USER', 'root');
            localPass = getEnvValue(envContent, 'DB_PASSWORD', '');
            localDb = getEnvValue(envContent, 'DB_NAME', 'ant_tl_ts001');
            localPort = Number(getEnvValue(envContent, 'DB_PORT', '3306'));
        }

        console.log(`Local DB Creds (Guessed/Read): ${localUser} / **** @ ${localDb}`);

        const localConn = await mysql.createConnection({
            host: 'localhost',
            user: localUser,
            password: localPass,
            database: localDb,
            port: localPort
        });

        const [rows] = await localConn.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = 'outbound_data_sync_config'") as any[];
        localConn.end();

        if (rows.length === 0) {
            console.log('No config found.');
            return;
        }

        const config = JSON.parse(rows[0].config_value);
        console.log(`Remote DB Host: ${config.host}`);

        const remoteConn = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            connectTimeout: 60000
        });

        // ... repeat logic ...
        let sql = config.sql.trim();
        if (sql.endsWith(';')) sql = sql.slice(0, -1);

        console.log('Querying Remote...');
        const [[{ total }]] = await remoteConn.execute(`SELECT COUNT(*) as total FROM (\n${sql}\n) as t`) as any;
        console.log(`\n>>> Total Rows: ${total}`);

        try {
            const [[{ unique_orders }]] = await remoteConn.execute(`SELECT COUNT(DISTINCT outbound_id) as unique_orders FROM (\n${sql}\n) as t`) as any;
            console.log(`>>> Unique Outbound IDs: ${unique_orders}`);
            console.log(`>>> Ratio: ${(total / unique_orders).toFixed(2)}`);

            if (Number(total) > Number(unique_orders)) {
                console.log(`\n*** CONCLUSION: DUPLICATES EXIST (One Order has Multiple Lines) ***`);
            } else {
                console.log(`\n*** CONCLUSION: NO DUPLICATES ***`);
            }
        } catch (e) {
            console.log('Error counting unique:', (e as Error).message);
        }

        remoteConn.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
