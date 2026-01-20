import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface LoginLog {
    id?: number;
    user_id: number;
    username: string;
    ip_address: string;
    user_agent: string;
    status: 'success' | 'failed';
    error_message?: string;
    created_at?: Date;
}

export class LoginLogModel {
    static async initializeTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS login_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                username VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                status ENUM('success', 'failed') NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(query);
    }

    static async create(log: LoginLog) {
        const query = `
            INSERT INTO login_logs 
            (user_id, username, ip_address, user_agent, status, error_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute<ResultSetHeader>(query, [
            log.user_id || null,
            log.username,
            log.ip_address || null,
            log.user_agent || null,
            log.status,
            log.error_message || null
        ]);
        return result;
    }

    static async findAll(params: { username?: string, status?: string } = {}) {
        let query = 'SELECT * FROM login_logs';
        const queryParams: any[] = [];
        const conditions: string[] = [];

        if (params.username) {
            conditions.push('username LIKE ?');
            queryParams.push(`%${params.username}%`);
        }
        if (params.status) {
            conditions.push('status = ?');
            queryParams.push(params.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT 500';

        const [rows] = await pool.execute<RowDataPacket[]>(query, queryParams);
        return rows as LoginLog[];
    }
}
