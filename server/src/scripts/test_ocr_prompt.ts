import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// 模拟配置
const config = {
    ai: {
        aliyunUrl: process.env.ALIYUN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        aliyunKey: process.env.ALIYUN_API_KEY
    },
    proxy: process.env.HTTPS_PROXY || ''
};

async function testOCR(imagePath: string, promptType: 'old' | 'new') {
    if (!config.ai.aliyunKey) {
        console.error("Missing ALIYUN_API_KEY environment variable");
        return;
    }

    const options: any = {
        baseURL: config.ai.aliyunUrl,
        apiKey: config.ai.aliyunKey
    };

    if (config.proxy) {
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    const openai = new OpenAI(options);

    // 读取图片为 base64
    const fileData = fs.readFileSync(imagePath);
    const base64Data = fileData.toString('base64');
    const mimeType = 'image/png'; // 假设提供的是 png 或 jpg，这里仅作测试

    const oldPrompt = "请提取这张图片中的所有文字，保持原有布局和格式，直接返回提取的文本内容，不要包含其他解释性语句。";
    const newPrompt = "你是一个精确的OCR引擎。请提取图片中的所有文字。严格保留文字原貌，绝对禁止任何拼写纠正、常识补全或语义推断（例如不能将“轴”补全为“轴承”）。保持原有布局，直接返回内容。";

    const promptText = promptType === 'old' ? oldPrompt : newPrompt;

    console.log(`\n========== Testing with ${promptType.toUpperCase()} Prompt ==========`);
    console.log(`Prompt: ${promptText}\n`);

    try {
        const completion = await openai.chat.completions.create({
            model: "qwen-vl-plus",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: promptText },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:${mimeType};base64,${base64Data}`
                            }
                        }
                    ]
                }
            ] as any,
            max_tokens: 2000
        });

        const responseText = completion.choices[0].message.content || "";
        console.log("--- OCR Result ---");
        console.log(responseText);
        console.log("------------------\n");
    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

async function run() {
    // 假设图片存储在此路径
    const testImage = path.join(__dirname, 'test_ocr_input.png');

    // 如果运行时图片不存在，请在外部确保存放
    if (!fs.existsSync(testImage)) {
        console.error(`Please save the image to ${testImage} before running.`);
        return;
    }

    await testOCR(testImage, 'old');
    await testOCR(testImage, 'new');
}

run();
