import { AiTaskModel } from '../models/AiTask';
import pool from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
    try {
        console.log('--- 正在拉取后台开发任务 ---');
        const tasks = await AiTaskModel.getAllTasks();

        if (tasks.length === 0) {
            console.log('目前没有开发任务记录。');

            // 准备自动创建任务
            console.log('准备针对 ID: 2 (增加下载按钮) 自动生成开发任务...');

            const newTask = {
                source_link_id: 2,
                title: '【需求实现】备货清单增加 CSV 导出功能',
                description: '用户建议在备货清单下方增加下载按钮。经评估技术可行性高，价值大。',
                plan_content: JSON.stringify({
                    steps: [
                        '1. 在 StockList.tsx 中添加导出的 UI 按钮',
                        '2. 实现前端 CSV 导出逻辑 (已完成)',
                        '3. 进行样式调整，确保移动端显示正常 (进行中)'
                    ],
                    priority: 'High',
                    eta: '2026-03-11'
                }),
                status: 'PENDING_APPROVAL' as const
            };

            const taskId = await AiTaskModel.createTask(newTask);
            console.log(`✅ 成功自动创建任务，任务 ID: ${taskId}`);

        } else {
            console.log(`共发现 ${tasks.length} 条任务。`);
            tasks.forEach(t => {
                console.log(`- [${t.status}] ID: ${t.id} Title: ${t.title}`);
            });
        }

    } catch (error) {
        console.error('执行失败:', error);
    } finally {
        await pool.end();
    }
}

main();
