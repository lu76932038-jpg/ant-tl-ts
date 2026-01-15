import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

const addPhoneColumn = async () => {
    try {
        console.log('Starting migration: add phone column to users table...');

        // Check if column exists
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SHOW COLUMNS FROM users LIKE 'phone'"
        );

        if (rows.length > 0) {
            console.log('Column "phone" already exists. Skipping...');
        } else {
            const alterTableSQL = `
                ALTER TABLE users 
                ADD COLUMN phone VARCHAR(20) UNIQUE DEFAULT NULL AFTER email;
            `;
            await pool.execute(alterTableSQL);
            console.log('Successfully added "phone" column.');
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

addPhoneColumn();
