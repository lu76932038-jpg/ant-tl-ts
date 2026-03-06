import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows]: any = await connection.execute('SELECT * FROM feedback_records ORDER BY created_at DESC');
        console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
    } finally {
        await connection.end();
    }
}

main();
