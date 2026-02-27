
import pool from '../config/database';

const migrate = async () => {
    try {
        console.log('Starting Evaluation Schema migration...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ai_chat_evaluations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                log_id INT NOT NULL,
                score INT DEFAULT 0 COMMENT '0-100 quality score',
                issues JSON NULL COMMENT 'Array of issue tags',
                suggestion TEXT NULL COMMENT 'Text suggestion for improvement',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_log_id (log_id),
                FOREIGN KEY (log_id) REFERENCES ai_chat_logs(id) ON DELETE CASCADE
            )
        `;

        await pool.execute(createTableQuery);
        console.log('Created ai_chat_evaluations table.');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
