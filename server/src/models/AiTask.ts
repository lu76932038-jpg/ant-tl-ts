import { RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';

export interface AiTask {
    id?: number;
    source_link_id: number; // 关联的社区问题ID
    title: string;
    description?: string;
    plan_content: string;
    admin_comment?: string;
    status: 'PENDING_APPROVAL' | 'DEVELOPING' | 'COMPLETED' | 'REJECTED';
    created_at?: Date;
    updated_at?: Date;
}

export class AiTaskModel {
    static async initializeTables() {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS ai_tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source_link_id INT NOT NULL COMMENT 'Associated community question ID',
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    plan_content TEXT NOT NULL,
                    admin_comment TEXT,
                    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            console.log('ai_tasks table initialized.');
        } catch (error) {
            console.error('Error initializing ai_tasks table:', error);
        }
    }

    static async createTask(task: AiTask): Promise<number> {
        const [result] = await pool.execute<any>(
            `INSERT INTO ai_tasks (source_link_id, title, description, plan_content, status) VALUES (?, ?, ?, ?, ?)`,
            [task.source_link_id, task.title, task.description || '', task.plan_content, task.status || 'PENDING_APPROVAL']
        );
        return result.insertId;
    }

    static async getAllTasks(): Promise<AiTask[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM ai_tasks ORDER BY created_at DESC`
        );
        return rows as AiTask[];
    }

    static async getTaskById(id: number): Promise<AiTask | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM ai_tasks WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) return null;
        return rows[0] as AiTask;
    }

    static async updateTaskStatus(id: number, status: string): Promise<boolean> {
        const [result] = await pool.execute<any>(
            `UPDATE ai_tasks SET status = ? WHERE id = ?`,
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async updateTask(id: number, task: Partial<AiTask>): Promise<boolean> {
        const updates: string[] = [];
        const values: any[] = [];

        if (task.title !== undefined) {
            updates.push('title = ?');
            values.push(task.title);
        }
        if (task.description !== undefined) {
            updates.push('description = ?');
            values.push(task.description);
        }
        if (task.plan_content !== undefined) {
            updates.push('plan_content = ?');
            values.push(task.plan_content);
        }
        if (task.status !== undefined) {
            updates.push('status = ?');
            values.push(task.status);
        }

        if (updates.length === 0) return false;

        values.push(id);
        const setClause = updates.join(', ');

        const [result] = await pool.execute<any>(
            `UPDATE ai_tasks SET ${setClause} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    }
}
