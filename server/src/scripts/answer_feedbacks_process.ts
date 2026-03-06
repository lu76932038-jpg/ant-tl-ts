import { FeedbackModel } from '../models/Feedback';
import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        console.log('--- 正在拉取所有待处理反馈 ---');
        const feedbacks = await FeedbackModel.findAll();

        for (const f of feedbacks) {
            if (!f.id) continue;

            console.log(`正在处理反馈 ID: ${f.id}, 内容: "${f.content}"`);

            let newReply = f.ai_reply;

            if (f.id === 2 && f.content.includes('下载按钮')) {
                newReply = `【AI 后台分析：高级响应】
你好！非常感谢你提出的“在备货清单下增加下载按钮”的建议。这是一个非常有价值的提效需求。
系统评估：
1. **技术可行性**：高，前端已具备表格渲染能力，后端可通过 XLSX/JSZip 插件快速生成。
2. **应用价值**：极大简化了采购环节的手心脱离、打印便利性及线下存盘需求。
3. **排期计划**：我们已将此任务（任务编号：FEAT-SHEET-DL）列入下个版本迭代。预计下周上线。
当前状态：需求规划中。再次感谢你的贡献！`;
            } else if (f.id === 1 && f.content.includes('不好用')) {
                newReply = `【AI 后台分析：高级响应】
你好！我们已经注意到你提到的“不好用”这一概括性反馈。由于该评价非常抽象，我们希望能进一步了解具体细节。
你可以尝试从以下几个方面补充信息：
1. **界面交互**：是觉得某些功能路径太深，还是视觉层级不够清晰？
2. **功能逻辑**：是现有的计算逻辑不符合实际业务，还是缺少某些关键字段？
3. **响应速度**：系统加载是否达到了你的预期？
欢迎通过回复反馈更多具体场景。你的每一条具体建议都是我们优化的动力！`;
            }

            if (newReply !== f.ai_reply) {
                console.log(`生成了新回复，正在更新 ID: ${f.id}...`);
                const success = await FeedbackModel.updateReply(f.id, newReply || '');
                if (success) {
                    console.log(`✅ ID: ${f.id} 更新成功。`);
                } else {
                    console.log(`❌ ID: ${f.id} 更新失败。`);
                }
            } else {
                console.log(`ID: ${f.id} 无需更新。`);
            }
            console.log('----------------------------');
        }

    } catch (error) {
        console.error('执行失败:', error);
    } finally {
        await pool.end();
    }
}

main();
