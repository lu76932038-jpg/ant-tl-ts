import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

const backfillPermissions = async () => {
    try {
        console.log('Starting backfill: granting default permissions to existing users...');

        const defaultPermissions = JSON.stringify(['inquiry_parsing', 'profile', 'change_password']);

        // Update all users with role 'user' who have no permissions or NULL permissions
        const [result] = await pool.execute(
            `UPDATE users 
             SET permissions = ? 
             WHERE role = 'user' AND (permissions IS NULL OR JSON_LENGTH(permissions) = 0)`,
            [defaultPermissions]
        );

        // @ts-ignore
        console.log(`Backfill completed. Updated ${result.affectedRows} users.`);
        process.exit(0);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
};

backfillPermissions();
