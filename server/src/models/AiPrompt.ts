import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiPrompt {
    id: number;
    prompt_key: string; // e.g., 'SQL_INSTRUCTION', 'ANSWER_INSTRUCTION'
    content: string;
    version: number;
    is_active: boolean;
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export class AiPromptModel {
    static async findAll(): Promise<AiPrompt[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_prompts ORDER BY prompt_key ASC, version DESC'
        );
        return rows as AiPrompt[];
    }

    static async findActive(key: string): Promise<AiPrompt | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_prompts WHERE prompt_key = ? AND is_active = TRUE LIMIT 1',
            [key]
        );
        return (rows[0] as AiPrompt) || null;
    }

    static async create(prompt: Omit<AiPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // If new prompt is active, deactivate others with same key
            if (prompt.is_active) {
                await connection.execute(
                    'UPDATE ai_prompts SET is_active = FALSE WHERE prompt_key = ?',
                    [prompt.prompt_key]
                );
            }

            const [result] = await connection.execute<ResultSetHeader>(
                'INSERT INTO ai_prompts (prompt_key, content, version, is_active, description) VALUES (?, ?, ?, ?, ?)',
                [prompt.prompt_key, prompt.content, prompt.version, prompt.is_active, prompt.description || '']
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_prompts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    prompt_key VARCHAR(100) NOT NULL,
                    content TEXT NOT NULL,
                    version INT DEFAULT 1,
                    is_active BOOLEAN DEFAULT TRUE,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_key (prompt_key)
                )
            `);
            console.log('ai_prompts table initialized.');
        } catch (error) {
            console.error('Error initializing ai_prompts table:', error);
        }
    }
}
