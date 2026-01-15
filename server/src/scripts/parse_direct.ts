import { extractDataFromContent as extractGemini } from '../services/geminiService';
import { extractDataFromContent as extractDeepSeek } from '../services/deepseekService';

// 简单命令行参数: node parse_direct.js "<content>" [model]
// model 可选值: 'gemini' | 'deepseek'，默认 deepseek

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: npx ts-node ./src/scripts/parse_direct.ts "<content>" [model]');
    process.exit(1);
}

const content = args[0];
const model = args[1] ? args[1].toLowerCase() : 'deepseek';

(async () => {
    try {
        const items = model === 'gemini' ? await extractGemini(content) : await extractDeepSeek(content);
        console.log('=== 解析结果 ===');
        console.log(JSON.stringify(items, null, 2));
    } catch (err) {
        console.error('解析出错:', err);
        process.exit(1);
    }
})();
