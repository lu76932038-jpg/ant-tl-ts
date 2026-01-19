
import { GoogleGenAI, Type } from "@google/genai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";
import { AIResponseItem, ParsedInquiryItem } from "../types";
import { config } from "../config/env";
import { EXTRACT_INSTRUCTION_GEMINI, SQL_INSTRUCTION, ANSWER_INSTRUCTION } from "../config/prompts";
import { GEMINI_SCHEMA } from "../config/schema";
import { normalizeInquiryData } from "../utils/inquiryUtils";

// Schema definition moved to ../config/schema


/**
 * 专门用于从图片中提取纯文本 (OCR)，不进行结构化解析
 */
export const extractTextFromImage = async (
    content: { mimeType: string; data: string }
): Promise<string> => {
    if (!config.ai.geminiKey) throw new Error("缺少 API Key");

    const API_KEY = config.ai.geminiKey;
    const MODEL = config.ai.geminiModel;
    const URL = `${config.ai.geminiUrl}/models/${MODEL}:generateContent?key=${API_KEY}`;

    const parts = [
        { inlineData: { mimeType: content.mimeType, data: content.data } },
        { text: "Transcribe all text from this image. Do not structure it, just return the raw text." }
    ];

    const body = {
        contents: [{ parts }]
    };

    const options: any = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: config.upload.timeoutMs
    };

    if (config.proxy) {
        options.agent = new HttpsProxyAgent(config.proxy);
    }

    try {
        console.log(`[Gemini OCR] Transcribing text from image...`);
        const response = await nodeFetch(URL, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini OCR Error ${response.status}: ${errorText}`);
        }

        const data: any = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return responseText || "";

    } catch (error) {
        console.error("Gemini OCR Error:", error);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("Gemini OCR Request Timed Out");
        }
        // Improve error message for fetch failures
        if ((error as any).code === 'ECONNRESET' || (error as any).message?.includes('fetch')) {
            throw new Error(`Gemini OCR Network Error: ${(error as any).message}`);
        }
        throw error;
    }
};

export const extractDataFromContent = async (
    content: string | { mimeType: string; data: string }
): Promise<ParsedInquiryItem[]> => {
    if (!config.ai.geminiKey) throw new Error("缺少 API Key");

    const API_KEY = config.ai.geminiKey;
    const MODEL = config.ai.geminiModel;
    const URL = `${config.ai.geminiUrl}/models/${MODEL}:generateContent?key=${API_KEY}`;

    const systemInstruction = EXTRACT_INSTRUCTION_GEMINI;

    // Construct payload
    const parts = typeof content === 'string'
        ? [{ text: `Extract inquiry data from this text:\n\n${content}` }]
        : [
            { inlineData: { mimeType: content.mimeType, data: content.data } },
            { text: "Extract inquiry data from this document/image. Merge any unidentifiable data into remarks." }
        ];

    // 简单的 token 估算（每 4 个字符约 1 token）
    const contentStrForTokens = typeof content === 'string' ? content : JSON.stringify(content);
    const estimatedTokens = Math.ceil(contentStrForTokens.length / 4);
    const GEMINI_MAX_TOKENS = 2000000; // 实际上 Gemini 支持极大 token，这里仅作示例
    if (estimatedTokens > GEMINI_MAX_TOKENS) {
        console.warn(`[Gemini] 内容可能超过 token 限制 (${estimatedTokens} > ${GEMINI_MAX_TOKENS})，建议拆分后重试`);
    }

    const body = {
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_SCHEMA
        }
    };

    // Prepare Fetch Options with Proxy
    const options: any = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: config.upload.timeoutMs // Apply explicit timeout
    };

    if (config.proxy) {
        console.log(`[Gemini REST] Using Proxy: ${config.proxy}`);
        options.agent = new HttpsProxyAgent(config.proxy);
    }

    try {
        console.log(`[Gemini REST] Sending request to ${MODEL}...`);
        // console.log('[Gemini REST] Request body:', JSON.stringify(body, null, 2));
        const response = await nodeFetch(URL, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
        }

        const data: any = await response.json();

        // Parse candidates
        const candidate = data.candidates?.[0];

        if (candidate?.finishReason === 'SAFETY') {
            throw new Error('AI 解析被安全策略拦截。');
        }

        const responseText = candidate?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error(`AI 未返回数据 (原因: ${candidate?.finishReason || '未知'})`);
        }

        try {
            const rawData = JSON.parse(responseText) as AIResponseItem[];
            return normalizeInquiryData(rawData);
        } catch (parseError) {
            throw new Error("AI 返回数据格式异常。");
        }

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw error;
    }
};

/**
 * 将自然语言转换为针对 ant_order 表的查询 SQL
 */
export const generateSqlForOrders = async (prompt: string): Promise<{ sql: string, debug: { prompt: string, response: string } }> => {
    if (!config.ai.geminiKey) throw new Error("缺少 API Key");

    const geminiOptions: any = { apiKey: config.ai.geminiKey };
    if (config.proxy) {
        const agent = new HttpsProxyAgent(config.proxy);
        geminiOptions.fetch = (url: string, init?: any) => nodeFetch(url, { ...init, agent });
    }
    const ai = new GoogleGenAI(geminiOptions);

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

    console.log(`[Gemini SQL] Prompt: ${prompt}, Today: ${today}`);

    try {
        const userPart = { text: `将此需求转换为 SQL: ${prompt}` };
        const response = await ai.models.generateContent({
            model: config.ai.geminiModel,
            contents: [{ parts: [userPart] }],
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 200,
                temperature: 0.1,
            },
        });

        const rawResponse = response.text || "";
        // 简单清理，防止 AI 返回了 markdown
        const sql = rawResponse.replace(/```sql|```/g, '').trim();
        console.log(`[Gemini SQL] Generated: ${sql}`);

        return {
            sql,
            debug: {
                prompt: JSON.stringify({ system: systemInstruction, user: userPart }, null, 2),
                response: rawResponse
            }
        };
    } catch (error) {
        console.error("Gemini SQL Generation Error:", error);
        throw error;
    }
};



/**
 * 根据查询结果生成自然语言回答
 */
export const generateAnswerFromData = async (originalPrompt: string, data: any[]): Promise<{ answer: string, debug: { prompt: string, response: string } }> => {
    if (!config.ai.geminiKey) return { answer: "", debug: { prompt: "", response: "" } };

    // 数据过多时进行截断，防止 token 溢出
    const MAX_ITEMS = 50;
    const dataSlice = data.slice(0, MAX_ITEMS);
    const dataStr = JSON.stringify(dataSlice);
    const isTruncated = data.length > MAX_ITEMS ? `(仅展示前 ${MAX_ITEMS} 条)` : "";

    const systemInstruction = ANSWER_INSTRUCTION;

    const geminiOptions: any = { apiKey: config.ai.geminiKey };
    if (config.proxy) {
        const agent = new HttpsProxyAgent(config.proxy);
        geminiOptions.fetch = (url: string, init?: any) => nodeFetch(url, { ...init, agent });
    }
    const ai = new GoogleGenAI(geminiOptions);

    try {
        const userPart = {
            text: `用户问题: ${originalPrompt}\n\n查询结果 ${isTruncated}: ${dataStr}\n\n请根据以上数据生成回答：`
        };
        const response = await ai.models.generateContent({
            model: config.ai.geminiModel,
            contents: [{
                parts: [userPart]
            }],
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 500,
            },
        });

        const answer = response.text || "";
        return {
            answer,
            debug: {
                prompt: JSON.stringify({ system: systemInstruction, user: userPart }, null, 2),
                response: answer
            }
        };
    } catch (error) {
        console.error("Gemini Answer Generation Error:", error);
        return { answer: "", debug: { prompt: "", response: "" } };
    }
};
