
import axios from 'axios';
import { config } from '../config/env';
import { CreditExternalData } from './QichachaService';

export class TianyanchaService {

    static isConfigured(): boolean {
        const { token } = config.tianyancha;
        return !!token;
    }

    /**
     * 调用天眼查企业工商信息接口
     * 接口文档参考: https://open.tianyancha.com/open/1116 (企业基本信息 2.0)
     */
    static async fetchAll(companyName: string, customerId: string): Promise<CreditExternalData> {
        if (!this.isConfigured()) {
            throw new Error('TIANYANCHA_TOKEN_NOT_CONFIGURED');
        }

        const { token, apiBase } = config.tianyancha;

        try {
            console.log(`[Tianyancha] 正在调用官方接口获取企业数据: ${companyName}...`);

            const response = await axios.get(apiBase, {
                params: { keyword: companyName.trim() },
                headers: {
                    'Authorization': token
                },
                timeout: 30000
            });

            const data = response.data;

            // 天眼查返回码 0 为成功，其它的根据文档抛出
            if (!data || data.error_code !== 0) {
                const msg = data?.reason || '天眼查接口未知错误';
                console.error(`[Tianyancha API Error] ${msg} (Code: ${data?.error_code})`);
                throw new Error(`${msg} (错误码: ${data?.error_code})`);
            }

            const result = data.result;
            if (!result) {
                console.warn(`[Tianyancha] 未查询到企业结果: ${companyName}`);
                throw new Error(`天眼查未查询到企业 [${companyName}] 的详细信息，请检查名称是否准确。`);
            }

            // 映射到统一的 CreditExternalData 格式 (增加防御性检查)
            return {
                customerId,
                lastSyncTime: new Date().toISOString(),
                businessRegistration: {
                    status: (result.regStatus === '存续' || result.regStatus === '在业') ? 'normal' : 'abnormal',
                    recentChanges: '由天眼查官方接口实时获取，状态: ' + (result.regStatus || '未知'),
                    registrationNumber: String(result.creditCode || result.regNumber || '未知'),
                    industry: String(result.industry || '未知'),
                    registCapi: String(result.regCapital || '未知').substring(0, 50), // 字符截断防止 SQL 溢出
                    bizStatus: String(result.regStatus || '未知')
                },
                judicialRisk: {
                    level: 'safe', // 2.0 基础接口不直接返回风险级别，默认为 safe 或由后续逻辑补充
                    pendingCasesCount: 0,
                    lawsuitCount: 0,
                    isDishonest: false,
                    latestCaseSummary: `${result.name || companyName} 工商状态: ${result.regStatus || '未知'}`
                },
                taxRating: {
                    grade: 'M',
                    evaluatedYear: new Date().getFullYear().toString()
                },
                penaltyAmount: '0'
            };
        } catch (err: any) {
            const errorMsg = err.response?.data?.reason || err.response?.data?.message || err.message;
            console.error('[Tianyancha Error Details]', {
                message: err.message,
                responseData: err.response?.data,
                status: err.response?.status
            });
            throw new Error(`天眼查拉取失败: ${errorMsg}`);
        }
    }
}
