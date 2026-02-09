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

            // 2. Get In Transit (Entry List)
            const pendingEntries = await EntryListModel.findPendingEntries(sku);
            const inTransitEntries = pendingEntries.reduce((sum, e) => sum + e.quantity, 0);

            // 3. Anti-Duplicate Logic: Check if AUTO plan created within last 5 mins
            const { PurchasePlanModel } = require('../models/PurchasePlan');
            const allPlans = await PurchasePlanModel.findAll();

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            const alreadyCreatedRecently = allPlans.some((p: any) => {
                const planTime = new Date(p.created_at || p.order_date);
                return p.sku === sku &&
                    p.source === 'AUTO' &&
                    planTime > fiveMinutesAgo;
            });

            if (alreadyCreatedRecently) {
                console.log(`[Scheduler] Skipping ${sku}, AUTO plan created recently (within 5 mins).`);
                return;
            }

            // 4. Calculate Forecast & ROP
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
                return;
            }

            const dailySales = monthlyForecast / 30;
            const leadTime = (strategy.replenishment_mode === 'fast' ? 7 : 30);

            // 1. 触发点 (ROP) = 最小销售周期 (SS) + 货期需求 (LT)
            const safetyDays = strategy.safety_stock_days * 30;
            const ropThreshold = dailySales * (safetyDays + leadTime);

            // 2. 补货目标水位 = 动态配置的补货销售周期需求
            const replenishmentCycleMonths = strategy.replenishment_sales_cycle || 1;
            const targetCycleDays = replenishmentCycleMonths * 30;
            const targetDemand = dailySales * targetCycleDays;

            // 3. 积压欠单
            const backlogQty = (strategy as any).backlog_qty || 0;

            const effectiveStock = inStock + inTransitEntries;

            // 4. 检查触发逻辑 (当前有效库存 < ROP + 积压欠单)
            const triggerThreshold = ropThreshold + backlogQty;

            if (effectiveStock < triggerThreshold && monthlyForecast > 0) {
                // 建议补货量 = (补货点 + 补货销售周期需求 + 积压欠单) - 有效库存
                // 叠加模式确保补货后库存能支撑过触发线并覆盖一个完整周期
                let rawNeeded = (ropThreshold + targetDemand + backlogQty) - effectiveStock;

                let orderQty = Math.max(rawNeeded, strategy.eoq || 0);

                // 向上取整到100 (保持原有业务约束)
                orderQty = Math.ceil(orderQty / 100) * 100;

                console.log(`[自动补货] 触发! SKU: ${sku}, 当前拥有: ${effectiveStock}, 触发临界(ROP+欠单): ${Math.round(triggerThreshold)}`);
                console.log(`[自动补货] 叠加式补货量: ${orderQty} (基于补货点+${replenishmentCycleMonths}月需求)`);

                if (orderQty > 0) {
                    // 创建采购计划
                    let supplierInfo: any = {};
                    try {
                        supplierInfo = strategy.supplier_info ?
                            (typeof strategy.supplier_info === 'string' ? JSON.parse(strategy.supplier_info) : strategy.supplier_info)
                            : {};
                    } catch { }

                    // Fix for Missing Price/LeadTime: Default to 1st tier if none selected
                    if (supplierInfo.priceTiers && Array.isArray(supplierInfo.priceTiers) && supplierInfo.priceTiers.length > 0) {
                        const hasSelected = supplierInfo.priceTiers.some((t: any) => t.isSelected);
                        let selectedTier = supplierInfo.priceTiers.find((t: any) => t.isSelected);

                        if (!hasSelected) {
                            // Default to first tier if none selected
                            supplierInfo.priceTiers = supplierInfo.priceTiers.map((t: any, idx: number) => ({
                                ...t,
                                isSelected: idx === 0
                            }));
                            selectedTier = supplierInfo.priceTiers[0];
                        }

                        // Lift leadTime to top level for UI display consistency
                        if (selectedTier) {
                            supplierInfo.leadTime = selectedTier.leadTime || selectedTier.leadTimeDays || 0;
                        }
                    }

                    const timeZoneOffset = 8 * 60; // UTC+8
                    const localDate = new Date(new Date().getTime() + timeZoneOffset * 60 * 1000);
                    const orderDateStr = localDate.toISOString().split('T')[0];

                    const { PurchasePlanModel } = require('../models/PurchasePlan');
                    const planId = await PurchasePlanModel.create({
                        sku: sku,
                        product_name: product.name || sku,
                        quantity: orderQty,
                        supplier_info: JSON.stringify(supplierInfo),
                        order_date: orderDateStr,
                        source: 'AUTO'
                    });

                    console.log(`[Scheduler] Created Auto-Plan for ${sku}. Qty: ${orderQty}, PlanID: ${planId}`);

                    // Send Email Notification
                    try {
                        const { UserModel } = require('../models/User');
                        const recipients = await UserModel.findStockNotificationRecipients();

                        await PurchasePlanModel.updateEmailStatus(planId, {
                            status: 'PENDING',
                            recipients,
                            sent_at: new Date().toISOString()
                        });

                        if (recipients.length > 0) {
                            const { sendPurchaseOrderNotification } = require('../services/emailService');
                            await sendPurchaseOrderNotification(recipients, {
                                sku: sku,
                                product_name: product.name || sku,
                                quantity: orderQty,
                                plan_id: planId,
                                supplier_info: supplierInfo,
                                order_date: orderDateStr,
                                source: 'AUTO'
                            });

                            await PurchasePlanModel.updateEmailStatus(planId, {
                                status: 'SENT',
                                recipients,
                                sent_at: new Date().toISOString()
                            });
                        }
                    } catch (err: any) {
                        console.error('[Scheduler] Failed to send notification:', err);
                        await PurchasePlanModel.updateEmailStatus(planId, {
                            status: 'FAILED',
                            error: err.message,
                            sent_at: new Date().toISOString()
                        });
                    }


                    // Audit Log
                    await StrategyModel.addLog({
                        sku,
                        action_type: 'AUTO_REPLENISHMENT',
                        content: `自动补货触发: 有效库存(${effectiveStock}) < 补货点(${Math.round(ropThreshold)}). 生成采购单草稿: ${orderQty}件`,
                        status: 'AUTO_APPROVED'
                    });
                }
            }

        } catch (e) {
            console.error(`[Scheduler] Failed to process ${strategy.sku}`, e);
        }
    }
}
