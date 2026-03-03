
import { Request, Response } from 'express';
import { CustomerCreditRiskModel } from '../models/CustomerCreditRisk';
import { QichachaService } from '../services/QichachaService';
import { TianyanchaService } from '../services/TianyanchaService';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import OpenAI from 'openai';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

export class CustomerCreditRiskController {
    static async getList(req: Request, res: Response) {
        try {
            // 移除自动同步：await CustomerCreditRiskModel.syncWithCustomerList();
            const list = await CustomerCreditRiskModel.findAllWithCustomerInfo();
            res.json(list);
        } catch (error: any) {
            console.error('Error fetching credit risk list:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async getStats(req: Request, res: Response) {
        try {
            const stats = await CustomerCreditRiskModel.getGlobalStats();
            res.json(stats);
        } catch (error: any) {
            console.error('Error fetching credit risk stats:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async getDetail(req: Request, res: Response) {
        try {
            const { code } = req.params;
            // 实时汇总内部交易数据
            await CustomerCreditRiskModel.recalculateInternalMetrics(code);

            const detail: any = await CustomerCreditRiskModel.findByCustomerCode(code);
            if (!detail) {
                return res.status(404).json({ message: 'Credit risk record not found' });
            }

            // 动态生成待办事项
            const todoList: any[] = [];

            if (!detail.external_sync_time) {
                todoList.push({ label: '同步实时企业征信', color: 'rose', type: 'critical' });
            } else {
                const syncDays = (Date.now() - new Date(detail.external_sync_time).getTime()) / (1000 * 60 * 60 * 24);
                if (syncDays > 30) {
                    todoList.push({ label: '征信快照已过期', color: 'orange', type: 'warning' });
                }
            }

            if (detail.overdue_amount > 0) {
                todoList.push({ label: `跟进逾期账款 (¥${(detail.overdue_amount / 10000).toFixed(1)}万)`, color: 'rose', type: 'critical' });
            }

            if (detail.revenue_ttm === 0) {
                todoList.push({ label: '核实业务合作现状', color: 'indigo', type: 'info' });
            }

            if (!detail.last_evaluation_date) {
                todoList.push({ label: '缺失初始信用评估', color: 'orange', type: 'warning' });
            }

            if (todoList.length === 0) {
                todoList.push({ label: '定期维护信用档案', color: 'emerald', type: 'info' });
            }

            detail.todo_list = todoList;

            // 获取过去 12 个月的月度销售额
            const monthlySales = await CustomerCreditRiskModel.getMonthlySalesRolling12Months(code);
            detail.monthly_sales = monthlySales;

            res.json(detail);
        } catch (error: any) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async updateRisk(req: Request, res: Response) {
        try {
            const riskData = req.body;
            if (!riskData.customer_code) {
                return res.status(400).json({ message: 'customer_code is required' });
            }
            await CustomerCreditRiskModel.upsert(riskData);
            res.json({ message: 'Credit risk updated successfully' });
        } catch (error: any) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async sync(req: Request, res: Response) {
        try {
            const affected = await CustomerCreditRiskModel.syncWithCustomerList();
            res.json({ message: 'Sync completed', affectedRows: affected });
        } catch (error: any) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async getUnassigned(req: Request, res: Response) {
        try {
            const { search } = req.query;
            const list = await CustomerCreditRiskModel.getUnassignedCustomers(search as string);
            res.json(list);
        } catch (error: any) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    static async addCustomers(req: Request, res: Response) {
        try {
            const { codes } = req.body;
            if (!Array.isArray(codes) || codes.length === 0) {
                return res.status(400).json({ message: 'codes array is required' });
            }
            const affected = await CustomerCreditRiskModel.addCustomers(codes);
            res.json({ message: `Successfully added ${affected} customers`, affectedRows: affected });
        } catch (error: any) {
            console.error('Error adding customers to credit risk:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    /**
     * 获取客户的企查查外部信用数据
     * 策略：默认优先返回本地最近一次同步的数据快照。
     * 只有在本地为空或显式要求强制刷新时，才穿透请求至外部 API。
     */
    static async getExternalRisk(req: Request, res: Response) {
        const { customerCode } = req.params;
        const source = (req.query.source as string) || 'qichacha';
        const force = req.query.force === 'true';

        try {
            // 1. 尝试从本地缓存读取（有效期放宽至 1 年，即“有历史数据就先用着”）
            const cachedData = await CustomerCreditRiskModel.getExternalData(customerCode, 365 * 24);
            if (cachedData && !force) {
                return res.json({ ...cachedData, source: `${source}_cached` });
            }

            // 实时检查对应 Service 是否已配置
            if (source === 'tianyancha') {
                if (!TianyanchaService.isConfigured()) {
                    return res.status(503).json({ message: '天眼查 TOKEN 未配置' });
                }
            } else {
                if (!QichachaService.isConfigured()) {
                    return res.status(503).json({ message: '企查查(SUB2API) 密鑰未配置' });
                }
            }

            // 查询该客户的公司名称
            const [rows] = await pool.execute<RowDataPacket[]>(
                'SELECT c.customer_name FROM customerlist c WHERE c.customer_code = ?',
                [customerCode]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: '客户信息不存在' });
            }
            const companyName = rows[0].customer_name;

            // 根据 source 调用不同服务
            let freshData;
            if (source === 'tianyancha') {
                freshData = await TianyanchaService.fetchAll(companyName, customerCode);
            } else {
                freshData = await QichachaService.fetchAll(companyName, customerCode);
            }

            // 同步更新本地数据库作为备份
            CustomerCreditRiskModel.saveExternalData(customerCode, freshData).catch(
                (err) => console.error('[getExternalRisk] 备份落库失败:', err.message)
            );

            return res.json({ ...freshData, source: `${source}_realtime` });
        } catch (error: any) {
            console.error(`[getExternalRisk] ${source} 抓取失败:`, error.message);

            // 报错时尝试最后一次兜底：返回所有历史数据（不管多老）
            const lastResort = await CustomerCreditRiskModel.getExternalData(customerCode, 365 * 24 * 10);
            if (lastResort) {
                console.log(`[getExternalRisk] 已使用极旧缓存作为 ${customerCode} 的异常兜底`);
                return res.json({ ...lastResort, source: 'fallback_error_cache' });
            }

            res.status(500).json({ message: `实时征信(${source})拉取失败`, error: error.message });
        }
    }

    /**
     * 手动强制刷新企查查数据（跳过缓存直接拉取）
     */
    static async refreshExternalRisk(req: Request, res: Response) {
        const { customerCode } = req.params;
        const { source = 'qichacha' } = req.body;

        try {
            Logger.info(`[refreshExternalRisk] 手动刷新请求 - 客户: ${customerCode}, 来源: ${source}`);

            if (source === 'tianyancha') {
                if (!TianyanchaService.isConfigured()) {
                    return res.status(503).json({ message: '天眼查 TOKEN 未配置，请检查环境变量' });
                }
            } else {
                if (!QichachaService.isConfigured()) {
                    return res.status(503).json({ message: '企查查(SUB2API) 暂时不可用，请切换至天眼查刷新' });
                }
            }

            const [rows] = await pool.execute<RowDataPacket[]>(
                'SELECT c.customer_name FROM customerlist c WHERE c.customer_code = ?',
                [customerCode]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: '客户信息不存在，无法获取公司名称' });
            }
            const companyName = rows[0].customer_name;
            if (!companyName) {
                return res.status(400).json({ message: '客户公司名称为空，无法查询征信' });
            }

            let freshData;
            if (source === 'tianyancha') {
                freshData = await TianyanchaService.fetchAll(companyName, customerCode);
            } else {
                freshData = await QichachaService.fetchAll(companyName, customerCode);
            }

            // 更新本地缓存
            await CustomerCreditRiskModel.saveExternalData(customerCode, freshData);

            Logger.info(`[refreshExternalRisk] 刷新成功: ${companyName}`);
            return res.json({ ...freshData, source: `${source}_refreshed` });
        } catch (error: any) {
            Logger.error(`[refreshExternalRisk] ${source} 失败 - 详情:`, error);
            res.status(500).json({
                message: `强制刷新(${source})失败: ${error.message}`,
                error: error.stack // 将堆栈通过 JSON 返回，便于调试界面查阅
            });
        }
    }

    /**
     * DeepSeek AI 信用分析：传入内部财务数据 + 外部征信数据 + 自定义 Prompt
     * 返回结构化 JSON 报告
     */
    static async analyzeWithAI(req: Request, res: Response) {
        const { internalData, externalData, customPrompt, customerCode, customerName } = req.body;

        if (!config.ai.deepseekKey) {
            return res.status(503).json({ message: '服务端未配置 DEEPSEEK_API_KEY' });
        }
        if (!internalData) {
            return res.status(400).json({ message: 'internalData 是必填项' });
        }

        const openai = new OpenAI({
            baseURL: config.ai.deepseekUrl,
            apiKey: config.ai.deepseekKey,
        });

        const targetCompany = customerName || customerCode || '该受评企业';

        const defaultSystemPrompt = `【角色设定】
你是一位拥有 20 年经验的资深 B2B 工业级企业风控与信用评估专家。你需要根据提供的客户多维数据（外部工商/司法数据 + 内部历史交易数据），客观、严谨地评估该客户的信用等级，并给出建议的授信额度。

【输入数据】
1. 客户基本信息

客户名称：{{客户名称}}

所属行业：{{行业分类}}

注册资本：{{注册资本_万元}} 万元

经营状态：{{当前经营状态}}

2. 外部风险数据 (API 拉取)

近三年司法诉讼次数：{{司法诉讼次数}} 次

被执行人/失信记录：{{失信记录状态_有无}}

行政处罚金额：{{行政处罚累计_万元}} 万元

3. 内部交易履约数据 (ERP/业务系统抽取)
（注：如果以下内部数据项值为“暂无数据”，说明系统内确实无此类发生记录，请照此作为评估事实，无需自行虚构或去外部搜索内部营业秘密数据。）

历史合作时长：{{合作月数}} 个月

近 12 个月累计交易额：{{近一年交易额_万元}} 万元

历史平均回款天数 (DSO)：{{平均回款天数}} 天

历史逾期支付次数：{{历史逾期次数}} 次

当前最高单次交易额：{{最高单次交易额_万元}} 万元

【信息核对与搜索指令】
对于以上 1 和 2 项涉及的内容（属于公开信息与外部风险数据），如果提供的数据项中出现“暂无数据”、“未知”或缺失，请你利用搜索引擎或自身知识库再次确认该企业的最新相关情况。如果有更新或获取到了数据，请保留原有信息并结合你的搜索结果合并记录下来。
此外，你必须通过全网搜索，获取该企业【最近一个月内】发生的最重要、最具影响力的三件事（例如：融资、高管变动、重大合作、新品发布、负面舆情、处罚等），并在结果中返回。如果近期实在没有足以当作重要事件的新闻，可以通过搜索返回该企业相对近期的最重要动向。
对于第 3 项内部交易履约数据，请完全采信输入的信息，不作任何外部搜索或篡改。

【评估规则与红线】

一票否决（红线）： 若【被执行人/失信记录】为“有”，或【经营状态】异常（注销、吊销），必须直接评定为 D 级，且建议授信额度必须为 0。

内部数据优先： 在无外部致命风险的前提下，历史合作越久、交易额越大、且 DSO 越稳定（如小于 60 天），信用评级应越高。

额度测算逻辑： 基础建议授信额度不应超过【近 12 个月累计交易额】的 30%。若存在逾期记录，需在此基础上按比例下调额度。

【输出格式要求】
请你严格按照以下 JSON 格式输出结果，不要包含任何多余的 Markdown 标记或解释性文字，以便系统直接解析。
强烈要求：必须在 thinking_process 字段中完整输出你的思考逻辑、计算过程以及对缺失数据的检索确认结果。

{
  "customer_name": "{{客户名称}}",
  "recommended_level": "A/B/C/D 其中的一个",
  "recommended_credit_limit_cny": 建议金额数字,
  "risk_tags": ["风险标签1", "优势标签2", "提取的关键词"],
  "verified_data": {
    "public_and_risk_info": [
      {"label": "记录项名称(如所属行业)", "original": "原始输入的值", "ai_verified": "AI 搜索确认或更新的值(若无更新写无)"}
    ],
    "internal_info": [
      {"label": "记录项名称(如历史合作时长)", "value": "原始输入的值"}
    ]
  },
  "recent_important_events": [
    "近一个月重要事件1简述", 
    "近一个月重要事件2简述", 
    "近一个月重要事件3简述"
  ],
  "decision_reasoning": "由于需要展示你的推演思路，请将原本的结论提取浓缩至此，控制在 50 字以内的终局结论。",
  "thinking_process": "请在这里详细写出你对提供的各项数据（基本信息、外部风险、内部履约）的分析过程。如果有缺失项目，请说明你的搜索尝试和结果。详细描述你最终得出评级和额度的核心计算与支撑理由，字数不限，越详细专业越好。"
}`;

        let systemPrompt = customPrompt || defaultSystemPrompt;

        const ext = externalData || {};
        const intl = internalData || {};

        const dataMap: Record<string, string | number> = {
            '客户名称': targetCompany,
            '行业分类': ext.industry || intl.industry || '未知',
            '注册资本_万元': ext.registCapi ? (parseFloat(ext.registCapi) / 10000).toFixed(2) : '未知',
            '当前经营状态': ext.status || '未知',
            '司法诉讼次数': ext.lawsuitCount !== undefined && ext.lawsuitCount !== null && ext.lawsuitCount !== '' ? ext.lawsuitCount : '未知',
            '失信记录状态_有无': ext.isDishonest !== undefined ? (ext.isDishonest ? '有' : '无') : '未知',
            '行政处罚累计_万元': ext.penaltyAmount !== undefined && ext.penaltyAmount !== null && ext.penaltyAmount !== '' ? ext.penaltyAmount : '未知',
            '合作月数': intl.cooperation_months ? intl.cooperation_months : '暂无数据',
            '近一年交易额_万元': intl.revenue_ttm ? (intl.revenue_ttm / 10000).toFixed(2) : '暂无数据',
            '平均回款天数': intl.dso ? intl.dso : '暂无数据',
            '历史逾期次数': intl.overdue_times !== undefined ? intl.overdue_times : (intl.overdue > 0 ? 1 : '暂无数据'),
            '最高单次交易额_万元': intl.max_single_trade ? intl.max_single_trade : '暂无数据',
        };

        for (const [key, value] of Object.entries(dataMap)) {
            systemPrompt = systemPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }

        const userContent = `分析对象：${targetCompany}
项目编码：${customerCode || 'N/A'}

请仔细阅读 System Prompt 中已经动态注入的当前客户真实数据，并严格按照规则要求，直接返回符合格式的 JSON 结果。`;

        const startTime = Date.now();
        try {
            const completion = await openai.chat.completions.create({
                model: 'deepseek-chat',
                temperature: 0.1,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
            });

            const resultText = completion.choices[0].message.content || '{}';
            const elapsedMs = Date.now() - startTime;

            let parsed: any;
            try {
                parsed = JSON.parse(resultText);
                parsed.processing_time_ms = elapsedMs;
                parsed.applied_prompt = systemPrompt; // 将实际应用的提示词回传，用于透明化展示
            } catch {
                Logger.error('[CreditAI] JSON parse failed:', resultText);
                return res.status(500).json({ message: 'AI 返回格式异常，请重试' });
            }

            // 异步落库分析历史记录
            if (customerCode) {
                CustomerCreditRiskModel.saveAiHistory({
                    customer_code: customerCode,
                    customer_name: targetCompany,
                    applied_prompt: systemPrompt,
                    reasoning_path: parsed.thinking_process || parsed.decision_reasoning || '无',
                    analysis_result: parsed
                }).catch(err => {
                    Logger.error('[CreditAI] 保存历史记录失败:', err.message);
                });
            }

            Logger.info(`[CreditAI] 分析完成，客户: ${targetCompany}, 耗时: ${elapsedMs}ms`);
            return res.json(parsed);
        } catch (error: any) {
            Logger.error('[CreditAI] DeepSeek 调用失败:', error.message);
            res.status(500).json({ message: 'AI 分析失败，请稍后重试', error: error.message });
        }
    }

    /**
     * 获取客户的信用 AI 分析历史记录
     */
    static async getAiHistory(req: Request, res: Response) {
        try {
            const { customerCode } = req.params;
            const history = await CustomerCreditRiskModel.getAiHistoryByCode(customerCode);
            res.json(history);
        } catch (error: any) {
            Logger.error('[CreditAI] 获取历史记录失败:', error.message);
            res.status(500).json({ message: '获取历史记录失败', error: error.message });
        }
    }

    /**
     * 外部征信抓取实时测试：模拟天眼查或企查查流程
     */
    static async testSub2Api(req: Request, res: Response) {
        const { companyName, source = 'tianyancha' } = req.body;
        if (!companyName) {
            return res.status(400).json({ message: 'companyName is required' });
        }

        try {
            Logger.info(`[External API Test] Source: ${source}, Company: ${companyName}`);

            let result;
            if (source === 'tianyancha') {
                if (!TianyanchaService.isConfigured()) {
                    return res.status(503).json({ message: '天眼查 TOKEN 未配置' });
                }
                result = await TianyanchaService.fetchAll(companyName, `TEST_${Date.now()}`);
            } else {
                if (!QichachaService.isConfigured()) {
                    return res.status(503).json({ message: '企查查(SUB2API) 暂时不可用，请使用天眼查测试' });
                }
                result = await QichachaService.fetchAll(companyName, `TEST_${Date.now()}`);
            }

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                companyName: companyName,
                source: source,
                data: result
            });
        } catch (error: any) {
            Logger.error(`[External API Test] Failed (${source}): ${error.message}`);
            res.status(500).json({
                success: false,
                message: '抓取模拟失败',
                error: error.message
            });
        }
    }
}
