import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiChatSession {
    id: string; // UUID
    title: string;
    created_at: Date;
    updated_at: Date;
}

export class AiChatSessionModel {
    static async create(id: string, title?: string): Promise<string> {
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO ai_chat_sessions (id, title) VALUES (?, ?)',
            [id, title || '新会话']
        );
        return id;
    }

    static async findAll(limit = 20): Promise<AiChatSession[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM ai_chat_sessions ORDER BY updated_at DESC LIMIT ?',
            [limit]
        );
        return rows as AiChatSession[];
    }

    static async findById(id: string): Promise<AiChatSession | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_chat_sessions WHERE id = ?',
            [id]
        );
        return (rows[0] as AiChatSession) || null;
    }

    static async updateTitle(id: string, title: string): Promise<void> {
        await pool.execute(
            'UPDATE ai_chat_sessions SET title = ? WHERE id = ?',
            [title, id]
        );
    }

    static async updateTimestamp(id: string): Promise<void> {
        await pool.execute(
            'UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    }

    static async delete(id: string): Promise<void> {
        await pool.execute('DELETE FROM ai_chat_sessions WHERE id = ?', [id]);
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_chat_sessions (
                    id VARCHAR(36) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('ai_chat_sessions table initialized.');
        } catch (error) {
            console.error('Error initializing ai_chat_sessions table:', error);
        }
    }
}
