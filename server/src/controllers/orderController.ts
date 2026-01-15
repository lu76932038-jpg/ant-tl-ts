import { Request, Response } from 'express';
import { AntOrderModel } from '../models/AntOrder';
import { generateSqlForOrders } from '../services/geminiService';

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
        const { message, model } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: '缺少 message 参数' });
        }

        // 1. 根据模型选择调用不同的服务生成 SQL
        // 1. 根据模型选择调用不同的服务生成 SQL
        let sql = "";
        let debugInfo = {};

        if (model === 'deepseek') {
            // 动态导入以避免循环依赖或未使用错误 (如果有)
            const { generateSqlForOrdersDeepSeek } = await import('../services/deepseekService');
            const result = await generateSqlForOrdersDeepSeek(message);
            sql = result.sql;
            debugInfo = result.debug;
        } else {
            // 默认使用 Gemini
            const { generateSqlForOrders } = await import('../services/geminiService');
            const result = await generateSqlForOrders(message);
            sql = result.sql;
            debugInfo = result.debug;
        }

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
        const result = await AntOrderModel.executeAiQuery(sql);

        // 4. (New) 再次调用 AI 根据数据生成回答
        let answer = "";
        try {
            if (model === 'deepseek') {
                const { generateAnswerFromDataDeepSeek } = await import('../services/deepseekService');
                const resultCombined = await generateAnswerFromDataDeepSeek(message, result);
                answer = resultCombined.answer;
                // Merge debug info
                if (resultCombined.debug) {
                    (debugInfo as any).answerGen = resultCombined.debug;
                }
            } else {
                const { generateAnswerFromData } = await import('../services/geminiService');
                const resultCombined = await generateAnswerFromData(message, result);
                answer = resultCombined.answer;
                if (resultCombined.debug) {
                    (debugInfo as any).answerGen = resultCombined.debug;
                }
            }
        } catch (aiError) {
            console.error("生成回答失败，仅返回数据:", aiError);
        }

        res.json({
            success: true,
            data: result,
            sql: sql,
            debug: debugInfo,
            message: answer // 将生成的回答放入 message 字段
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
