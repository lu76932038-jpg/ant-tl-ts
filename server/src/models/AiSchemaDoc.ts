import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AiSchemaDoc {
    id: number;
    table_name: string;
    description: string; // Natural language description for AI
    column_info: string; // JSON or text description of columns
    created_at: Date;
    updated_at: Date;
}

export class AiSchemaDocModel {
    static async findAll(): Promise<AiSchemaDoc[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM ai_schema_docs ORDER BY table_name ASC'
        );
        return rows as AiSchemaDoc[];
    }

    static async upsert(doc: Omit<AiSchemaDoc, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        await pool.execute(
            `INSERT INTO ai_schema_docs (table_name, description, column_info) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE description = VALUES(description), column_info = VALUES(column_info)`,
            [doc.table_name, doc.description, doc.column_info]
        );
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_schema_docs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    table_name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    column_info TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('ai_schema_docs table initialized.');
        } catch (error) {
            console.error('Error initializing ai_schema_docs table:', error);
        }
    }
}
