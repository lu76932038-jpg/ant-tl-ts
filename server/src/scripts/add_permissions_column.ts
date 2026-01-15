import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

const addPermissionsColumn = async () => {
    try {
        console.log('Starting migration: add permissions column to users table...');

        // Check if column exists
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SHOW COLUMNS FROM users LIKE 'permissions'"
        );

        if (rows.length > 0) {
            console.log('Column "permissions" already exists. Skipping...');
        } else {
            const alterTableSQL = `
                ALTER TABLE users 
                ADD COLUMN permissions JSON DEFAULT NULL AFTER role;
            `;
            await pool.execute(alterTableSQL);
            console.log('Successfully added "permissions" column.');
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

addPermissionsColumn();
