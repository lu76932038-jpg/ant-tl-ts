import pool from '../config/database';
import { FavoriteModel } from '../models/Stock';

async function testFavoriteLogic() {
    try {
        console.log('--- Starting Deep Verification of Favorite Logic ---');
        const userId = 1; // 假设测试用户 ID
        const testSku = 'SKU-102938'; // 使用 INITIAL_STOCK_DATA 中存在的 SKU

        // 1. 清理数据 (确保环境干净)
        await pool.execute('DELETE FROM UserFavoriteStock WHERE user_id = ?', [userId]);
        console.log('1. Cleanup: OK');

        // 2. 模拟收藏操作
        await FavoriteModel.toggleFavorite(userId, testSku);
        console.log(`2. Toggle (Add) SKU ${testSku}: OK`);

        // 3. 验证获取列表
        const favorites = await FavoriteModel.getFavoritedSkus(userId);
        console.log('3. Fetch List:', favorites);
        if (favorites.includes(testSku)) {
            console.log('   Verification: SKU found in favorites. PASSED.');
        } else {
            console.error('   Verification: SKU NOT FOUND! FAILED.');
        }

        // 4. 测试再次切换 (删除)
        await FavoriteModel.toggleFavorite(userId, testSku);
        const favoritesAfterDelete = await FavoriteModel.getFavoritedSkus(userId);
        if (!favoritesAfterDelete.includes(testSku)) {
            console.log('4. Toggle (Remove): OK. PASSED.');
        } else {
            console.error('4. Toggle (Remove): SKU still exists! FAILED.');
        }

        console.log('--- Verification Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('--- Verification Failed with Error ---', error);
        process.exit(1);
    }
}

testFavoriteLogic();
