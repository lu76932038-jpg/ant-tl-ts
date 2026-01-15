import fs from 'fs';
import path from 'path';

// 基础敏感词库 (可扩展)
const SENSITIVE_WORDS = ['涉黄', '违法', '禁药', '赌博', '诈骗'];

/**
 * 脱敏服务，处理公司名、姓名、电话等信息
 */
export class SecurityService {
    /**
     * 检查是否包含敏感违规词
     */
    static checkSensitiveContent(text: string): { isSafe: boolean; foundWords: string[] } {
        const foundWords = SENSITIVE_WORDS.filter(word => text.includes(word));
        return {
            isSafe: foundWords.length === 0,
            foundWords
        };
    }

    /**
     * 脱敏逻辑：屏蔽公司名、姓名、电话
     */
    static maskSensitiveData(text: string): string {
        let maskedText = text;

        // 1. 屏蔽电话 (手机号 + 固定电话)
        // 手机号: 1[3-9]\d{9}
        // 座机: 0\d{2,3}-?\d{7,8}
        const phoneRegex = /(1[3-9]\d{9})|(0\d{2,3}-?\d{7,8})/g;
        maskedText = maskedText.replace(phoneRegex, '[REDACTED_PHONE]');

        // 2. 屏蔽公司名
        // 简单识别：包含“公司”、“厂”、“部”、“中心”等关键字的词组
        // 这里使用一个较宽泛的匹配，生产环境建议结合 NLP
        const companyRegex = /([^\s\n,，:：]{2,}(?:有限公司|无限公司|股份公司|工厂|加工厂|经营部|服务中心|集团))/g;
        maskedText = maskedText.replace(companyRegex, '[REDACTED_COMPANY]');

        // 3. 屏蔽姓名 (中文常见格式：姓+先生/女士，或2-3字中文)
        // 识别“联系人：XXX” 或 “收货人：XXX” 等模式
        const nameKeywords = /(联系人|收货人|负责人|经理|先生|女士)[:：\s]?([\u4e00-\u9fa5]{2,3})/g;
        maskedText = maskedText.replace(nameKeywords, (match, p1, p2) => {
            return `${p1}: [REDACTED_NAME]`;
        });

        return maskedText;
    }
}
