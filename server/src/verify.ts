// server/src/verify.ts
import pool from './config/database'; // 引入你之前的数据库配置
import { AntOrderModel } from './models/AntOrder';

async function testDatabase() {
    console.log('--- 开始数据库验证 ---');
    try {
        // 1. 验证数据库连接是否正常
        const [rows]: any = await pool.query('SELECT 1 + 1 AS result');
        console.log('✅ 数据库连接成功！计算结果:', rows[0].result);

        // 2. 验证 ant_order 表是否有数据
        console.log('--- 尝试读取 ant_order 表 ---');
        // 我们直接执行一条最简单的 SQL
        const [orders]: any = await pool.query('SELECT * FROM ant_order LIMIT 1');

        if (orders.length > 0) {
            console.log('✅ 成功读取到订单数据！');
            console.log('第一条数据详情:', orders[0]);
        } else {
            console.log('⚠️ 数据库连接通了，但 ant_order 表里目前没数据。');
        }

    } catch (error) {
        console.error('❌ 验证失败，报错信息如下:');
        console.error(error);
    } finally {
        // 强制关闭进程，防止连接池挂起
        process.exit();
    }
}

testDatabase();