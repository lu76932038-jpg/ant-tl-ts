import cron from 'node-cron';
import { StrategyModel, ProductStrategy } from '../models/Strategy';
import { StockModel } from '../models/Stock';
import { EntryListModel } from '../models/EntryList';
import { PurchaseOrderModel } from '../models/PurchaseOrder';

export class SchedulerService {
    static init() {
        // Schedule: Every minute
        cron.schedule('* * * * *', async () => {
            await SchedulerService.runAutoReplenishment();
        });
        console.log('Scheduler Service initialized (every minute).');
    }

    static async runAutoReplenishment() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeHHMM = `${hh}:${mm}`;

        try {
            const candidates = await StrategyModel.findAutoReplenishmentCandidates(timeHHMM);
            if (candidates.length > 0) {
                console.log(`[Scheduler] Found ${candidates.length} candidates for auto-replenishment at ${timeHHMM}`);
                for (const strategy of candidates) {
                    await SchedulerService.processProduct(strategy);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Error running auto-replenishment:', error);
        }
    }

    static async processProduct(strategy: ProductStrategy) {
        try {
            const sku = strategy.sku;
            // 1. Get Stock Profile
            const stockItems = await StockModel.findAll();
            const product = stockItems.find(p => p.sku === sku);
            if (!product) return;

            const inStock = product.inStock;

            // 2. Get In Transit
            const pendingEntries = await EntryListModel.findPendingEntries(sku);
            const inTransit = pendingEntries.reduce((sum, e) => sum + e.quantity, 0);

            // 3. Get Forecast for Current Month
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            let monthlyForecast = 0;
            let forecasts: Record<string, number> = {};

            if (typeof strategy.calculated_forecasts === 'string') {
                try { forecasts = JSON.parse(strategy.calculated_forecasts); } catch { }
            } else if (strategy.calculated_forecasts) {
                forecasts = strategy.calculated_forecasts;
            }

            if (forecasts[monthKey]) {
                monthlyForecast = forecasts[monthKey];
            } else {
                // Return if no forecast, as we can't calculate ROP safely
                return;
            }

            // 4. Calculate Dynamic ROP
            const dailySales = monthlyForecast / 30;
            const leadTime = (strategy.replenishment_mode === 'fast' ? 7 : 30);

            const dynamicSafetyStock = dailySales * 30 * strategy.safety_stock_days;
            const dynamicRop = dynamicSafetyStock + (dailySales * leadTime);

            const effectiveStock = inStock + inTransit;

            // 5. Check Trigger
            if (effectiveStock < dynamicRop && monthlyForecast > 0) {
                // Trigger!
                // Calculate Target Level (ROP + 15days Buffer or 1.5x ROP)
                const targetLevel = Math.max(dynamicRop * 1.5, dynamicRop + (dailySales * 15));
                let needed = targetLevel - effectiveStock;
                let orderQty = Math.max(needed, strategy.eoq || 0);
                orderQty = Math.ceil(orderQty / 100) * 100; // Round to 100

                if (orderQty > 0) {
                    // Create PO
                    let supplierInfo: any = {};
                    try {
                        supplierInfo = strategy.supplier_info ?
                            (typeof strategy.supplier_info === 'string' ? JSON.parse(strategy.supplier_info) : strategy.supplier_info)
                            : {};
                    } catch { }

                    await PurchaseOrderModel.create({
                        sku: sku,
                        product_name: product.name || sku,
                        quantity: orderQty,
                        supplier_info: JSON.stringify(supplierInfo),
                        order_date: new Date().toISOString().split('T')[0]
                    });

                    console.log(`[Scheduler] Created Auto-PO for ${sku}. Qty: ${orderQty}`);

                    // Audit Log
                    await StrategyModel.addLog({
                        sku,
                        action_type: 'AUTO_REPLENISHMENT',
                        content: `自动补货触发: 有效库存(${effectiveStock}) < ROP(${Math.round(dynamicRop)}). 生成采购单草稿: ${orderQty}件`,
                        status: 'AUTO_APPROVED'
                    });
                }
            }

        } catch (e) {
            console.error(`[Scheduler] Failed to process ${strategy.sku}`, e);
        }
    }
}
