
import pool from '../config/database';

async function updateAuditSchema() {
    console.log('开始更新 audit_logs 表结构 (v3)...');

    const columns = [
        { name: 'start_time', type: 'DATETIME NULL' },
        { name: 'end_time', type: 'DATETIME NULL' },
        { name: 'error_details', type: 'TEXT NULL' }
    ];

    for (const col of columns) {
        try {
            console.log(`尝试添加列: ${col.name}`);
            const query = `ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type};`;
            await pool.execute(query);
            console.log(`列 ${col.name} 添加成功`);
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`列 ${col.name} 已存在，跳过`);
            } else {
                console.error(`添加列 ${col.name} 失败:`, error);
            }
        }
    }

    console.log('表结构更新过程完成。');
    process.exit();
}

updateAuditSchema();
