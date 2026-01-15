
import pool from '../config/database';

async function updateAuditSchema() {
    console.log('开始更新 audit_logs 表结构...');

    const queries = [
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS start_time DATETIME NULL;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS end_time DATETIME NULL;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_details TEXT NULL;"
    ];

    try {
        for (const query of queries) {
            console.log(`执行: ${query}`);
            await pool.execute(query);
        }
        console.log('audit_logs 表结构更新成功！');
    } catch (error) {
        console.error('更新表结构时出错:', error);
    } finally {
        process.exit();
    }
}

updateAuditSchema();
