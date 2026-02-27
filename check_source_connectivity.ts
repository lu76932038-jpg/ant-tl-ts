
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

function getEnvValue(content: string, key: string, fallback: string): string {
    const regex = new RegExp(`${key}=(.*)`);
    const match = content.match(regex);
    return match ? match[1].trim() : fallback;
}

async function main() {
    try {
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
        console.log(`Connecting to Source DB: ${config.host} ...`);

        const remoteConn = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            connectTimeout: 5000 // 5s timeout
        });

        console.log('Connected to Source DB successfully.');
        await remoteConn.ping();
        console.log('Ping successful.');
        await remoteConn.end();

    } catch (error) {
        console.error('Source DB Connection Error:', error);
    }
}
main();
