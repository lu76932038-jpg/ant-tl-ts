import { FeedbackModel } from '../models/Feedback';
import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        const feedbackId = 2; // "能不能备货清单下面 增加一个 下载按钮"

        const newReply = `【AI 指导与反馈：高级响应】
你好！很高兴为你解答。关于你提到的“增加下载按钮”的建议，其实我们的系统**已经支持**该功能了！

**操作步骤：**
1. 进入【备货清单】页面。
2. 在页面右上角，你会发现一个“下载(↓)”图标按钮。
3. 点击该按钮，即可选择导出的字段并下载为 CSV 文件。

**系统优化建议：**
我们意识到目前的图标按钮可能不够显眼，导致部分用户（如您）难以发现。
**计划：** 我们已经将该按钮升级为更清晰的“导出数据”文字按钮，并在本版本中立即生效。

感谢你的反馈！如果在使用中还有任何疑问，欢迎随时提问。`;

        console.log(`正在更新反馈 ID: ${feedbackId} 的深度回复...`);
        const success = await FeedbackModel.updateReply(feedbackId, newReply);
        if (success) {
            console.log(`✅ ID: ${feedbackId} 更新成功。`);
        } else {
            console.log(`❌ ID: ${feedbackId} 更新失败。`);
        }

    } catch (error) {
        console.error('执行失败:', error);
    } finally {
        await pool.end();
    }
}

main();
