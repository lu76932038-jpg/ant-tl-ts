import { Request, Response } from 'express';
import { AntOrderModel } from '../models/AntOrder';
import { AiChatLogModel } from '../models/AiChatLog';
import { generateSqlForOrdersDeepSeek, generateAnswerFromDataDeepSeek } from '../services/deepseekService';
import { AiChatSessionModel } from '../models/AiChatSession';

/**
 * 根据订单号查询订单详情
 */
export const getOrderByNo = async (req: Request, res: Response) => {
    try {
        const { orderNo } = req.params;
        if (!orderNo) {
            return res.status(400).json({ success: false, message: '缺少订单号参数' });
        }
        const order = await AntOrderModel.findByOrderNo(orderNo);
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('查询订单失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

/**
 * 获取销售员业绩汇总
 */
export const getSalesSummary = async (req: Request, res: Response) => {
    try {
        const summary = await AntOrderModel.getSalesSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('获取销售汇总失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

/**
 * AI 对话查询订单（接收自然语言，生成并执行 SQL）
 */
export const chatWithOrders = async (req: Request, res: Response) => {
    try {
        const { message, model, sessionId } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: '缺少 message 参数' });
        }

        // 0. 获取会话历史 (如果有 sessionId)
        let historyMessages: any[] = [];
        if (sessionId) {
            const historyLogs = await AiChatLogModel.findBySessionId(sessionId);
            // Limit to last 10 interactions to avoid token overflow
            const recentLogs = historyLogs.slice(-5);
            historyMessages = recentLogs.flatMap(log => [
                { role: 'user', content: log.user_query },
                { role: 'assistant', content: log.final_answer } // DeepSeek calls it 'assistant'
            ]);

            // Update session timestamp
            await AiChatSessionModel.updateTimestamp(sessionId);
        }

        // 1. 强制使用 DeepSeek 服务生成 SQL (带历史上下文)
        let sql = "";
        let debugInfo = {};

        // Pass history to service
        const result = await generateSqlForOrdersDeepSeek(message, historyMessages);
        sql = result.sql;
        debugInfo = result.debug;

        if (!sql) {
            return res.json({
                success: true,
                data: [],
                message: '无法解析您的需求为查询指令，请换种说法。'
            });
        }

        // 2. 简单安全检查：仅允许 SELECT
        if (!sql.trim().toLowerCase().startsWith('select')) {
            return res.status(400).json({ success: false, message: '生成的 SQL 包含不安全指令' });
        }

        // 3. 执行 SQL 并返回结果
        const queryResult = await AntOrderModel.executeAiQuery(sql);

        // 4. 调用 AI 根据数据生成回答
        let answer = "";
        try {
            const resultCombined = await generateAnswerFromDataDeepSeek(message, queryResult);
            answer = resultCombined.answer;
            // Merge debug info
            if (resultCombined.debug) {
                (debugInfo as any).answerGen = resultCombined.debug;
            }
        } catch (aiError) {
            console.error("生成回答失败，仅返回数据:", aiError);
        }

        // 5. 异步记录日志
        let logId: number | undefined;
        try {
            // 构造 Prompt 摘要
            const promptUsed = JSON.stringify(debugInfo, null, 2);

            // 构造执行结果摘要 (仅记录行数或前几条，避免过大)
            const resultSummary = `Row count: ${queryResult.length}. Sample: ${JSON.stringify(queryResult.slice(0, 3))}`;

            logId = await AiChatLogModel.create({
                session_id: sessionId || null,
                user_query: message,
                prompt_used: promptUsed,
                sql_generated: sql,
                sql_execution_result: resultSummary,
                ai_reasoning: "",
                final_answer: answer
            });
        } catch (logError) {
            console.error("记录 AI 日志失败:", logError);
            // 日志失败不影响主流程
        }

        res.json({
            success: true,
            data: queryResult,
            sql: sql,
            debug: debugInfo,
            message: answer, // 将生成的回答放入 message 字段
            logId: logId
        });
    } catch (error) {
        console.error('AI 对话查询失败:', error);
        // 区分错误类型
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        if (errorMessage.includes('Key')) {
            return res.status(500).json({ success: false, message: `AI 配置错误: ${errorMessage}` });
        }
        res.status(500).json({ success: false, message: 'AI 处理异常，请重试' });
    }
};

/**
 * AI 对话查询订单（直接接收 SQL）
 * 注意：建议前端通过 chat 接口发送自然语言
 */
export const queryOrderAI = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, message: '缺少 query 参数' });
        }
        // 简单安全检查：仅允许 SELECT 开头的查询
        const trimmed = query.trim().toLowerCase();
        if (!trimmed.startsWith('select')) {
            return res.status(400).json({ success: false, message: '仅支持 SELECT 查询' });
        }
        const result = await AntOrderModel.executeAiQuery(query);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('AI 查询订单失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};
