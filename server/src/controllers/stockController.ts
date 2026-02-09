import { Request, Response } from 'express';
import { StockModel, StockStatus } from '../models/Stock';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { StockService } from '../services/stockService';
import { StrategyModel } from '../models/Strategy';
import { SupplierStrategyModel } from '../models/SupplierStrategy';

export class StockController {
    static async getAllStocks(req: Request, res: Response) {
        try {
            // 1. Parallel Fetching of all necessary data
            // 1. Parallel Fetching of all necessary data
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
                        authorized_viewer_ids,
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

            // 1.1 Permission Filtering Logic
            const user = (req as any).user;
            const userId = user?.id; // Assuming number
            const userRole = user?.role; // 'admin' | 'user'

            // Build Maps
            const authorizedMap = new Map<string, number[]>();
            const strategyMap = new Map<string, any>(); // Store full strategy row

            strategyRows.forEach((row: any) => {
                strategyMap.set(row.sku, row);

                let viewerIds: number[] = [];
                try {
                    if (row.authorized_viewer_ids) {
                        viewerIds = typeof row.authorized_viewer_ids === 'string'
                            ? JSON.parse(row.authorized_viewer_ids)
                            : row.authorized_viewer_ids;
                    }
                } catch (e) { viewerIds = []; }
                authorizedMap.set(row.sku, Array.isArray(viewerIds) ? viewerIds : []);
            });

            // Filter Stocks
            const visibleStocks = stocks.filter(stock => {
                if (!userRole || userRole === 'admin') return true;
                const allowedIds = (authorizedMap.get(stock.sku) || []).map(id => Number(id));
                return allowedIds.includes(Number(userId));
            });

            // 2. Build remaining Lookup Maps
            const salesMap = new Map<string, number>();
            salesRows.forEach((row: any) => salesMap.set(row.product_model, Number(row.qty)));

            const leadTimeMap = new Map<string, number>();
            supplierRows.forEach((row: any) => leadTimeMap.set(row.sku, Number(row.effective_lead_time)));

            // Group Stocking Sales Data by Product for fast access
            const stockingSalesMap = new Map<string, any[]>();
            (stockingSalesRows as any[]).forEach((row: any) => {
                if (!stockingSalesMap.has(row.product_model)) {
                    stockingSalesMap.set(row.product_model, []);
                }
                stockingSalesMap.get(row.product_model)?.push(row);
            });

            // 3. Dynamic Calculation & Enrichment
            const enrichedStocks = visibleStocks.map(stock => {
                const sales30Days = salesMap.get(stock.sku) || 0;
                const leadTime = leadTimeMap.get(stock.sku) || 30;
                const strat = strategyMap.get(stock.sku) || {};

                const safetyStockDaysRaw = strat.safety_stock_days;
                const safetyStockDays = safetyStockDaysRaw !== undefined ? safetyStockDaysRaw : 0.6;
                const safetyDaysObj = safetyStockDays * 30; // Approx

                const turnoverDays = StockService.calculateTurnoverDays(stock.inStock, sales30Days);
                const riskLevel = StockService.calculateRiskLevel(turnoverDays, leadTime, safetyDaysObj);
                const dynamicStatus = StockService.mapRiskToStatus(riskLevel, stock.status === StockStatus.STAGNANT);

                // --- Stocking Recommendation Logic ---
                const isStockingEnabled = strat.is_stocking_enabled === 1; // DB TINYINT 1/0

                // Get Config criteria (Defaults: 3 months, 10 freq, 3 customers)
                const period = strat.stocking_period || 3;
                const minFreq = strat.min_outbound_freq || 10;
                const minCust = strat.min_customer_count || 3;

                // Calculate Metrics
                const history = stockingSalesMap.get(stock.sku) || [];
                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - period);

                // Filter rows within period
                const relevantRows = history.filter(r => new Date(r.outbound_date) >= cutoffDate);

                // Aggregate Distinct
                const uniqueOrders = new Set(relevantRows.map(r => r.outbound_id)).size;
                const uniqueCustomers = new Set(relevantRows.map(r => r.customer_name)).size;

                const stockingRecommendation = uniqueOrders >= minFreq && uniqueCustomers >= minCust;

                // --- Dead Stock Logic (Backend Logic) ---
                const deadStockThreshold = strat.dead_stock_days || 180;
                // Find latest outbound date from history (24 months)
                let lastOutboundStr = null;
                if (history && history.length > 0) {
                    // Sort descending to find latest
                    history.sort((a, b) => new Date(b.outbound_date).getTime() - new Date(a.outbound_date).getTime());
                    lastOutboundStr = history[0].outbound_date;
                }

                const daysSinceOutbound = lastOutboundStr
                    ? (new Date().getTime() - new Date(lastOutboundStr).getTime()) / (1000 * 3600 * 24)
                    : 9999; // Treat no record as very old

                // Dead Stock = Stock > 0 AND No Move > Threshold
                const isDeadStock = stock.inStock > 0 && daysSinceOutbound > deadStockThreshold;

                return {
                    ...stock,
                    status: dynamicStatus,
                    isStockingEnabled,
                    stockingRecommendation,
                    isDeadStock // Expose to frontend
                };
            });

            res.json(enrichedStocks);
        } catch (error) {
            console.error('Error fetching stocks:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async initialize(req: Request, res: Response) {
        try {
            const mockData = req.body.mockData;
            await StockModel.initializeTable(mockData || []);
            res.json({ message: 'Database initialized and data imported' });
        } catch (error) {
            console.error('Error initializing database:', error);
            res.status(500).json({ message: 'Initialization failed' });
        }
    }

    static async createStock(req: Request, res: Response) {
        try {
            const stockData = req.body;
            // Basic validation
            if (!stockData.sku || !stockData.name) {
                return res.status(400).json({ message: 'SKU and Name are required' });
            }

            const insertId = await StockModel.create(stockData);

            // --- Default Configuration Initialization ---
            try {
                const sku = stockData.sku;

                // 1. Initialize Product Strategy (Default: Safety Stock 0.6 month, MOM)
                // 1. Initialize Product Strategy with Global Defaults
                // Fetch defaults or use hardcoded fallback
                const [rows] = await pool.execute<RowDataPacket[]>(
                    "SELECT setting_value FROM system_settings WHERE setting_key = 'stock_global_defaults'"
                );
                const defaults = (rows.length > 0 && rows[0].setting_value) ? rows[0].setting_value : {
                    safety_stock_days: 1,
                    is_stocking_enabled: false,
                    stocking_period: 3,
                    min_outbound_freq: 10,
                    min_customer_count: 3,
                    dead_stock_days: 180,
                    buffer_days: 30
                };

                await StrategyModel.upsert({
                    sku,
                    safety_stock_days: defaults.safety_stock_days || 1, // Default 1 month
                    rop: 0,
                    eoq: 0,
                    benchmark_type: 'mom',
                    service_level: 0.95,
                    stocking_period: defaults.stocking_period || 3,
                    min_outbound_freq: defaults.min_outbound_freq || 10,
                    min_customer_count: defaults.min_customer_count || 3,
                    is_stocking_enabled: defaults.is_stocking_enabled || false,
                    dead_stock_days: defaults.dead_stock_days || 180,
                    buffer_days: defaults.buffer_days || 30
                });

                // 2. Initialize Default Supplier (Shenmu Supplier)
                // Check or Create '殸木供应商'
                const supplierCode = 'SUP-SHENMU-DEFAULT';
                const supplierName = '殸木供应商';

                await SupplierStrategyModel.saveStrategy(sku, {
                    name: supplierName,
                    code: supplierCode,
                    leadTimeFast: 7,
                    leadTimeEconomic: 30, // Default 30 days
                    priceTiers: [
                        {
                            minQty: 1,
                            price: 1.00,
                            leadTime: 30,
                            isSelected: true
                        }
                    ]
                });

                console.log(`Initialized default strategies for new product: ${sku}`);

            } catch (initError) {
                console.error('Failed to initialize default strategies:', initError);
                // Non-blocking error, product is still created
            }
            // --------------------------------------------

            res.status(201).json({ id: insertId, ...stockData });
        } catch (error) {
            console.error('Error creating stock:', error);
            // Handle duplicate SKU error commonly from SQL
            if ((error as any).code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Product with this SKU already exists' });
            }
            res.status(500).json({ message: 'Failed to create product' });
        }
    }

    static async getStockingStats(req: Request, res: Response) {
        try {
            const { sku } = req.params;
            const period = Number(req.query.period) || 3;

            // Date filtering Logic corresponding to Frontend Cutoff
            const sql = `
                SELECT outbound_id, customer_name
                FROM shiplist
                WHERE product_model = ? 
                AND outbound_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            `;

            const [rows] = await pool.execute<RowDataPacket[]>(sql, [sku, period]);

            const uniqueOrders = new Set(rows.map(r => r.outbound_id)).size;
            const uniqueCustomers = new Set(rows.map(r => r.customer_name)).size;

            res.json({
                outboundCount: uniqueOrders,
                distinctCustomerCount: uniqueCustomers,
                period
            });
        } catch (error) {
            console.error('Error fetching stocking stats:', error);
            res.status(500).json({ message: 'Failed to fetch stocking stats' });
        }
    }

    static async getStockDefaults(req: Request, res: Response) {
        try {
            const [rows] = await pool.execute<RowDataPacket[]>(
                "SELECT setting_value FROM system_settings WHERE setting_key = 'stock_global_defaults'"
            );

            const defaults = (rows.length > 0 && rows[0].setting_value) ? rows[0].setting_value : {
                stocking_period: 3,
                min_outbound_freq: 10,
                min_customer_count: 3,
                safety_stock_days: 1,
                dead_stock_days: 180,
                is_stocking_enabled: false,
                buffer_days: 30,
                lead_time_economic: 30
            };
            res.json(defaults);
        } catch (error) {
            console.error('Error fetching stock defaults:', error);
            res.status(500).json({ message: 'Failed to fetch defaults' });
        }
    }

    static async saveStockDefaults(req: Request, res: Response) {
        try {
            const defaults = req.body;
            await pool.execute(
                "INSERT INTO system_settings (setting_key, setting_value) VALUES ('stock_global_defaults', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
                [JSON.stringify(defaults), JSON.stringify(defaults)]
            );
            res.json({ message: 'Defaults saved successfully' });
        } catch (error) {
            console.error('Error saving stock defaults:', error);
            res.status(500).json({ message: 'Failed to save defaults' });
        }
    }

    static async updateStock(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!id) {
                return res.status(400).json({ message: 'ID is required' });
            }

            await StockModel.update(Number(id), updateData);
            res.json({ message: 'Stock updated successfully' });
        } catch (error) {
            console.error('Error updating stock:', error);
            res.status(500).json({ message: 'Failed to update stock' });
        }
    }
}
