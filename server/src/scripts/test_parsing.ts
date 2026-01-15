
import dotenv from 'dotenv';
import path from 'path';
import { extractDataFromContent as extractGemini } from '../services/geminiService';
import { extractDataFromContent as extractDeepSeek } from '../services/deepseekService';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SAMPLE_TEXT_1 = `
询价单
客户：上海某某机械有限公司
项目：P2025001

1. 施耐德断路器 iC65N 2P C16A, 10个
2. 接触器 LC1D18M7C, 5台, 目标价 85元
3. 欧姆龙继电器 MY2N-J DC24V, 20pcs
备注：请提供含税运价，急需现货。
`;

const SAMPLE_TEXT_2 = `
Please quote based on below requirement:
Brand: Siemens
Product: PLC Module
Model: 6ES7 214-1AG40-0XB0
Qty: 2
Target Price: 1200 RMB
Lead Time: 2 weeks
`;

async function runTest() {
    console.log("=== 开始测试询价解析 ===");
    console.log("DeepSeek Key:", process.env.DEEPSEEK_API_KEY ? "OK" : "Missing");
    console.log("Gemini Key:", process.env.GEMINI_API_KEY ? "OK" : "Missing");

    try {
        console.log("\n--- 测试用例 1 (中文混合) ---");
        console.log("输入:", SAMPLE_TEXT_1.trim());

        console.log("\n[DeepSeek 解析中...]");
        const dsResult1 = await extractDeepSeek(SAMPLE_TEXT_1);
        console.log("DeepSeek 结果:", JSON.stringify(dsResult1, null, 2));

        // Gemini 测试被注释，避免消耗过多额度或并发问题，按需开启
        // console.log("\n[Gemini 解析中...]");
        // const gmResult1 = await extractGemini(SAMPLE_TEXT_1);
        // console.log("Gemini 结果:", JSON.stringify(gmResult1, null, 2));

    } catch (error) {
        console.error("测试出错:", error);
    }

    try {
        console.log("\n--- 测试用例 2 (英文结构化) ---");
        console.log("输入:", SAMPLE_TEXT_2.trim());

        console.log("\n[DeepSeek 解析中...]");
        const dsResult2 = await extractDeepSeek(SAMPLE_TEXT_2);
        console.log("DeepSeek 结果:", JSON.stringify(dsResult2, null, 2));
    } catch (error) {
        console.error("测试出错:", error);
    }
}

runTest();
