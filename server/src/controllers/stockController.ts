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
            const [
                stocks,
                salesRows,
                strategyRows,
                supplierRows
            ] = await Promise.all([
                StockModel.findAll(),
                // Sales 30 Days
                pool.execute<RowDataPacket[]>(`
                    SELECT product_model, SUM(quantity) as qty 
                    FROM shiplist 
                    WHERE outbound_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    GROUP BY product_model
                `).then(res => res[0]),
                // Safety Stock & Permissions Settings
                pool.execute<RowDataPacket[]>(`
                    SELECT sku, safety_stock_days, authorized_viewer_ids FROM product_strategies
                `).then(res => res[0]),
                // Supplier Lead Times (Selected Tier > Default Strategy > Fallback)
                pool.execute<RowDataPacket[]>(`
                    SELECT 
                        pss.sku,
                        COALESCE(spt.lead_time_days, pss.lead_time_economic, 30) as effective_lead_time
                    FROM product_supplier_strategies pss
                    LEFT JOIN supplier_price_tiers spt 
                        ON pss.id = spt.strategy_id AND spt.is_selected = 1
                    WHERE pss.is_default = 1
                `).then(res => res[0])
            ]);

            // 1.1 Permission Filtering Logic
            const user = (req as any).user;
            const userId = user?.id; // Assuming number
            const userRole = user?.role; // 'admin' | 'user'

            // Build Authorization Map first to filter stocks
            const authorizedMap = new Map<string, number[]>(); // SKU -> UserIDs
            const safetyStockMap = new Map<string, number>();

            strategyRows.forEach((row: any) => {
                safetyStockMap.set(row.sku, Number(row.safety_stock_days));

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

            // Filter Stocks:
            // - Admins see ALL
            // - Users see ONLY if their ID is in authorized_viewer_ids
            console.log(`[PermissionDebug] User: ${userId} (${userRole}), Total Stocks: ${stocks.length}`);

            const visibleStocks = stocks.filter(stock => {
                if (!userRole || userRole === 'admin') return true;

                // For normal users:
                const allowedIds = (authorizedMap.get(stock.sku) || []).map(id => Number(id));
                const hasPermission = allowedIds.includes(Number(userId));

                // Log only first few failures to avoid spam
                if (!hasPermission && Math.random() < 0.01) {
                    console.log(`[PermissionDebug] Deny ${stock.sku} for User ${userId}. Allowed: ${JSON.stringify(allowedIds)}`);
                }
                return hasPermission;
            });
            console.log(`[PermissionDebug] Visible Stocks: ${visibleStocks.length}`);

            // 2. Build remaining Lookup Maps based on filtered/visible stocks (Optimization optional, but keeping simple)
            const salesMap = new Map<string, number>();
            salesRows.forEach((row: any) => salesMap.set(row.product_model, Number(row.qty)));

            const leadTimeMap = new Map<string, number>();
            supplierRows.forEach((row: any) => leadTimeMap.set(row.sku, Number(row.effective_lead_time)));

            // 3. Dynamic Calculation & Enrichment
            const enrichedStocks = visibleStocks.map(stock => {
                const sales30Days = salesMap.get(stock.sku) || 0;
                const leadTime = leadTimeMap.get(stock.sku) || 30; // Default 30 days
                const safetyStockDaysRaw = safetyStockMap.get(stock.sku);
                const safetyStockDays = safetyStockDaysRaw !== undefined ? safetyStockDaysRaw : 0.6; // Default 0.6 months (~18 days)

                // Convert Safety Stock Months to Days (Approx)
                const safetyDaysObj = safetyStockDays * 30;

                const turnoverDays = StockService.calculateTurnoverDays(stock.inStock, sales30Days);
                const riskLevel = StockService.calculateRiskLevel(turnoverDays, leadTime, safetyDaysObj);

                // Override status with dynamic calculation
                // Note: Preserve STAGNANT if originally marked (or add stagnant logic here if needed)
                // For now, we strictly follow the risk map
                const dynamicStatus = StockService.mapRiskToStatus(riskLevel, stock.status === StockStatus.STAGNANT);

                return {
                    ...stock,
                    status: dynamicStatus,
                    // Optional: Return debug info if needed
                    // _debug: { turnoverDays, leadTime, riskLevel }
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
                await StrategyModel.upsert({
                    sku,
                    safety_stock_days: 1, // Default 1 month
                    rop: 0,
                    eoq: 0,
                    benchmark_type: 'mom',
                    service_level: 0.95
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
}
