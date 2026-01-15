import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { StockModel } from '../models/Stock';
import { ShipListModel } from '../models/ShipList';
import { StrategyModel } from '../models/Strategy';
import { EntryListModel } from '../models/EntryList';
import pool from '../config/database';
import ARIMA from 'arima';

// Define TS interface for chart data
interface ChartData {
    month: string;
    fullDate: string;
    type: 'history' | 'future';
    actualQty?: number;
    actualAmount?: number;
    actualCustomerCount?: number;
    forecastQty?: number;
    forecastAmount?: number;
    forecastCustomerCount?: number;
    inbound?: number;
    outbound?: number;

    // Simulation Fields
    simStock?: number; // Simulated Stock Level
    simSafety?: number; // Safety Stock Line
    simRop?: number; // ROP Line
}

export class ProductController {

    static async getDetail(req: Request, res: Response) {
        try {
            const { sku } = req.params;

            // 1. Basic Info
            const stockItems = await StockModel.findAll();
            const product = stockItems.find(p => p.sku === sku);

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // 2. Fetch Dependent Data
            // 2.1 Historical Sales (Last 24 months)
            const [salesHistory] = await pool.execute<RowDataPacket[]>(
                `SELECT 
                    DATE_FORMAT(outbound_date, '%Y-%m') as month,
                    SUM(quantity) as total_qty,
                    SUM(quantity * unit_price) as total_amount,
                    COUNT(DISTINCT customer_name) as customer_count
                 FROM shiplist
                 WHERE product_model = ?
                 GROUP BY month
                 ORDER BY month ASC`,
                [sku]
            );

            // 2.2 Strategy Config (ROP, EOQ)
            let strategy = await StrategyModel.findBySku(sku);
            // Default strategy if missing
            if (!strategy) {
                strategy = {
                    sku, forecast_cycle: 6, safety_stock_days: 0.6, service_level: 0.95, rop: 330, eoq: 1500
                };
            }

            // 2.3 Future Entry List (Inbound)
            const futureEntries = await EntryListModel.findPendingEntries(sku);

            const nowTime = new Date().setHours(0, 0, 0, 0);
            const inTransitBatches = futureEntries.map((e: any) => {
                const rawDate = e.arrival_date;
                const arrivalDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
                const arrival = arrivalDate.getTime();
                const isOverdue = arrival < nowTime;
                const diffTime = Math.abs(nowTime - arrival);
                const overdueDays = isOverdue ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
                return {
                    id: e.entry_id,
                    arrival_date: arrivalDate.toISOString().split('T')[0], // 确保返回 YYYY-MM-DD 格式字符串
                    quantity: e.quantity,
                    isOverdue,
                    overdueDays
                };
            });

            // 动态计算在途库存总量（从 entry_list PENDING 记录汇总）
            const calculatedInTransit = inTransitBatches.reduce((sum, batch) => sum + batch.quantity, 0);

            // 3. KPI Calculation
            // ... (Same as before) ...
            const [recentSales] = await pool.execute<any[]>(
                `SELECT SUM(quantity) as qty FROM shiplist 
                 WHERE product_model = ? AND outbound_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
                [sku]
            );
            const sales30Days = recentSales[0]?.qty || 0;
            const avgDailySales = sales30Days / 30; // simple avg based on last 30 days
            const turnoverDays = avgDailySales > 0 ? Math.round(product.inStock / avgDailySales) : 999;
            let stockoutRisk = '低';
            if (turnoverDays < 15) stockoutRisk = '高';
            else if (turnoverDays < 45) stockoutRisk = '中';

            // 2.4 Historical Inbound
            const [inboundHistory] = await pool.execute<RowDataPacket[]>(
                `SELECT 
                    DATE_FORMAT(arrival_date, '%Y-%m') as month,
                    SUM(quantity) as total_qty
                 FROM entry_list
                 WHERE sku = ? AND status = 'RECEIVED'
                 GROUP BY month`,
                [sku]
            );

            // 4. ARIMA Forecasting & Chart Generation
            // Prepare time series
            const historyMap = new Map<string, any>();
            let recentPrice = 0; // To track last known price
            salesHistory.forEach((r: any) => {
                historyMap.set(r.month, {
                    qty: Number(r.total_qty),
                    amount: Number(r.total_amount),
                    customers: Number(r.customer_count)
                });
                if (Number(r.total_qty) > 0) {
                    recentPrice = Number(r.total_amount) / Number(r.total_qty);
                }
            });

            const inboundMap = new Map<string, number>();
            inboundHistory.forEach((r: any) => inboundMap.set(r.month, Number(r.total_qty)));

            // Fill gaps for last 24 months
            const timelineQty: number[] = [];
            const timelineCustomers: number[] = [];
            const chartData: ChartData[] = [];

            const now = new Date();
            for (let i = 59; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // Strict format YYYY-MM
                const displayDate = `${d.getFullYear()} - ${String(d.getMonth() + 1).padStart(2, '0')}`;

                const data = historyMap.get(monthStr) || { qty: 0, amount: 0, customers: 0 };
                const inboundVal = inboundMap.get(monthStr) || 0;

                timelineQty.push(data.qty);
                timelineCustomers.push(data.customers);

                chartData.push({
                    month: monthStr, // YYYY-MM
                    fullDate: displayDate,
                    type: 'history',
                    actualQty: data.qty,
                    actualAmount: data.amount,
                    actualCustomerCount: data.customers,
                    outbound: data.qty,
                    inbound: inboundVal
                });
            }

            // PREDICT
            let forecastQty: number[] = [];
            let forecastCustomers: number[] = [];
            const forecastHorizon = 6;

            // Helper for prediction
            const predictSeries = (series: number[]): number[] => {
                const nonZero = series.filter(v => v > 0).length;
                if (nonZero < 5) {
                    const sum = series.reduce((a, b) => a + b, 0);
                    const avg = nonZero > 0 ? Math.round(sum / nonZero) : 0;
                    return Array(forecastHorizon).fill(avg);
                }
                try {
                    const arima = new ARIMA({ p: 1, d: 1, q: 1, verbose: false });
                    arima.train(series);
                    const [pred] = arima.predict(forecastHorizon);
                    return pred.map((v: number) => Math.max(0, Math.round(v)));
                } catch {
                    const sum = series.reduce((a, b) => a + b, 0);
                    const avg = Math.round(sum / series.length);
                    return Array(forecastHorizon).fill(avg);
                }
            };

            forecastQty = predictSeries(timelineQty);
            // Use simple moving average for customers instead of ARIMA to avoid noise
            const last6MonthsCustomers = timelineCustomers.slice(-6);
            const avgCustomers = Math.round(last6MonthsCustomers.reduce((a, b) => a + b, 0) / (last6MonthsCustomers.length || 1));
            forecastCustomers = Array(forecastHorizon).fill(avgCustomers);


            // 5. INVENTORY SIMULATION (New Logic)
            // Initial Stock
            let currentSimStock = product.inStock;
            const safetyStock = Math.round((strategy.rop || 0) * 0.6); // Estimated

            // Generate Future Chart Data
            for (let i = 1; i <= forecastHorizon; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const monthStr = `${d.getFullYear()} -${String(d.getMonth() + 1).padStart(2, '0')} `;

                const fQty = forecastQty[i - 1];
                const fCustomers = forecastCustomers[i - 1];
                const fAmount = Math.round(fQty * recentPrice);

                // Get planned inbound for this month
                const plannedInbound = futureEntries
                    .filter(e => {
                        // arrival_date 可能是 Date 对象，需要转换为字符串
                        const rawDate = e.arrival_date as any;
                        const arrivalStr = rawDate instanceof Date
                            ? rawDate.toISOString().split('T')[0]
                            : String(rawDate).split('T')[0];
                        return arrivalStr.startsWith(monthStr.trim());
                    })
                    .reduce((sum, e) => sum + e.quantity, 0);

                // Simulation Step:
                // 1. Add inbound
                currentSimStock += plannedInbound;

                // 2. Check ROP Trigger (Simplified)
                if (currentSimStock < (strategy.rop || 0)) {
                    // Trigger EOQ logical placeholder
                }

                // 3. Subtract Forecast Sales
                currentSimStock -= fQty;

                chartData.push({
                    month: monthStr,
                    fullDate: monthStr,
                    type: 'future',
                    forecastQty: fQty,
                    forecastAmount: fAmount,
                    forecastCustomerCount: fCustomers,
                    outbound: fQty,
                    inbound: plannedInbound,

                    // Sim Fields
                    simStock: currentSimStock,
                    simSafety: safetyStock,
                    simRop: strategy.rop
                });
            }

            // Response
            res.json({
                basic: {
                    sku: product.sku,
                    name: product.name,
                    status: product.status
                },
                kpi: {
                    inStock: product.inStock,
                    inTransit: calculatedInTransit, // 使用动态计算值
                    sales30Days,
                    turnoverDays,
                    stockoutRisk,
                    inTransitBatches
                },
                charts: chartData
            });

        } catch (error) {
            console.error('Error fetching product detail:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async updateStrategy(req: Request, res: Response) {
        try {
            const { sku } = req.params;
            const body = req.body;

            // Upsert strategy configuration
            await StrategyModel.upsert({
                sku,
                ...body
            });

            // Log action
            await StrategyModel.addLog({
                sku,
                action_type: 'UPDATE_STRATEGY',
                content: JSON.stringify({ desc: '更新预测/补货策略配置', diff: body }),
                status: 'AUTO_APPROVED'
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating strategy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
