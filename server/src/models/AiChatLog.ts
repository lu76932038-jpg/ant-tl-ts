import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiChatLog {
    id: number;
    session_id?: string; // UUID
    user_query: string;
    prompt_used: string;
    sql_generated: string;
    sql_execution_result: string; // Brief summary or row count
    ai_reasoning: string;
    final_answer: string;
    feedback_score?: number; // 1: like, -1: dislike, 0: none
    feedback_text?: string;
    corrected_answer?: string;
    created_at: Date;
}

export class AiChatLogModel {
    static async create(log: Omit<AiChatLog, 'id' | 'created_at'>): Promise<number> {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO ai_chat_logs 
            (session_id, user_query, prompt_used, sql_generated, sql_execution_result, ai_reasoning, final_answer) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                log.session_id || null,
                log.user_query,
                log.prompt_used,
                log.sql_generated,
                log.sql_execution_result,
                log.ai_reasoning || '',
                log.final_answer
            ]
        );
        return result.insertId;
    }

    static async findAll(limit = 50): Promise<AiChatLog[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM ai_chat_logs ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        return rows as AiChatLog[];
    }

    static async findBySessionId(sessionId: string): Promise<AiChatLog[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_chat_logs WHERE session_id = ? ORDER BY created_at ASC',
            [sessionId]
        );
        return rows as AiChatLog[];
    }

    static async findById(id: number): Promise<AiChatLog | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_chat_logs WHERE id = ?',
            [id]
        );
        return (rows[0] as AiChatLog) || null;
    }

    static async updateFeedback(id: number, feedback: { score?: number, text?: string, corrected_answer?: string }): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (feedback.score !== undefined) {
            updates.push('feedback_score = ?');
            values.push(feedback.score);
        }
        if (feedback.text !== undefined) {
            updates.push('feedback_text = ?');
            values.push(feedback.text);
        }
        if (feedback.corrected_answer !== undefined) {
            updates.push('corrected_answer = ?');
            values.push(feedback.corrected_answer);
        }

        if (updates.length === 0) return;

        values.push(id);
        await pool.execute(
            `UPDATE ai_chat_logs SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_chat_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(36) NULL,
                    user_query TEXT NOT NULL,
                    prompt_used TEXT,
                    sql_generated TEXT,
                    sql_execution_result TEXT,
                    ai_reasoning TEXT,
                    final_answer TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_session (session_id)
                )
            `);

            // Migration: Add session_id if missing
            try {
                await pool.execute("ALTER TABLE ai_chat_logs ADD COLUMN session_id VARCHAR(36) NULL AFTER id");
                await pool.execute("CREATE INDEX idx_session ON ai_chat_logs(session_id)");
                console.log('Added session_id column to ai_chat_logs');
            } catch (e: any) {
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    // Ignore duplicate column error, log others
                    // console.log('session_id column likely exists');
                }
            }

            console.log('ai_chat_logs table initialized.');
        } catch (error) {
            console.error('Error initializing ai_chat_logs table:', error);
        }
    }
}
