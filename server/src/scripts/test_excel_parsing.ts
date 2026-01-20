import dotenv from 'dotenv';
import path from 'path';
import { extractDataFromContent as extractDeepSeek } from '../services/deepseekService';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MOCK_EXCEL_JSON = JSON.stringify([
    {
        "序号": 1,
        "品牌": "Schneider",
        "产品名称": "断路器",
        "型号": "iC65N 2P C16A",
        "数量": 10,
        "单位": "个",
        "备注": "含税"
    },
    {
        "序号": 2,
        "品牌": "Festo",
        "产品名称": "气缸",
        "型号": "DSNU-25-100-PPV-A",
        "数量": 5,
        "单位": "pcs"
    }
], null, 2);

async function runTest() {
    console.log("=== 测试 DeepSeek Excel JSON 解析 ===");
    console.log("Input Length:", MOCK_EXCEL_JSON.length);
    console.log("Input Preview:", MOCK_EXCEL_JSON.substring(0, 100));

    try {
        const result = await extractDeepSeek(MOCK_EXCEL_JSON);
        console.log("解析结果:", JSON.stringify(result, null, 2));

        if (result.data.length === 0) {
            console.error("FAIL: Result is empty");
        } else {
            console.log("SUCCESS: Parsed", result.data.length, "items");
        }
    } catch (error) {
        console.error("FAIL: Error during parsing", error);
    }
}

runTest();
