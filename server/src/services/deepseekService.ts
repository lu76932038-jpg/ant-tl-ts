import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ParsedInquiryItem } from '../types';
import { normalizeInquiryData } from "../utils/inquiryUtils";
import { config } from '../config/env';
import { EXTRACT_INSTRUCTION_DEEPSEEK, SQL_INSTRUCTION, ANSWER_INSTRUCTION, RESTORE_RAW_TABLE_INSTRUCTION } from '../config/prompts';

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
): Promise<{ data: ParsedInquiryItem[], debug: { prompt: string, response: string, maskedContent?: string } }> => {
    if (!config.ai.deepseekKey) {
        throw new Error("服务端未配置 DeepSeek API Key");
    }

    if (typeof content !== 'string') {
        console.warn("[DeepSeek]暂不支持图片分析，请检查调用逻辑");
        return { data: [], debug: { prompt: "", response: "" } };
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
    const contentStrForTokens = content;

    // 构造请求消息
    const messages = [
        { role: "system", content: systemInstruction },
        { role: "user", content: `请将以下询价内容转换为 JSON 数组格式返回：\n\n${contentStrForTokens}` }
    ];

    try {
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: "deepseek-chat",
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const resultText = completion.choices[0].message.content || "[]";
        let parsedData: any;
        try {
            const parsed = JSON.parse(resultText);
            if (Array.isArray(parsed)) {
                parsedData = parsed;
            } else if (parsed.items && Array.isArray(parsed.items)) {
                parsedData = parsed.items;
            } else {
                parsedData = [parsed];
            }
        } catch (e) {
            console.error("DeepSeek JSON Parse Error", e);
            parsedData = [];
        }

        console.log('[DeepSeek] 结束请求:', new Date().toISOString());

        return {
            data: normalizeInquiryData(parsedData),
            debug: {
                prompt: JSON.stringify(messages, null, 2),
                response: resultText,
                maskedContent: contentStrForTokens // 暂用原内容，如需脱敏逻辑可在此实现
            }
        };

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

/**
 * 从文本中还原原始表格结构 (DeepSeek 版)
 */
export const restoreRawTable = async (content: string): Promise<any[]> => {
    if (!config.ai.deepseekKey) throw new Error("缺少 API Key");

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };
    if (config.proxy) options.httpAgent = new HttpsProxyAgent(config.proxy);

    const openai = new OpenAI(options);

    const messages = [
        { role: "system", content: RESTORE_RAW_TABLE_INSTRUCTION },
        { role: "user", content: `请将以下文本还原为原始表格结构：\n\n${content}` }
    ];

    try {
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: "deepseek-chat",
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const resultText = completion.choices[0].message.content || "[]";
        let data: any;
        try {
            const parsed = JSON.parse(resultText);
            data = Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);
        } catch (e) {
            console.error("DeepSeek JSON Parse Error", e);
            return [];
        }

        console.log(`[DeepSeek Restore] Table restored with ${data.length} rows`);
        return data;
    } catch (error) {
        console.error("DeepSeek Restore Error:", error);
        throw error;
    }
};
