const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ant_tools_db',
    port: parseInt(process.env.DB_PORT || '3306')
};

async function checkTasks() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.execute(
            `SELECT id, user_id, file_name, created_at FROM inquiry_tasks ORDER BY created_at DESC LIMIT 5`
        );
        console.log('Recent Tasks:', rows);

        const [users] = await connection.execute('SELECT id, username FROM users');
        console.log('Users:', users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkTasks();
