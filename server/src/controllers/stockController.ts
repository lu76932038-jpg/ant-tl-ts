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
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 15;
            const status = req.query.status as string; // 'CRITICAL', 'WARNING', etc.
            const search = req.query.search as string;

            const offset = (page - 1) * pageSize;

            // Build Query
            let baseSql = `FROM StockList WHERE 1=1`;
            const params: any[] = [];

            if (search) {
                baseSql += ` AND (sku LIKE ? OR name LIKE ? OR product_type LIKE ?)`;
                const searchParam = `%${search}%`;
                params.push(searchParam, searchParam, searchParam);
            }

            if (status && status !== '全部') {
                // Map frontend '全部' to Check or just ignore
                // StockStatus.ALL is '全部'
                if (status !== StockStatus.ALL) {
                    // Note: We persisted 'risk_status' (HEALTHY/WARNING/CRITICAL/STAGNANT)
                    // Check if 'STAGNANT' is stored in 'risk_status' or if it relies on 'is_dead_stock'
                    // In recalculateAll, we mapped riskLevel to StockStatus using mapRiskToStatus which handles STAGNANT.
                    // So 'status' column in DB (which we updated) should hold the correct Enum string.
                    // Wait, StockList table element 'status' was already there. We updated IT.
                    baseSql += ` AND status = ?`;
                    params.push(status);
                }
            }

            // Count Total
            const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as total ${baseSql}`, params);
            const total = countRows[0].total;

            // Fetch Page
            const sql = `
                SELECT * 
                ${baseSql}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;

            // Limit/Offset must be integers, not strings from params
            const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, pageSize, offset]);

            // Transform for Frontend (renaming columns if needed, but they match mostly)
            const result = rows.map(row => ({
                ...row,
                stockingRecommendation: !!row.is_stocking_recommended, // Convert 0/1 to boolean
                isStockingEnabled: !!row.is_stocking_enabled,
                isDeadStock: !!row.is_dead_stock
            }));

            res.json({
                items: result,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            });

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
