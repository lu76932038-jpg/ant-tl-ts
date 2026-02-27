
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

        const connection = await mysql.createConnection({
            host: 'localhost',
            user: localUser,
            password: localPass,
            database: localDb,
            port: localPort
        });

        console.log('Modifying product_model column to VARCHAR(255)...');
        await connection.execute('ALTER TABLE shiplist MODIFY COLUMN product_model VARCHAR(255) NOT NULL');
        console.log('Done.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}
main();
