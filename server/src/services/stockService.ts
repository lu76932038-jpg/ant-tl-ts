import { StockModel, StockStatus } from '../models/Stock';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

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

    /**
     * Re-calculate and persist status for ALL stocks.
     * Should be called after Data Sync or Strategy updates.
     */
    static async recalculateAll() {
        console.log('Starting Stock Status Recalculation...');
        const start = Date.now();

        try {
            // 1. Fetch all necessary data in bulk
            const [
                stocks,
                salesRows,
                strategyRows,
                supplierRows,
                stockingSalesRows // New: Fetch data for stocking logic
            ] = await Promise.all([
                StockModel.findAll(),
                // Sales 30 Days (Keep for turnover calculation)
                pool.execute<RowDataPacket[]>(`
                    SELECT product_model, SUM(quantity) as qty 
                    FROM shiplist 
                    WHERE outbound_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    GROUP BY product_model
                `).then(res => res[0]),
                // Safety Stock & Permissions & Stocking Config
                pool.execute<RowDataPacket[]>(`
                    SELECT 
                        sku, 
                        safety_stock_days, 
                        is_stocking_enabled,
                        stocking_period,
                        min_outbound_freq,
                        min_customer_count,
                        dead_stock_days
                    FROM product_strategies
                `).then(res => res[0]),
                // Supplier Lead Times
                pool.execute<RowDataPacket[]>(`
                    SELECT 
                        pss.sku,
                        COALESCE(spt.lead_time_days, pss.lead_time_economic, 30) as effective_lead_time
                    FROM product_supplier_strategies pss
                    LEFT JOIN supplier_price_tiers spt 
                        ON pss.id = spt.strategy_id AND spt.is_selected = 1
                    WHERE pss.is_default = 1
                `).then(res => res[0]),
                // Sales History for Stocking Rec (Last 24 Months)
                // We need raw data to calculate distincts over dynamic periods per product
                pool.execute<RowDataPacket[]>(`
                    SELECT product_model, outbound_date, outbound_id, customer_name
                    FROM shiplist 
                    WHERE outbound_date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
                `).then(res => res[0])
            ]);

            // 2. Build Maps
            const salesMap = new Map<string, number>();
            salesRows.forEach((row: any) => salesMap.set(row.product_model, Number(row.qty)));

            const strategyMap = new Map<string, any>();
            strategyRows.forEach((row: any) => strategyMap.set(row.sku, row));

            const leadTimeMap = new Map<string, number>();
            supplierRows.forEach((row: any) => leadTimeMap.set(row.sku, Number(row.effective_lead_time)));

            const stockingSalesMap = new Map<string, any[]>();
            (stockingSalesRows as any[]).forEach((row: any) => {
                if (!stockingSalesMap.has(row.product_model)) {
                    stockingSalesMap.set(row.product_model, []);
                }
                stockingSalesMap.get(row.product_model)?.push(row);
            });

            // 3. Process each stock
            const updates = [];
            for (const stock of stocks) {
                const sku = stock.sku;
                const sales30Days = salesMap.get(sku) || 0;
                const leadTime = leadTimeMap.get(sku) || 30;
                const strat = strategyMap.get(sku) || {};

                const safetyStockDaysRaw = strat.safety_stock_days;
                const safetyStockDays = safetyStockDaysRaw !== undefined ? safetyStockDaysRaw : 0.6;
                const safetyDaysObj = safetyStockDays * 30; // Approx

                const turnoverDays = StockService.calculateTurnoverDays(stock.inStock, sales30Days);
                const riskLevel = StockService.calculateRiskLevel(turnoverDays, leadTime, safetyDaysObj);

                // --- Dead Stock Logic ---
                const history = stockingSalesMap.get(sku) || [];
                const deadStockThreshold = strat.dead_stock_days || 180;

                let lastOutboundStr = null;
                if (history && history.length > 0) {
                    history.sort((a, b) => new Date(b.outbound_date).getTime() - new Date(a.outbound_date).getTime());
                    lastOutboundStr = history[0].outbound_date;
                }
                const daysSinceOutbound = lastOutboundStr
                    ? (new Date().getTime() - new Date(lastOutboundStr).getTime()) / (1000 * 3600 * 24)
                    : 9999;

                const isDeadStock = stock.inStock > 0 && daysSinceOutbound > deadStockThreshold;
                const status = StockService.mapRiskToStatus(riskLevel, isDeadStock); // Reuse map logic using Dead Stock as Stagnant check

                // --- Stocking Recommendation Logic ---
                const isStockingEnabled = strat.is_stocking_enabled === 1;

                const period = strat.stocking_period || 3;
                const minFreq = strat.min_outbound_freq || 10;
                const minCust = strat.min_customer_count || 3;

                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - period);
                const relevantRows = history.filter(r => new Date(r.outbound_date) >= cutoffDate);
                const uniqueOrders = new Set(relevantRows.map(r => r.outbound_id)).size;
                const uniqueCustomers = new Set(relevantRows.map(r => r.customer_name)).size;
                const stockingRecommendation = uniqueOrders >= minFreq && uniqueCustomers >= minCust;

                // Prepare Update
                updates.push({
                    id: stock.id,
                    status,
                    isDeadStock,
                    isStockingEnabled,
                    stockingRecommendation
                });
            }

            // 4. Batch Update (Optimized)
            // Ideally we use a transaction or a CASE WHEN statement.
            // For simplicity and safety, we can loop updates or use a bulk helper. 
            // Given 27k rows, a loop of queries might still be slow (approx 30s).
            // Better: CREATE TEMPORARY TABLE or use CASE WHEN for batches of 1000.

            // Let's do batches of 500 for now.
            const BATCH_SIZE = 500;
            for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                const batch = updates.slice(i, i + BATCH_SIZE);
                const promises = batch.map(u =>
                    pool.execute(`
                        UPDATE StockList 
                        SET status = ?, is_dead_stock = ?, is_stocking_enabled = ?, is_stocking_recommended = ?
                        WHERE id = ?
                    `, [u.status, u.isDeadStock, u.isStockingEnabled, u.stockingRecommendation, u.id])
                );
                await Promise.all(promises);
            }

            console.log(`Recalculation finished in ${(Date.now() - start) / 1000}s. Updated ${updates.length} items.`);

        } catch (error) {
            console.error('Recalculation Failed:', error);
        }
    }
}
