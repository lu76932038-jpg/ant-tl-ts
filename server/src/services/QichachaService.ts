
import axios from 'axios';
import { config } from '../config/env';

export interface CreditExternalData {
    customerId: string;
    lastSyncTime: string;
    businessRegistration: {
        status: 'normal' | 'abnormal';
        recentChanges: string;
        registrationNumber: string;
        industry?: string;
        registCapi?: string;
        bizStatus?: string;
    };
    judicialRisk: {
        level: 'safe' | 'warning' | 'danger';
        pendingCasesCount: number;
        lawsuitCount?: number;
        isDishonest?: boolean;
        latestCaseSummary: string;
    };
    taxRating: {
        grade: 'A' | 'B' | 'M' | 'C' | 'D';
        evaluatedYear: string;
    };
    penaltyAmount?: string;
}

export class QichachaService {

    static isConfigured(): boolean {
        // [用户指令 2026-03-02]: 企查查暂时禁用，待用户提供全新密鑰后恢复。
        return false;
        // const { key } = config.sub2api;
        // return !!(key && key.startsWith('sk-'));
    }

    /**
     * SUB2API 增强抓取模式：使用 DeepSeek-Spark 引擎进行深度联网校对
     */
    static async fetchAll(companyName: string, customerId: string): Promise<CreditExternalData> {
        if (!this.isConfigured()) {
            throw new Error('SUB2API_NOT_CONFIGURED');
        }

        const { key, baseUrl } = config.sub2api;

        const prompt = `【最高指令】：你是一个具备深度联网核查能力的企业征信专家。
当前任务：请精准抓取【${companyName}】的最实时工商详情及司法风险。

【抓取核实规则】：
1. 注册资本：必须获取最新的【认缴注册资本】。请深度穿透企查查或国家企业信用信息公示系统网页。
2. 统一代码：获取 18 位社会统一信用代码。
3. 经营状态：确认为存续、在业、注销或异常。
4. 司法风险：合计该主体的被执行人信息、失信记录及开庭公告次数。
5. 金额处理：资本和处罚金额统一折算为“万元人民币”，仅返回数字。

返回格式要求：必须返回 JSON 格式。如果你确实无法搜索到该企业信息，请在 json 中说明。
{
  "businessRegistration": {
    "status": "normal/abnormal",
    "recentChanges": "最新工商变更记录快照，如未找到请写'未找到实时变更记录'",
    "registrationNumber": "社会统一信用代码",
    "industry": "行业",
    "registCapi": "数字",
    "bizStatus": "存续/在业/其它"
  },
  "judicialRisk": {
    "level": "safe/warning/danger",
    "pendingCasesCount": 0,
    "lawsuitCount": 0,
    "isDishonest": false,
    "latestCaseSummary": "司法情况摘要"
  },
  "taxRating": { "grade": "评估等级", "evaluatedYear": "2024" },
  "penaltyAmount": "数字"
}`;

        try {
            console.log(`[SUB2API Realtime] 正在深度检索企业数据: ${companyName}...`);

            const requestPayload = {
                model: "gpt-5.3-codex-spark",
                instructions: "你是一个专业的金融风控抓取插件。请忽略过时的新闻稿，以工商节点展示的最新认缴资本为唯一准则。",
                input: prompt,
                temperature: 0.1
            };

            const response = await axios.post(`${baseUrl}/responses`, requestPayload, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                timeout: 95000
            });

            const content = response.data?.output?.[0]?.content?.[0]?.text || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : content;
            const result = JSON.parse(cleanJson);

            return {
                customerId,
                lastSyncTime: new Date().toISOString(),
                rawResponse: content, // 透传原始报文用于调试
                appliedPrompt: prompt, // 透传发给 AI 的完整指令原件
                requestPayload: requestPayload, // 透传原始请求 Payload
                ...result
            };
        } catch (err: any) {
            console.error('[SUB2API Error]', err.response?.data || err.message);
            throw new Error(`数据抓取异常: ${err.message}`);
        }
    }
}
