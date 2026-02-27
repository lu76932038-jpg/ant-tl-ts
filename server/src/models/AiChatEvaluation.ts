
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiChatEvaluation {
    id: number;
    log_id: number;
    score: number;
    issues?: string[]; // stored as JSON string in DB, parsed to array
    suggestion?: string;
    created_at: Date;
}

export class AiChatEvaluationModel {
    static async create(evaluation: Omit<AiChatEvaluation, 'id' | 'created_at'>): Promise<number> {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO ai_chat_evaluations 
            (log_id, score, issues, suggestion) 
            VALUES (?, ?, ?, ?)`,
            [
                evaluation.log_id,
                evaluation.score,
                JSON.stringify(evaluation.issues || []),
                evaluation.suggestion || null
            ]
        );
        return result.insertId;
    }

    static async findByLogId(logId: number): Promise<AiChatEvaluation | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_chat_evaluations WHERE log_id = ?',
            [logId]
        );
        const row = rows[0] as any;
        if (!row) return null;

        if (typeof row.issues === 'string') {
            try {
                row.issues = JSON.parse(row.issues);
            } catch (e) {
                row.issues = [];
            }
        }
        return row as AiChatEvaluation;
    }

    static async findAll(): Promise<AiChatEvaluation[]> {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ai_chat_evaluations ORDER BY created_at DESC LIMIT 100');
        return rows.map((row: any) => {
            if (typeof row.issues === 'string') {
                try {
                    row.issues = JSON.parse(row.issues);
                } catch (e) {
                    row.issues = [];
                }
            }
            return row as AiChatEvaluation;
        });
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_chat_evaluations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    log_id INT NOT NULL,
                    score INT DEFAULT 0 COMMENT '0-100 quality score',
                    issues JSON NULL COMMENT 'Array of issue tags',
                    suggestion TEXT NULL COMMENT 'Text suggestion for improvement',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_log_id (log_id)
                )
            `);
            // Add foreign key separately if needed (requires table exists)
            // await pool.execute("ALTER TABLE ai_chat_evaluations ADD CONSTRAINT fk_log_id FOREIGN KEY (log_id) REFERENCES ai_chat_logs(id) ON DELETE CASCADE"); 
            // Skipping FK strict constraints for MVP simplicity to avoid order dependency issues during init if not careful
            console.log('ai_chat_evaluations table initialized.');
        } catch (error) {
            console.error('Error initializing ai_chat_evaluations table:', error);
        }
    }
}
