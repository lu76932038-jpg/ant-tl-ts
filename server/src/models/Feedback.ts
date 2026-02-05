import { Pool, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';

export interface Feedback {
    id?: number;
    user_id?: number;
    username?: string; // Optional, joined for display
    type: 'FEATURE' | 'BUG' | 'IMPROVEMENT' | 'OTHER';
    content: string;
    ai_reply?: string;
    status: 'PENDING' | 'ADOPTED' | 'REJECTED';
    created_at?: Date;
}

export class FeedbackModel {
    static async initializeTables() {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS feedback_records (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    type VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    ai_reply TEXT,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('feedback_records table initialized.');
        } catch (error) {
            console.error('Error initializing feedback_records table:', error);
        }
    }

    static async create(data: Feedback): Promise<number> {
        const [result] = await pool.execute<any>(
            `INSERT INTO feedback_records (user_id, type, content, ai_reply, status) VALUES (?, ?, ?, ?, ?)`,
            [data.user_id || null, data.type, data.content, data.ai_reply || '', data.status || 'PENDING']
        );
        return result.insertId;
    }

    static async findAll(userId?: number): Promise<Feedback[]> {
        let sql = `SELECT * FROM feedback_records`;
        const params: any[] = [];

        if (userId) {
            sql += ` WHERE user_id = ?`;
            params.push(userId);
        }

        sql += ` ORDER BY created_at DESC`;

        const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
        return rows as Feedback[];
    }
}
