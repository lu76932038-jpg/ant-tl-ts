import pool from '../config/database';

export interface AuditLog {
  id?: number;
  user_id: number;
  action: string;
  file_name?: string;
  raw_content_preview: string;
  masked_content_preview: string;
  ai_model: string;
  status: 'success' | 'failed' | 'blocked';
  error_message?: string;
  created_at?: Date;
  start_time?: Date | null;
  end_time?: Date | null;
  error_details?: string | null;
}

export class AuditLogModel {
  static async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        file_name VARCHAR(255),
        raw_content_preview TEXT,
        masked_content_preview TEXT,
        ai_model VARCHAR(50),
        status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
        error_message TEXT,
        error_details TEXT,
        start_time DATETIME,
        end_time DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(query);
  }

  static async create(log: AuditLog) {
    const query = `
      INSERT INTO audit_logs 
      (user_id, action, file_name, raw_content_preview, masked_content_preview, ai_model, status, error_message, start_time, end_time, error_details) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      log.user_id,
      log.action,
      log.file_name || null,
      log.raw_content_preview || null,
      log.masked_content_preview || null,
      log.ai_model || null,
      log.status,
      log.error_message || null,
      log.start_time || null,
      log.end_time || null,
      log.error_details || null
    ]);
    return result;
  }

  static async findAll(userId?: number) {
    let query = 'SELECT al.*, u.username FROM audit_logs al JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC';
    const params: any[] = [];

    if (userId) {
      query = 'SELECT al.*, u.username FROM audit_logs al JOIN users u ON al.user_id = u.id WHERE al.user_id = ? ORDER BY al.created_at DESC';
      params.push(userId);
    }

    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
}
