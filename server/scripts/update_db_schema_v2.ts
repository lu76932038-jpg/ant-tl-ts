
import pool from '../src/config/database';

async function updateSchema() {
    try {
        console.log('开始更新数据库 Schema (V2)...');

        // Check for start_year_month column
        const [columns] = await pool.execute<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'anti' 
            AND TABLE_NAME = 'product_strategies' 
            AND COLUMN_NAME = 'start_year_month'
        `);

        if (columns.length === 0) {
            console.log('检测到 start_year_month 列不存在，正在添加...');
            await pool.execute(`
                ALTER TABLE product_strategies 
                ADD COLUMN start_year_month VARCHAR(20) DEFAULT NULL AFTER sku
            `);
            console.log('成功添加 start_year_month 列。');
        } else {
            console.log('start_year_month 列已存在，跳过添加。');
        }

        console.log('Schema V2 更新完成。');
        process.exit(0);
    } catch (error) {
        console.error('Schema V2 更新失败:', error);
        process.exit(1);
    }
}

updateSchema();
