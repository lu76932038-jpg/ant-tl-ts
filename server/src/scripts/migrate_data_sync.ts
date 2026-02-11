
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'wms4db', // Adjust if needed
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...', dbConfig.host);
        connection = await mysql.createConnection(dbConfig);

        const sqlPath = path.join(__dirname, '../database/migrations/create_sys_data_sync_config.sql');
        const sql = await fs.readFile(sqlPath, 'utf-8');

        console.log('Executing migration...');
        await connection.query(sql);

        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
