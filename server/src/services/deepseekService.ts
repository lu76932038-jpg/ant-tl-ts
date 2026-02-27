import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ParsedInquiryItem } from '../types';
import { normalizeInquiryData } from "../utils/inquiryUtils";
import { config } from '../config/env';
import { EXTRACT_INSTRUCTION_DEEPSEEK, SQL_INSTRUCTION, ANSWER_INSTRUCTION, RESTORE_RAW_TABLE_INSTRUCTION } from '../config/prompts';
import { Logger } from '../utils/logger';

/**
 * 将自然语言转换为针对 ant_order 表的查询 SQL (DeepSeek 版)
 */
export const generateSqlForOrdersDeepSeek = async (prompt: string, history: { role: string, content: string }[] = []): Promise<{ sql: string, debug: { prompt: string, response: string } }> => {
    if (!config.ai.deepseekKey) {
        Logger.warn("缺少 DEEPSEEK_API_KEY, 请在 server/.env 中配置");
        throw new Error("服务端未配置 DeepSeek API Key");
    }

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };

    if (config.proxy) {
        Logger.info(`[DeepSeek] Using Proxy: ${config.proxy}`);
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    // DeepSeek 使用 OpenAI 兼容 SDK
    const openai = new OpenAI(options);

    const schemaInfo = `
    你是一个精通 MySQL 的数据分析师。请根据以下数据库 Schema 编写 SQL。
    
    【重要规则】
    1. **严禁使用** \`ant_order\` 表。所有订单相关数据必须从 \`shiplist\` (已出库/历史订单) 和 \`outbound_plan\` (未发货/计划订单) 中查询。
    2. 查询“销售额”或“历史订单”时，请查询 \`shiplist\`。
    3. 查询“未发货”、“待出库”或“计划”时，请查询 \`outbound_plan\`。
    4. 查询“客户”信息时，请查询 \`CustomerList\`。

    【表结构定义】

    【表1：库存表 (StockList)】
    - 用途：查询产品基础信息、当前库存状态。
    - 字段：
      - sku (string, 主键, 产品型号)
      - name (string, 产品名称)
      - status (string, 状态: '急需补货'|'库存预警'|'健康'|'呆滞')
      - inStock (number, 实际在库数量)
      - available (number, 可用库存数量)
      - inTransit (number, 在途数量)
      - warehouse (string, 仓库名称)
      - product_type (string, 产品分类)

    【表2：已出库清单 (shiplist)】
    - 用途：查询**已完成**的销售记录、历史订单、销售额统计。
    - 字段：
      - outbound_id (string, 出库单号)
      - product_model (string, 关联 StockList.sku)
      - product_name (string, 产品名称)
      - product_type (string, 产品分类)
      - outbound_date (Date, 发货日期)
      - quantity (number, 发货数量)
      - unit_price (number, 单价)
      - customer_name (string, 客户名称)
      - customer_code (string, 关联 CustomerList.customer_code)
      - warehouse (string, 发货仓库)

    【表3：未发货清单 (outbound_plan)】
    - 用途：查询**未完成**的订单、待发货计划。
    - 字段：
      - plan_code (string, 计划单号)
      - sku (string, 关联 StockList.sku)
      - product_name (string, 产品名称)
      - quantity (number, 计划数量)
      - customer_name (string, 客户名称)
      - planned_date (Date, 计划发货日期)
      - status (string, 状态: 'PENDING'|'COMPLETED'|'CANCELLED')
      - warehouse (string, 指定仓库)

    【表4：入库清单 (entry_list)】
    - 用途：查询采购入库记录、在途物资。
    - 字段：
      - entry_id (string, 入库单号)
      - sku (string, 关联 StockList.sku)
      - product_name (string, 产品名称)
      - quantity (number, 数量)
      - unit_price (number, 采购单价)
      - purchase_date (Date, 采购日期)
      - arrival_date (Date, 预计/实际到货日期)
      - supplier (string, 供应商名称)
      - supplier_code (string, 关联 suppliers.supplier_code)
      - status (string, 'PENDING'=待入库, 'RECEIVED'=已入库)
      - warehouse (string, 目标仓库)

    【表5：客户信息表 (CustomerList)】
    - 用途：查询客户基础信息。
    - 字段：
      - customer_code (string, 客户代码)
      - customer_name (string, 客户名称)

    【表6：供应商表 (suppliers)】
    - 用途：查询供应商基础信息。
    - 字段：
      - supplier_code (string, 供应商代码)
      - name (string, 供应商名称)
      - rating (number, 评级)
      - status (string, 状态)

    【关联关系】
    - shiplist.product_model = StockList.sku
    - outbound_plan.sku = StockList.sku
    - entry_list.sku = StockList.sku
    - shiplist.customer_code = CustomerList.customer_code
    - entry_list.supplier_code = suppliers.supplier_code
    `;

    const today = new Date().toISOString().split('T')[0];

    // 动态构建 System Prompt，将 Schema 注入
    const contextSystemInstruction = `${SQL_INSTRUCTION}
    
    ${schemaInfo}
    `;

    try {
        const messages = [
            { role: "system", content: contextSystemInstruction },
            ...history, // Inject history
            { role: "user", content: `当前日期: ${today}\n需求: ${prompt}` }
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
        Logger.info(`[DeepSeek SQL] Generated: ${sql}`);

        return {
            sql,
            debug: {
                prompt: JSON.stringify(messages, null, 2),
                response: rawResponse
            }
        };
    } catch (error) {
        Logger.error("DeepSeek SQL Generation Error:", error);
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
        Logger.warn("[DeepSeek]暂不支持图片分析，请检查调用逻辑");
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
            Logger.error("DeepSeek JSON Parse Error", e);
            parsedData = [];
        }

        Logger.info('[DeepSeek] 结束请求');

        return {
            data: normalizeInquiryData(parsedData),
            debug: {
                prompt: JSON.stringify(messages, null, 2),
                response: resultText,
                maskedContent: contentStrForTokens // 暂用原内容，如需脱敏逻辑可在此实现
            }
        };

    } catch (error) {
        Logger.error("DeepSeek Extraction Error:", error);
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
        Logger.error("DeepSeek Answer Generation Error:", error);
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
            Logger.error("DeepSeek JSON Parse Error", e);
            return [];
        }

        Logger.info(`[DeepSeek Restore] Table restored with ${data.length} rows`);
        return data;
    } catch (error) {
        Logger.error("DeepSeek Restore Error:", error);
        throw error;
    }
};
