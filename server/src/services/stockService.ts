import { StockStatus } from '../models/Stock';

export class StockService {
    /**
     * 计算周转天数
     */
    static calculateTurnoverDays(inStock: number, sales30Days: number): number {
        const avgDailySales = sales30Days / 30;
        if (avgDailySales <= 0) return 999; // 无销量，周转天数视为无限
        return Math.round(inStock / avgDailySales);
    }

    /**
     * 计算缺货风险等级
     * 逻辑：
     * 高风险 (Critical): 周转天数 < 交期
     * 中风险 (Warning): 周转天数 < (交期 + 安全库存天数)
     * 低风险 (Healthy): 其他
     */
    static calculateRiskLevel(turnoverDays: number, leadTime: number, safetyStockDays: number): '高' | '中' | '低' {
        if (turnoverDays < leadTime) {
            return '高';
        }
        if (turnoverDays < (leadTime + safetyStockDays)) {
            return '中';
        }
        return '低';
    }

    /**
     * 将风险等级映射到 StockStatus 枚举
     * @param riskLevel '高' | '中' | '低'
     * @param isStagnant 是否呆滞 (外部判断，通常基于 90天无销量等规则)
     */
    static mapRiskToStatus(riskLevel: '高' | '中' | '低', isStagnant: boolean = false): StockStatus {
        if (isStagnant) {
            return StockStatus.STAGNANT;
        }

        switch (riskLevel) {
            case '高':
                return StockStatus.CRITICAL;
            case '中':
                return StockStatus.WARNING;
            case '低':
            default:
                return StockStatus.HEALTHY;
        }
    }
}
