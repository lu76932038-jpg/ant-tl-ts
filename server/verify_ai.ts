
import { QichachaService } from './src/services/QichachaService';
import { config } from './src/config/env';

async function verifyAI() {
    console.log("🔍 正在验证后端 QichachaService (AI Mode)...");
    
    if (!QichachaService.isConfigured()) {
        console.error("❌ 错误: 环境变量未正确加载，请检查 .env。");
        return;
    }

    try {
        console.log("🚀 正在请求 Sub2API 联网分析 [宏达科技]...");
        const data = await QichachaService.fetchAll("宏达科技股份有限公司", "CUST-TEST");
        
        console.log("✅ 测试成功！收到 AI 返回数据：");
        console.log(JSON.stringify(data, null, 2));
    } catch (error: any) {
        console.error("❌ 测试失败！");
        console.error("原因:", error.message);
    }
}

verifyAI();
