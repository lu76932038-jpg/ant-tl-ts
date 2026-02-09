import { ProductDetailData, StrategyConfig, SupplierInfo } from '../types';

/**
 * 库存计算结果接口
 */
export interface InventoryCalculationResult {
    safetyStock: number;      // 安全库存 (SS)
    rop: number;              // 再订货点 (Reorder Point)
    restockQty: number;       // 建议补货数量
    restockCalc: string;      // 补货量计算过程

    // Intermediate Sums
    leadTimeDemand: number;
    cycleDemand: number;

    // 提示与说明 (Tip Logic)
    advice: string;           // 简短建议
    formulaExplanation: string; // 公式解释说明 (详细)

    // Debug & UI Details
    details: DailyCalculationDetail[];
    // 显示用的日期范围字符串
    ssDateWindow: string;
    leadTimeDateWindow: string;
    replenishmentDateWindow: string;
    ropDateWindow: string; // Combined range for ROP
}

export interface DailyCalculationDetail {
    date: string;
    value: number;
    type: string;
    source: 'Actual' | 'Forecast' | 'Mix';
    // Debug info
    monthTotal: number;
    weight: number;
    totalWeights: number;
    dailyForecast: number;
    dailyActual: number;
}

/**
 * 核心库存逻辑计算函数 (Restored Original Logic)
 * 
 * 恢复为原版逻辑 (Parallel/Overlapping Windows):
 * 
 * 1. [安全库存窗 (Safety Stock Window)]: Today -> Today + SS
 *    含义：从今天开始对应未来SS个月的预测总和。
 * 
 * 2. [交期消耗窗 (Lead Time Window for ROP)]: Today + SS -> Today + SS + LT
 *    含义：接在SS之后的一段时间。
 *    
 *    => ROP = Sum(Safety Stock Window) + Sum(Lead Time Window)
 *       (即覆盖 Today -> Today + SS + LT 的总需求)
 * 
 * 3. [补货周期窗 (Replenishment Cycle Window)]: Today -> Today + Cycle
 *    含义：从今天开始对应未来Cycle个月的预测总和。
 * 
 *    => Target = ROP + Sum(Replenishment Cycle Window)
 *       (注意：这里原逻辑确实是叠加的，包含了一定程度的重复覆盖，旨在保证更高的库存水位)
 */
export const calculateInventoryKPIs = (
    data: ProductDetailData | null,
    strategy: StrategyConfig | null,
    supplier: SupplierInfo | null,
    options: {
        safetyStockMonths: number;
        replenishmentCycleMonths: number;
        leadTimeDays: number; // 实际生效的 LeadTime (已考虑阶梯价)
        dayOfWeekFactors?: number[];
        dailyActualsMap: Map<string, number>;
        today?: Date; // 默认今天
    }
): InventoryCalculationResult => {
    // 0. 初始化默认返回
    const defaultResult: InventoryCalculationResult = {
        safetyStock: 0, rop: 0, restockQty: 0,
        leadTimeDemand: 0, cycleDemand: 0,
        advice: '数据不足', formulaExplanation: '', restockCalc: '', details: [],
        ssDateWindow: '', leadTimeDateWindow: '', replenishmentDateWindow: '',
        ropDateWindow: ''
    };

    if (!data) return defaultResult;

    const {
        safetyStockMonths,
        replenishmentCycleMonths,
        leadTimeDays,
        dayOfWeekFactors = [],
        dailyActualsMap,
        today = new Date()
    } = options;

    // Normalize today to 00:00:00
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    // --- Helpers ---
    const toLocalDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getMonthForecastTotal = (year: number, month: number) => {
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        return (
            strategy?.forecast_overrides?.[monthStr] ||
            strategy?.calculated_forecasts?.[monthStr] ||
            data.charts.find(c => c.month === monthStr && c.type === 'future')?.forecastQty ||
            0
        );
    };

    /**
     * 获取单日销量 (实际值 or 预测值)
     */
    const getDailyValue = (date: Date): {
        val: number,
        source: 'Actual' | 'Forecast' | 'Mix',
        monthTotal: number,
        weight: number,
        totalWeights: number,
        dailyForecast: number,
        dailyActual: number
    } => {
        const dateStr = toLocalDateString(date);
        const todayStr = toLocalDateString(todayDate);

        // 1. Calculate Daily Forecast (Seasoality Weighted)
        const y = date.getFullYear();
        const m = date.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const monthTotal = getMonthForecastTotal(y, m);

        // Calculate Weights
        let totalWeights = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const tempDate = new Date(y, m, d);
            let jsDay = tempDate.getDay(); // 0=Sun
            let idx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon...6=Sun
            totalWeights += (dayOfWeekFactors[idx] ?? 1);
        }

        let currentDayJs = date.getDay();
        let currentDayIdx = currentDayJs === 0 ? 6 : currentDayJs - 1;
        const currentDayWeight = dayOfWeekFactors[currentDayIdx] ?? 1;

        const dailyForecastRaw = totalWeights > 0
            ? (monthTotal * currentDayWeight / totalWeights)
            : (monthTotal / daysInMonth);
        const dailyForecast = Math.round(dailyForecastRaw);

        // 2. Get Actuals
        const dailyActual = dailyActualsMap.get(dateStr) ?? 0;

        // 3. Determine Value
        let resultVal = 0;
        let source: 'Actual' | 'Forecast' | 'Mix' = 'Forecast';

        if (dateStr < todayStr) {
            resultVal = dailyActual;
            source = 'Actual';
        } else if (dateStr > todayStr) {
            resultVal = dailyForecast;
            source = 'Forecast';
        } else {
            resultVal = Math.max(dailyActual, dailyForecast);
            source = 'Mix';
        }

        return {
            val: resultVal,
            source,
            monthTotal,
            weight: currentDayWeight,
            totalWeights,
            dailyForecast,
            dailyActual
        };
    };

    // --- 逻辑重构：2/5 最终业务规范 (动态周期适配) ---
    const details: DailyCalculationDetail[] = [];

    // 1. 【补货点 (ROP)】触发线计算：最小销售周期 + 货期需求
    // 第一段：采样范围 [今天, 今天 + 最小销售周期]
    const ropPart1Start = new Date(todayDate);
    const ropPart1End = new Date(ropPart1Start);
    ropPart1End.setMonth(ropPart1End.getMonth() + safetyStockMonths);

    let ropPart1DemandSum = 0;
    let ropIter1 = new Date(ropPart1Start);
    while (ropIter1 < ropPart1End) {
        const fullDetail = getDailyValue(ropIter1);
        ropPart1DemandSum += fullDetail.val;
        details.push({
            date: toLocalDateString(ropIter1),
            value: fullDetail.val,
            type: '补货点(第一段:最小销售周期)',
            source: fullDetail.source,
            monthTotal: fullDetail.monthTotal,
            weight: fullDetail.weight,
            totalWeights: fullDetail.totalWeights,
            dailyForecast: fullDetail.dailyForecast,
            dailyActual: fullDetail.dailyActual
        });
        ropIter1.setDate(ropIter1.getDate() + 1);
    }

    // 第二段：采样范围 [接上述周期后, + 货期天数]
    const ropPart2Start = new Date(ropPart1End);
    const ropPart2End = new Date(ropPart2Start);
    ropPart2End.setDate(ropPart2End.getDate() + leadTimeDays);

    let leadTimeDemandSum = 0;
    let ropIter2 = new Date(ropPart2Start);
    while (ropIter2 < ropPart2End) {
        const fullDetail = getDailyValue(ropIter2);
        leadTimeDemandSum += fullDetail.val;
        details.push({
            date: toLocalDateString(ropIter2),
            value: fullDetail.val,
            type: '补货点(第二段:货期需求)',
            source: fullDetail.source,
            monthTotal: fullDetail.monthTotal,
            weight: fullDetail.weight,
            totalWeights: fullDetail.totalWeights,
            dailyForecast: fullDetail.dailyForecast,
            dailyActual: fullDetail.dailyActual
        });
        ropIter2.setDate(ropIter2.getDate() + 1);
    }

    // 2. 【安全库存 (SS)】采样周期：最小销售周期
    const safetyStock = Math.round(ropPart1DemandSum);

    // 3. 【补货目标量】采样周期：动态设置的补货销售周期
    // 计算范围 [今天, 今天 + replenishmentCycleMonths]
    const targetStartDate = new Date(todayDate);
    const targetEndDate = new Date(targetStartDate);
    targetEndDate.setMonth(targetEndDate.getMonth() + replenishmentCycleMonths);

    let targetCycleDemandSum = 0;
    let targetIter = new Date(targetStartDate);
    while (targetIter < targetEndDate) {
        const fullDetail = getDailyValue(targetIter);
        targetCycleDemandSum += fullDetail.val;
        targetIter.setDate(targetIter.getDate() + 1);
    }

    // --- 汇总计算 ---
    const leadTimeDemand = Math.round(leadTimeDemandSum);
    const replenishmentCycleDemand = Math.round(targetCycleDemandSum); // 动态补货销售周期总需求

    // 补货点 (触发线) = 最小销售周期需求 + 货期需求
    const replenishmentPoint = Math.max(0, safetyStock + leadTimeDemand);

    const fmtRange = (start: Date, end: Date) => {
        if (start.getTime() >= end.getTime()) return '无';
        const lastDay = new Date(end.getTime() - 86400000);
        return `${toLocalDateString(start)} ~ ${toLocalDateString(lastDay)}`;
    };

    const ssDateWindowStr = fmtRange(targetStartDate, targetEndDate); // 补货销售周期
    const stDateWindowStr = fmtRange(ropPart1Start, ropPart1End); // 最小周期 (SS)

    // 详细解释逻辑
    let formulaExplanation = `📦 备货逻辑推算 (2/5 最终修正版):\n\n`;

    formulaExplanation += `🛡️ 安全库存 (SS): ${safetyStock}\n`;
    formulaExplanation += `   📅 采样周期 (最小销售周期): ${stDateWindowStr}\n\n`;

    formulaExplanation += `🚩 补货点 (ROP): ${replenishmentPoint}\n`;
    formulaExplanation += `   1️⃣ 最小周期需求: ${safetyStock}\n`;
    formulaExplanation += `   2️⃣ 货期需求: ${leadTimeDemand}\n`;
    formulaExplanation += `   📅 触发线覆盖周期: ${fmtRange(ropPart1Start, ropPart2End)}\n\n`;

    formulaExplanation += `🎯 补货目标量 (补货销售周期需求): ${replenishmentCycleDemand}\n`;
    formulaExplanation += `   📅 目标覆盖范围 (系统设置): ${ssDateWindowStr}\n\n`;

    const backlogQty = data.kpi.backlog_qty || 0;
    const currentInStock = data.kpi.inStock || 0;
    const currentInTransit = data.kpi.inTransit || 0;
    const currentTotal = currentInStock + currentInTransit;

    formulaExplanation += `当前实物状况:\n`;
    formulaExplanation += `   - 在库库存: ${currentInStock}\n`;
    formulaExplanation += `   - 在途数量: ${currentInTransit}\n`;
    formulaExplanation += `   - 积压欠单: ${backlogQty}\n`;
    formulaExplanation += `   - 当前拥有总计: ${currentInStock}\n\n`; // 注意：这里按照逻辑，“当前拥有”通常指实物。用户公式里也是分开减。

    const moq = supplier?.minOrderQty || 1;
    const orderUnit = supplier?.orderUnitQty || 1;
    let restockQty = 0;
    let advice = '';
    let restockCalc = '';

    // 触发判断：当前拥有量 < (补货点 + 积压欠单)
    const triggerThreshold = replenishmentPoint + backlogQty;

    if (currentTotal < triggerThreshold) {
        // 核心公式升级：建议补货量 = (补货点 + 补货销售周期需求 + 积压欠单) - 在库库存 - 在途数量
        // 这样可以确保补货后，库存水平始终维持在【触发点之上】一个完整的补货周期需求
        const rawGap = Math.max(0, (replenishmentPoint + replenishmentCycleDemand + backlogQty) - currentInStock - currentInTransit);

        let qty = Math.max(rawGap, moq);
        if (orderUnit > 1) {
            qty = Math.ceil(qty / orderUnit) * orderUnit;
        }

        restockQty = qty;
        advice = `⚠️ 需补货: 建议下单 ${restockQty} ${data.basic.unit || 'PCS'}`;
        restockCalc = `触发: 当前拥有(${currentInStock}) < 触发阈值(${triggerThreshold})\n`;
        restockCalc += `公式: 建议补货量 = (补货点 + 补货销售周期需求 + 积压欠单) - 当前拥有 - 在途数量\n`;
        restockCalc += `(${replenishmentPoint} + ${replenishmentCycleDemand} + ${backlogQty}) - ${currentInStock} - ${currentInTransit} = ${rawGap}\n`;
        if (moq > 1 && moq > rawGap) restockCalc += `应用最小起订量: ${moq}\n`;
        if (orderUnit > 1) restockCalc += `应用下单倍数: ${orderUnit}\n`;
        restockCalc += `最终结果: ${restockQty}`;
        formulaExplanation += `❌ 触发预警! 建议补足至覆盖【补货点 + 未来 ${replenishmentCycleMonths} 个月需求】。`;
    } else {
        restockQty = 0;
        advice = `✅ 库存充足`;
        restockCalc = `当前拥有总计(${currentTotal}) 已覆盖触发阈值(${triggerThreshold})。`;
        formulaExplanation += `✅ 库存安全，处于触发点之上。`;
    }

    return {
        safetyStock,
        rop: replenishmentPoint,
        restockQty,
        leadTimeDemand,
        cycleDemand: replenishmentCycleDemand,
        advice,
        formulaExplanation,
        restockCalc,
        details,
        ssDateWindow: stDateWindowStr,
        leadTimeDateWindow: fmtRange(ropPart1End, ropPart2End),
        replenishmentDateWindow: ssDateWindowStr,
        ropDateWindow: fmtRange(ropPart1Start, ropPart2End)
    };
};
