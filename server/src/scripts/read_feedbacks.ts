import { FeedbackModel } from '../models/Feedback';
import pool from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
    try {
        console.log('--- 正在拉取社区反馈 ---');
        const feedbacks = await FeedbackModel.findAll();

        if (feedbacks.length === 0) {
            console.log('目前没有社区反馈。');
            return;
        }

        console.log(`共获取到 ${feedbacks.length} 条反馈。`);
        console.log('\n--- 待处理反馈详情 ---');

        feedbacks.forEach((f, index) => {
            console.log(`${index + 1}. [${f.type}] ID: ${f.id} - 状态: ${f.status}`);
            console.log(`   用户: ${f.user_id || '匿名'}`);
            console.log(`   内容: ${f.content}`);
            console.log(`   现有回复: ${f.ai_reply || '无'}`);
            console.log('----------------------------');
        });

    } catch (error) {
        console.error('执行失败:', error);
    } finally {
        await pool.end();
    }
}

main();
