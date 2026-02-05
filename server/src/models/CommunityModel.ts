import { Pool, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';

export interface Question {
    id?: number;
    title: string;
    content: string; // HTML or Markdown
    author_id: number;
    author_name?: string; // Loaded via JOIN
    author_avatar?: string;
    tags: string[]; // JSON array in DB
    view_count?: number;
    vote_count?: number;
    answer_count?: number;
    last_answer_at?: Date; // 最新回答时间
    created_at?: Date;
    updated_at?: Date;
}

export interface Answer {
    id?: number;
    question_id: number;
    content: string;
    author_id: number;
    author_name?: string;
    author_avatar?: string;
    is_accepted: boolean;
    vote_count?: number;
    created_at?: Date;
}

export class CommunityModel {
    static async initializeTables() {
        try {
            // 1. Questions Table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS community_questions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content LONGTEXT,
                    author_id INT NOT NULL,
                    tags JSON,
                    view_count INT DEFAULT 0,
                    vote_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_author (author_id),
                    INDEX idx_created (created_at)
                );
            `);

            // 2. Answers Table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS community_answers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    question_id INT NOT NULL,
                    content LONGTEXT NOT NULL,
                    author_id INT NOT NULL,
                    is_accepted BOOLEAN DEFAULT FALSE,
                    vote_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_question (question_id),
                    INDEX idx_author (author_id)
                );
            `);

            // 升级现有字段数据类型 (为了兼容已存在的 TEXT 字段)
            try {
                await pool.execute(`ALTER TABLE community_questions MODIFY COLUMN content LONGTEXT`);
                await pool.execute(`ALTER TABLE community_answers MODIFY COLUMN content LONGTEXT`);
            } catch (alterError) {
                // 如果已经是 LONGTEXT 或环境不支持 ALTER，则跳过
                console.log('Database schema update (ALTER) handled or skipped');
            }

            // 3. Interactions Table (Votes/Likes)
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS community_interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    target_type ENUM('question', 'answer') NOT NULL,
                    target_id INT NOT NULL,
                    user_id INT NOT NULL,
                    interaction_type ENUM('upvote', 'downvote', 'bookmark') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_interaction (target_type, target_id, user_id, interaction_type)
                );
            `);

            console.log('Community tables initialized.');
        } catch (error) {
            console.error('Error initializing Community tables:', error);
        }
    }

    // --- Questions ---

    static async createQuestion(question: Question): Promise<number> {
        const [result] = await pool.execute<any>(
            `INSERT INTO community_questions (title, content, author_id, tags) VALUES (?, ?, ?, ?)`,
            [question.title, question.content, question.author_id, JSON.stringify(question.tags)]
        );
        return result.insertId;
    }

    static async getQuestions(limit: number = 20, offset: number = 0, sort: 'new' | 'hot' = 'new', keyword?: string): Promise<Question[]> {
        let orderBy = 'q.created_at DESC';
        if (sort === 'hot') orderBy = 'q.vote_count DESC, q.view_count DESC';

        let whereClause = '1=1';
        const queryParams: any[] = [];

        if (keyword) {
            whereClause = `(q.title LIKE ? OR EXISTS (SELECT 1 FROM community_answers a WHERE a.question_id = q.id AND a.content LIKE ?))`;
            queryParams.push(`%${keyword}%`, `%${keyword}%`);
        }

        const sql = `
            SELECT DISTINCT q.*, u.username as author_name, u.avatar as author_avatar,
            (SELECT COUNT(*) FROM community_answers WHERE question_id = q.id) as answer_count,
            (SELECT MAX(created_at) FROM community_answers WHERE question_id = q.id) as last_answer_at
            FROM community_questions q
            LEFT JOIN users u ON q.author_id = u.id
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit.toString(), offset.toString());
        const [rows] = await pool.execute<RowDataPacket[]>(sql, queryParams);
        return rows.map(row => ({
            ...row,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
        })) as Question[];
    }

    static async getQuestionById(id: number): Promise<Question | null> {
        // Increment view count
        await pool.execute('UPDATE community_questions SET view_count = view_count + 1 WHERE id = ?', [id]);

        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT q.*, u.username as author_name, u.avatar as author_avatar
            FROM community_questions q
            LEFT JOIN users u ON q.author_id = u.id
            WHERE q.id = ?
        `, [id]);

        return (rows[0] as Question) || null;
    }

    // --- Answers ---

    static async createAnswer(answer: Answer): Promise<number> {
        const [result] = await pool.execute<any>(
            `INSERT INTO community_answers (question_id, content, author_id) VALUES (?, ?, ?)`,
            [answer.question_id, answer.content, answer.author_id]
        );
        return result.insertId;
    }

    static async getAnswersByQuestionId(questionId: number): Promise<Answer[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(`
            SELECT a.*, u.username as author_name, u.avatar as author_avatar
            FROM community_answers a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.question_id = ?
            ORDER BY a.is_accepted DESC, a.vote_count DESC, a.created_at ASC
        `, [questionId]);

        return rows as Answer[];
    }

    // --- Interactions ---

    static async toggleVote(targetType: 'question' | 'answer', targetId: number, userId: number): Promise<void> {
        // Check if vote exists
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id FROM community_interactions 
             WHERE target_type = ? AND target_id = ? AND user_id = ? AND interaction_type = 'upvote'`,
            [targetType, targetId, userId]
        );

        let adjustment = 0;

        if (rows.length > 0) {
            // Remove vote
            await pool.execute(
                `DELETE FROM community_interactions WHERE id = ?`,
                [rows[0].id]
            );
            adjustment = -1;
        } else {
            // Add vote
            await pool.execute(
                `INSERT INTO community_interactions (target_type, target_id, user_id, interaction_type) VALUES (?, ?, ?, 'upvote')`,
                [targetType, targetId, userId]
            );
            adjustment = 1;
        }

        // Update Counter
        const table = targetType === 'question' ? 'community_questions' : 'community_answers';
        await pool.execute(
            `UPDATE ${table} SET vote_count = vote_count + ? WHERE id = ?`,
            [adjustment, targetId]
        );
    }
}
