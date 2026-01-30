/**
 * 数据库迁移：为供应商策略表添加 MOQ 和订货单位字段
 */
import pool from '../config/database';

async function migrate() {
    console.log('=== 数据库迁移：增加 MOQ 和订货单位字段 ===\n');

    try {
        // 添加 min_order_qty 字段
        try {
            await pool.execute('ALTER TABLE product_supplier_strategies ADD COLUMN min_order_qty INT DEFAULT 1');
            console.log('✅ 已添加 min_order_qty 字段');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ min_order_qty 字段已存在');
            } else {
                console.log('⚠️ min_order_qty:', e.message);
            }
        }

        // 添加 order_unit_qty 字段
        try {
            await pool.execute('ALTER TABLE product_supplier_strategies ADD COLUMN order_unit_qty INT DEFAULT 1');
            console.log('✅ 已添加 order_unit_qty 字段');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ order_unit_qty 字段已存在');
            } else {
                console.log('⚠️ order_unit_qty:', e.message);
            }
        }

        console.log('\n迁移完成!');
    } catch (error) {
        console.error('迁移失败:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
