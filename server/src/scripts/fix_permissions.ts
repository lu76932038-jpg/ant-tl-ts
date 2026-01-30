/**
 * Task 48 权限修复脚本
 * 将 lujiaqi (id=2) 添加到所有产品的 authorized_viewer_ids
 */
import pool from '../config/database';

async function fixPermissions() {
    console.log('=== Task 48 权限修复脚本 ===\n');

    try {
        // 1. 查询当前状态
        const [before] = await pool.execute(
            'SELECT COUNT(*) as total FROM product_strategies'
        );
        console.log('产品策略总数:', (before as any)[0].total);

        // 2. 修复所有产品的 authorized_viewer_ids
        // 如果为空或 null，设置为 [2]（lujiaqi 的 id）
        const [result] = await pool.execute(`
            UPDATE product_strategies 
            SET authorized_viewer_ids = JSON_ARRAY(2) 
            WHERE authorized_viewer_ids IS NULL 
               OR JSON_LENGTH(authorized_viewer_ids) = 0
        `);
        console.log('\n已更新行数:', (result as any).affectedRows);

        // 3. 验证修复结果
        const [after] = await pool.execute(
            'SELECT sku, authorized_viewer_ids FROM product_strategies LIMIT 10'
        );
        console.log('\n=== 修复后验证（前10条） ===');
        (after as any[]).forEach((row: any) => {
            console.log(`  ${row.sku}: ${JSON.stringify(row.authorized_viewer_ids)}`);
        });

        console.log('\n✅ 权限修复完成！lujiaqi (id=2) 现在可以看到所有产品。');

    } catch (error) {
        console.error('修复失败:', error);
    } finally {
        process.exit(0);
    }
}

fixPermissions();
