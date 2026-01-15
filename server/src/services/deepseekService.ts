import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ParsedInquiryItem } from '../types';
import { normalizeInquiryData } from "../utils/inquiryUtils";
import { config } from '../config/env';
import { EXTRACT_INSTRUCTION_DEEPSEEK, SQL_INSTRUCTION, ANSWER_INSTRUCTION } from '../config/prompts';

/**
 * 将自然语言转换为针对 ant_order 表的查询 SQL (DeepSeek 版)
 */
export const generateSqlForOrdersDeepSeek = async (prompt: string): Promise<{ sql: string, debug: { prompt: string, response: string } }> => {
    if (!config.ai.deepseekKey) {
        console.warn("缺少 DEEPSEEK_API_KEY, 请在 server/.env 中配置");
        throw new Error("服务端未配置 DeepSeek API Key");
    }

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };

    if (config.proxy) {
        console.log(`[DeepSeek] Using Proxy: ${config.proxy}`);
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    // DeepSeek 使用 OpenAI 兼容 SDK
    const openai = new OpenAI(options);

    const schemaInfo = `
    表名: ant_order
    字段:
    - 订单日期 (Date)
    - 订单号 (string, 主键)
    - 产品型号 (string)
    - 产品名 (string)
    - 销售数量 (number)
    - 销售单位 (string)
    - 未税单价 (number)
    - 未税小计 (number)
    - 客户名 (string)
    - 销售员 (string)
    - 出库数量 (number)
    - 合同交期 (Date)
    `;

    const today = new Date().toISOString().split('T')[0];

    const systemInstruction = SQL_INSTRUCTION;

    console.log(`[DeepSeek SQL] Prompt: ${prompt}, Today: ${today}`);

    try {
        const messages = [
            { role: "system", content: systemInstruction },
            { role: "user", content: `将此需求转换为 SQL: ${prompt}` }
        ];

        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: "deepseek-coder", // 或者 deepseek-chat
            temperature: 0.1,
            max_tokens: 200,
        });

        const rawResponse = completion.choices[0].message.content || "";
        // 简单清理，防止 AI 返回了 markdown
        const sql = rawResponse.replace(/```sql|```/g, '').trim();
        console.log(`[DeepSeek SQL] Generated: ${sql}`);

        return {
            sql,
            debug: {
                prompt: JSON.stringify(messages, null, 2),
                response: rawResponse
            }
        };
    } catch (error) {
        console.error("DeepSeek SQL Generation Error:", error);
        throw error;
    }
};

/**
 * 从内容中提取询价数据 (DeepSeek 版)
 * 注意: 目前 DeepSeek 主要处理文本，如果遇到图片，Controller 层应已回退到 Gemini
 */
export const extractDataFromContent = async (
    content: string | { mimeType: string; data: string }
): Promise<ParsedInquiryItem[]> => {
    if (!config.ai.deepseekKey) {
        throw new Error("服务端未配置 DeepSeek API Key");
    }

    // 如果传入的是非文本内容（图片），DeepSeek 暂不处理，直接返回空或报错
    // 理论上 Controller 层已经做了 fallback，这里再次防御
    if (typeof content !== 'string') {
        console.warn("[DeepSeek]暂不支持图片分析，请检查调用逻辑");
        return [];
    }

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };

    if (config.proxy) {
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    const openai = new OpenAI(options);

    const systemInstruction = EXTRACT_INSTRUCTION_DEEPSEEK;

    // 计算 token 估算（每 4 个字符约 1 token）
    const contentStrForTokens = typeof content === 'string' ? content : JSON.stringify(content);
    const estimatedTokens = Math.ceil(contentStrForTokens.length / 4);
    const DEEPSEEK_MAX_TOKENS = 16000; // DeepSeek 输入上限约 16k tokens
    if (estimatedTokens > DEEPSEEK_MAX_TOKENS) {
        console.warn(`[DeepSeek] 内容可能超过 token 限制 (${estimatedTokens} > ${DEEPSEEK_MAX_TOKENS})，建议拆分后重试`);
    }

    // 打印请求 payload（messages）
    const messages = [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Extract data from: ${contentStrForTokens}` }
    ];
    console.log('[DeepSeek] 开始请求:', new Date().toISOString());
    // console.log('[DeepSeek] Request messages:', JSON.stringify(messages, null, 2));

    try {
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: "deepseek-chat",
            temperature: 0.1,
            response_format: { type: 'json_object' } // DeepSeek supports JSON mode
        });

        const resultText = completion.choices[0].message.content || "[]";
        // Attempt to parse JSON
        let data: any;
        try {
            // Check if result is wrapped in a key or is direct array
            const parsed = JSON.parse(resultText);
            if (Array.isArray(parsed)) {
                data = parsed;
            } else if (parsed.items && Array.isArray(parsed.items)) {
                data = parsed.items; // handle case where LLM wraps in { items: [...] }
            } else {
                // If it's a single object, wrap in array
                data = [parsed];
            }
        } catch (e) {
            console.error("DeepSeek JSON Parse Error", e);
            return [];
        }

        // Map to ParsedInquiryItem to ensure type safety
        console.log('[DeepSeek] 结束请求:', new Date().toISOString());

        return normalizeInquiryData(data);

    } catch (error) {
        console.error("DeepSeek Extraction Error:", error);
        throw error;
    }

};

/**
 * 根据查询结果生成自然语言回答 (DeepSeek 版)
 */
export const generateAnswerFromDataDeepSeek = async (originalPrompt: string, data: any[]): Promise<{ answer: string, debug: { prompt: string, response: string } }> => {
    if (!config.ai.deepseekKey) return { answer: "", debug: { prompt: "", response: "" } };

    const MAX_ITEMS = 50;
    const dataSlice = data.slice(0, MAX_ITEMS);
    const dataStr = JSON.stringify(dataSlice);
    const isTruncated = data.length > MAX_ITEMS ? `(仅展示前 ${MAX_ITEMS} 条)` : "";

    const systemInstruction = ANSWER_INSTRUCTION;

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };

    if (config.proxy) {
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    const openai = new OpenAI(options);

    try {
        const messages = [
            { role: "system", content: systemInstruction },
            { role: "user", content: `用户问题: ${originalPrompt}\n\n查询结果 ${isTruncated}: ${dataStr}\n\n请根据以上数据生成回答：` }
        ];

        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: "deepseek-chat",
            max_tokens: 500,
        });

        const answer = completion.choices[0].message.content || "";
        return {
            answer,
            debug: {
                prompt: JSON.stringify(messages, null, 2),
                response: answer
            }
        };
    } catch (error) {
        console.error("DeepSeek Answer Generation Error:", error);
        return { answer: "", debug: { prompt: "", response: "" } };
    }
};
