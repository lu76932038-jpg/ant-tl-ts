import { AiTaskModel } from '../models/AiTask';
import pool from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
    try {
        console.log('--- 正在执行任务同步 ---');
        const tasks = await AiTaskModel.getAllTasks();

        // 检查是否已存在下载按钮相关的任务
        const hasDownloadTask = tasks.some(t => t.title.includes('下载按钮') || t.source_link_id === 2);

        if (!hasDownloadTask) {
            console.log('检测到“下载按钮”需求尚未建立后台任务，正在自动创建...');

            const newTask = {
                source_link_id: 2,
                title: '【需求实现】备货清单增加导出功能',
                description: '用户建议在备货清单下方增加下载按钮。经评估该功能已初步实现 UI 升级，需正式入库管理。',
                plan_content: JSON.stringify({
                    steps: [
                        '1. 诊断现有下载逻辑是否满足用户需求 (DONE)',
                        '2. 优化下载按钮发现性，将图标升级为文字按钮 (DONE)',
                        '3. 支持更多导出格式如 XLSX (PLANNED)',
                        '4. 增加导出日志记录功能 (PLANNED)'
                    ],
                    priority: 'High',
                    category: 'FEATURE',
                    proposed_by: 'Community User (Feedback ID: 2)',
                    eta: '2026-03-10'
                }),
                status: 'PENDING_APPROVAL' as const
            };

            const taskId = await AiTaskModel.createTask(newTask);
            console.log(`✅ 成功创建任务，任务 ID: ${taskId}`);
        } else {
            console.log('“下载按钮”相关任务已存在，无需重复增加。');
        }

        console.log('\n当前所有后台任务：');
        const finalTasks = await AiTaskModel.getAllTasks();
        finalTasks.forEach(t => {
            console.log(`- [${t.status}] ID: ${t.id} - ${t.title}`);
        });

    } catch (error) {
        console.error('执行失败:', error);
    } finally {
        await pool.end();
    }
}

main();
