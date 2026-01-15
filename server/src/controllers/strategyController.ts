import { Request, Response } from 'express';
import { StrategyModel } from '../models/Strategy';

export class StrategyController {
    static async getStrategy(req: Request, res: Response) {
        try {
            const { sku } = req.params;
            let strategy = await StrategyModel.findBySku(sku);

            if (!strategy) {
                // Default Strategy if not set
                strategy = {
                    sku,
                    forecast_cycle: 6,
                    safety_stock_days: 0.6,
                    service_level: 0.95,
                    rop: 330, // Mock initial
                    eoq: 1500 // Mock initial
                };
            }

            // Use stored supplier info if exists, else Default Mock
            let supplier = null;
            if (strategy.supplier_info) {
                supplier = typeof strategy.supplier_info === 'string' ? JSON.parse(strategy.supplier_info) : strategy.supplier_info;
            } else {
                supplier = {
                    name: '深圳科创电子',
                    code: 'SUP-2023-081',
                    rating: 4.5,
                    price: 135 // Base price
                };
            }

            res.json({ strategy, supplier });
        } catch (error) {
            console.error('Error fetching strategy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async updateStrategy(req: Request, res: Response) {
        try {
            const { sku } = req.params;
            const { forecast_cycle, start_year_month, forecast_year_month, safety_stock_days, service_level, supplier_info } = req.body;

            // 1. Calculate Derived Metrics (Mock Logic for Demo)
            // Real ROP = (DailySales * LeadTime) + SafetyStock
            // Real EOQ = Sqrt((2 * Demand * CostPerOrder) / HoldingCost)
            // For now, simpler mock calculation driven by inputs
            const newRop = Math.round(550 * safety_stock_days);
            const newEoq = Math.round(1800 * (service_level || 0.95));

            const newStrategy = {
                sku,
                start_year_month: start_year_month || null,
                forecast_cycle: Number(forecast_cycle) || 6,
                forecast_year_month: forecast_year_month || null,
                safety_stock_days: Number(safety_stock_days),
                service_level: Number(service_level),
                rop: newRop,
                eoq: newEoq,
                supplier_info
            };

            // 2. Persist Strategy (Auto-Approval: Immediate Write)
            await StrategyModel.upsert(newStrategy);

            // 3. Create Audit Log
            const changeDesc = `Admin 修改了安全库存配置: 安全库存=${safety_stock_days}月, 服务水平=${service_level}`;
            await StrategyModel.addLog({
                sku,
                action_type: 'UPDATE_STRATEGY',
                content: JSON.stringify({ changes: newStrategy, desc: changeDesc }),
                status: 'AUTO_APPROVED'
            });

            res.json({ success: true, strategy: newStrategy });
        } catch (error) {
            console.error('Error updating strategy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getLogs(req: Request, res: Response) {
        try {
            const { sku } = req.params;
            const logs = await StrategyModel.getLogs(sku);
            res.json(logs);
        } catch (error) {
            console.error('Error fetching logs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
