
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

        console.log('Dropping shiplist table...');
        await connection.execute('DROP TABLE IF EXISTS shiplist');

        console.log('Creating shiplist table with CORRECT Schema (UNIQUE outbound_id, NO unique_key)...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shiplist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                outbound_id VARCHAR(50) UNIQUE NOT NULL,
                product_model VARCHAR(100) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_type VARCHAR(100),
                outbound_date DATE NOT NULL,
                quantity INT DEFAULT 1,
                customer_name VARCHAR(255) NOT NULL,
                customer_code VARCHAR(100),
                unit_price DECIMAL(10, 2) DEFAULT 0.00,
                warehouse VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_outbound_id (outbound_id)
            )
        `);

        console.log('Shiplist table reset successfully.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}
main();
