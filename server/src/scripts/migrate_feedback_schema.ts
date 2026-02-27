
import pool from '../config/database';

const migrate = async () => {
    try {
        console.log('Starting Feedback Loop migration...');

        const columns = [
            'ADD COLUMN feedback_score INT DEFAULT 0 COMMENT "1: like, -1: dislike, 0: none"',
            'ADD COLUMN feedback_text TEXT NULL COMMENT "User feedback reason"',
            'ADD COLUMN corrected_answer TEXT NULL COMMENT "User provided correct answer for training"'
        ];

        console.log('Adding feedback columns to ai_chat_logs...');

        for (const col of columns) {
            try {
                // MySQL doesn't support IF NOT EXISTS for ADD COLUMN directly in all versions, 
                // so we wrap in try/catch or just let it fail if exists.
                // However, a cleaner way is to check information_schema, but for this simplified environment:
                await pool.execute(`ALTER TABLE ai_chat_logs ${col}`);
                console.log(`Executed: ${col}`);
            } catch (error: any) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column exists, skipping: ${col}`);
                } else {
                    console.error(`Failed to add column: ${col}`, error);
                }
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
