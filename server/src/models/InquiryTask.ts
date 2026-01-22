import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface InquiryTask {
    id: string; // UUID
    user_id: number;
    file_name: string;
    file_path: string; // Store local path
    file_size: number;
    status: 'pending' | 'completed' | 'failed' | 'terminated';
    parsed_result: any; // JSON
    raw_content?: any; // JSON - AI解析前的原始清单
    process_logs?: any; // JSON - 解析过程日志
    shared_with: number[]; // Array of User IDs
    shared_with_names?: string[]; // Array of Usernames
    error_message?: string;
    completed_at?: Date;
    rating?: number; // 1: 满意, -1: 不满意
    comment?: string;
    user_name?: string;
    created_at: Date;
    updated_at: Date;
}

export class InquiryTaskModel {
    // Initialize the table
    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS inquiry_tasks (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id INT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(512),
                    file_size INT NOT NULL,
                    status ENUM('pending', 'completed', 'failed', 'terminated') DEFAULT 'pending',
                    parsed_result JSON,
                    raw_content JSON,
                    process_logs JSON,
                    shared_with JSON,
                    error_message TEXT,
                    completed_at TIMESTAMP NULL,
                    rating TINYINT DEFAULT NULL,
                    comment TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id)
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            `);

            const columns = [
                { name: 'error_message', type: 'TEXT NULL' },
                { name: 'completed_at', type: 'TIMESTAMP NULL' },
                { name: 'rating', type: 'TINYINT DEFAULT NULL' },
                { name: 'comment', type: 'TEXT NULL' },
                { name: 'raw_content', type: 'JSON NULL' },
                { name: 'process_logs', type: 'JSON NULL' }
            ];

            for (const col of columns) {
                try {
                    await pool.execute(`ALTER TABLE inquiry_tasks ADD COLUMN ${col.name} ${col.type};`);
                    console.log(`Added column ${col.name} to inquiry_tasks`);
                } catch (err: any) {
                    if (err.errno !== 1060) {
                        console.error(`Error adding column ${col.name}:`, err);
                    }
                }
            }

            // 修改 ENUM 类型以包含 terminated
            try {
                await pool.execute("ALTER TABLE inquiry_tasks MODIFY COLUMN status ENUM('pending', 'completed', 'failed', 'terminated') DEFAULT 'pending';");
            } catch (err) {
                console.error('Error modifying status enum:', err);
            }
            console.log('InquiryTasks table initialized successfully');
        } catch (error) {
            console.error('Error initializing inquiry_tasks table:', error);
            throw error;
        }
    }

    // Create a new task
    static async create(task: Omit<InquiryTask, 'created_at' | 'updated_at'>): Promise<InquiryTask> {
        const { id, user_id, file_name, file_path, file_size, status, parsed_result, shared_with } = task;

        await pool.execute(
            `INSERT INTO inquiry_tasks (id, user_id, file_name, file_path, file_size, status, parsed_result, shared_with) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                user_id,
                file_name,
                file_path || '',
                file_size,
                status,
                JSON.stringify(parsed_result),
                JSON.stringify(shared_with || [])
            ]
        );

        return task as InquiryTask;
    }

    // Find task by ID
    static async findById(id: string): Promise<InquiryTask | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT it.*, u.username as user_name 
             FROM inquiry_tasks it
             LEFT JOIN users u ON it.user_id = u.id 
             WHERE it.id = ?`,
            [id]
        );
        if (rows.length === 0) return null;

        const task = rows[0] as InquiryTask;
        const result = {
            ...task,
            parsed_result: typeof task.parsed_result === 'string' ? JSON.parse(task.parsed_result) : task.parsed_result,
            shared_with: typeof task.shared_with === 'string' ? JSON.parse(task.shared_with) : (task.shared_with || [])
        };

        if (result.shared_with.length > 0) {
            const [userRows] = await pool.execute<RowDataPacket[]>(
                `SELECT username FROM users WHERE id IN (${result.shared_with.map(() => '?').join(',')})`,
                result.shared_with
            );
            result.shared_with_names = userRows.map(r => r.username);
        } else {
            result.shared_with_names = [];
        }

        return result;
    }

    // Find tasks for a user (Owned + Shared)
    static async findByUserId(userId: number): Promise<InquiryTask[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT it.*, u.username as user_name 
             FROM inquiry_tasks it
             LEFT JOIN users u ON it.user_id = u.id
             WHERE it.user_id = ? 
             OR JSON_CONTAINS(it.shared_with, JSON_ARRAY(?), '$')
             ORDER BY it.created_at DESC`,
            [userId, userId]
        );

        const tasks = rows.map(row => ({
            ...row,
            parsed_result: typeof row.parsed_result === 'string' ? JSON.parse(row.parsed_result) : row.parsed_result,
            shared_with: typeof row.shared_with === 'string' ? JSON.parse(row.shared_with) : (row.shared_with || [])
        })) as InquiryTask[];

        return await this.attachSharedWithNames(tasks);
    }

    static async count(filter?: { status?: InquiryTask['status'] }): Promise<number> {
        let query = 'SELECT COUNT(*) as count FROM inquiry_tasks';
        const params: any[] = [];

        if (filter?.status) {
            query += ' WHERE status = ?';
            params.push(filter.status);
        }

        const [rows] = await pool.execute<RowDataPacket[]>(query, params);
        return rows[0].count;
    }

    // Find ALL tasks (Admin only)
    static async findAll(): Promise<InquiryTask[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT it.*, u.username as user_name 
             FROM inquiry_tasks it
             LEFT JOIN users u ON it.user_id = u.id
             ORDER BY it.created_at DESC`
        );

        const tasks = rows.map(row => ({
            ...row,
            parsed_result: typeof row.parsed_result === 'string' ? JSON.parse(row.parsed_result) : row.parsed_result,
            shared_with: typeof row.shared_with === 'string' ? JSON.parse(row.shared_with) : (row.shared_with || [])
        })) as InquiryTask[];

        return await this.attachSharedWithNames(tasks);
    }

    private static async attachSharedWithNames(tasks: InquiryTask[]): Promise<InquiryTask[]> {
        for (const task of tasks) {
            if (task.shared_with && task.shared_with.length > 0) {
                const [userRows] = await pool.execute<RowDataPacket[]>(
                    `SELECT username FROM users WHERE id IN (${task.shared_with.map(() => '?').join(',')})`,
                    task.shared_with
                );
                task.shared_with_names = userRows.map(r => r.username);
            } else {
                task.shared_with_names = [];
            }
        }
        return tasks;
    }

    // Update task sharing
    static async updateSharedWith(id: string, sharedWith: number[]): Promise<void> {
        await pool.execute(
            'UPDATE inquiry_tasks SET shared_with = ? WHERE id = ?',
            [JSON.stringify(sharedWith), id]
        );
    }

    // Update status and result - only if currently pending
    static async updateResult(id: string, status: 'completed' | 'failed' | 'terminated', result: any, errorMessage?: string, processLogs?: any): Promise<void> {
        await pool.execute(
            'UPDATE inquiry_tasks SET status = ?, parsed_result = ?, error_message = ?, process_logs = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = \'pending\'',
            [status, JSON.stringify(result), errorMessage || null, JSON.stringify(processLogs || []), id]
        );
    }

    // Update raw content - only if currently pending
    static async updateRawContent(id: string, rawContent: any, processLogs?: any): Promise<void> {
        await pool.execute(
            'UPDATE inquiry_tasks SET raw_content = ?, process_logs = ? WHERE id = ? AND status = \'pending\'',
            [JSON.stringify(rawContent), JSON.stringify(processLogs || []), id]
        );
    }

    static async updateStatus(id: string, status: InquiryTask['status']): Promise<void> {
        await pool.execute(
            'UPDATE inquiry_tasks SET status = ?, completed_at = ? WHERE id = ?',
            [status, status === 'terminated' ? new Date() : null, id]
        );
    }

    // Update rating and comment
    static async updateFeedback(id: string, rating: number | null, comment: string | null): Promise<void> {
        await pool.execute(
            'UPDATE inquiry_tasks SET rating = ?, comment = ? WHERE id = ?',
            [rating, comment, id]
        );
    }

    static async delete(id: string): Promise<void> {
        await pool.execute('DELETE FROM inquiry_tasks WHERE id = ?', [id]);
    }
}
