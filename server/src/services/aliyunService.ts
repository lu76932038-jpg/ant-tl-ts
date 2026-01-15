import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '../config/env';

/**
 * 使用阿里云 Qwen-VL 提取图片文本 (OCR)
 * 兼容 OpenAI SDK 格式
 */
export const extractTextFromImageAliyun = async (
    content: { mimeType: string; data: string }
): Promise<string> => {
    if (!config.ai.aliyunKey) throw new Error("缺少 Aliyun API Key");

    const options: any = {
        baseURL: config.ai.aliyunUrl,
        apiKey: config.ai.aliyunKey
    };

    if (config.proxy) {
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    const openai = new OpenAI(options);

    try {
        console.log(`[Aliyun OCR] 调用开始`);
        console.log(`[Aliyun OCR] MimeType: ${content.mimeType}`);
        console.log(`[Aliyun OCR] Data Length: ${content.data.length}`);
        console.log(`[Aliyun OCR] Data Preview: ${content.data.substring(0, 50)}...`);

        const completion = await openai.chat.completions.create({
            model: "qwen-vl-plus", // 或 qwen-vl-max
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "请提取这张图片中的所有文字，保持原有布局和格式，直接返回提取的文本内容，不要包含其他解释性语句。" },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:${content.mimeType};base64,${content.data}`
                            }
                        }
                    ]
                }
            ] as any,
            max_tokens: 2000
        });

        const responseText = completion.choices[0].message.content || "";
        console.log(`[Aliyun OCR] 调用结束`);
        return responseText;

    } catch (error) {
        console.error("Aliyun OCR Error:", error);
        if (error instanceof Error) {
            throw new Error(`Aliyun OCR Error: ${error.message}`);
        }
        throw error;
    }
};
