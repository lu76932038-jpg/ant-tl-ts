import { Pool, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { SupplierStrategyModel } from './SupplierStrategy';

export interface ProductStrategy {
    id?: number;
    sku: string;
    start_year_month?: string; // e.g. "2025-01"
    forecast_cycle?: number; // Deprecated but kept for compatibility
    forecast_year_month?: string; // e.g. "2026-12"
    safety_stock_days: number; // e.g 0.6 months
    service_level: number; // 0.95
    rop: number;
    eoq: number;
    // Auto Replenishment
    auto_replenishment?: boolean;
    auto_replenishment_time?: string;
    // Task 55/57
    dead_stock_days?: number;
    is_stocking_enabled?: boolean;
    // Task 48 Permissions
    authorized_viewer_ids?: any; // JSON number[]

    // New Forecast Config Fields
    benchmark_type?: 'mom' | 'yoy';
    mom_range?: number;
    mom_time_sliders?: any; // JSON
    mom_weight_sliders?: any; // JSON
    yoy_range?: number;
    yoy_weight_sliders?: any; // JSON
    ratio_adjustment?: number;
    forecast_overrides?: any; // JSON Record<string, number>
    calculated_forecasts?: any; // JSON Record<string, number>
    supplier_info?: any; // JSON { name, code, price, lead_time_tiers, etc }
    replenishment_mode?: 'fast' | 'economic'; // ADDED
    updated_at?: Date;
}

export interface AuditLog {
    id?: number;
    sku: string;
    action_type: string;
    content: string; // JSON string
    status: string; // 'AUTO_APPROVED' | 'PENDING'
    created_at?: Date;
}

export class StrategyModel {
    // Initialize Tables
    static async initializeTables() {
        try {
            // 1. product_strategies
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS product_strategies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sku VARCHAR(50) NOT NULL UNIQUE,
                    start_year_month VARCHAR(20) DEFAULT NULL,
                    forecast_cycle INT DEFAULT 6,
                    forecast_year_month VARCHAR(20) DEFAULT NULL,
                    safety_stock_days DECIMAL(10, 2) DEFAULT 1,
                    service_level DECIMAL(10, 2) DEFAULT 0.95,
                    rop INT DEFAULT 0,
                    eoq INT DEFAULT 0,
                    benchmark_type VARCHAR(10) DEFAULT 'mom',
                    mom_range INT DEFAULT 6,
                    mom_time_sliders JSON DEFAULT NULL,
                    mom_weight_sliders JSON DEFAULT NULL,
                    yoy_range INT DEFAULT 3,
                    yoy_weight_sliders JSON DEFAULT NULL,
                    ratio_adjustment DECIMAL(10, 2) DEFAULT 0,
                    forecast_overrides JSON DEFAULT NULL,
                    calculated_forecasts JSON DEFAULT NULL,
                    supplier_info JSON DEFAULT NULL,
                    replenishment_mode VARCHAR(20) DEFAULT 'economic',
                    auto_replenishment BOOLEAN DEFAULT FALSE,
                    auto_replenishment_time VARCHAR(10) DEFAULT NULL,
                    dead_stock_days INT DEFAULT 180,
                    is_stocking_enabled BOOLEAN DEFAULT TRUE,
                    authorized_viewer_ids JSON DEFAULT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            `);

            // Migration: Add columns if they don't exist (Simple approach using generic ALTER IGNORE or checking)
            // Ideally we check information_schema, but for this tool `Add Column IF NOT EXISTS` is not standard MySQL 5.7/8.0 without procedure.
            // We'll execute individual ALTER statements and ignore errors (code 1060: Duplicate column name).
            const alterIgnore = async (sql: string) => {
                try {
                    await pool.execute(sql);
                } catch (e: any) {
                    if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_DUP_KEYNAME') {
                        // console.log('Column already exists or other error:', e.message); 
                    }
                }
            };

            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN benchmark_type VARCHAR(10) DEFAULT 'mom'");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN mom_range INT DEFAULT 6");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN mom_time_sliders JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN mom_weight_sliders JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN yoy_range INT DEFAULT 3");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN yoy_weight_sliders JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN ratio_adjustment DECIMAL(10, 2) DEFAULT 0");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN forecast_overrides JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN calculated_forecasts JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN supplier_info JSON DEFAULT NULL");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN replenishment_mode VARCHAR(20) DEFAULT 'economic'");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN auto_replenishment BOOLEAN DEFAULT FALSE");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN auto_replenishment_time VARCHAR(10) DEFAULT NULL");
            // V3.0.1 New Columns
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN dead_stock_days INT DEFAULT 180");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN is_stocking_enabled BOOLEAN DEFAULT TRUE");
            await alterIgnore("ALTER TABLE product_strategies ADD COLUMN authorized_viewer_ids JSON DEFAULT NULL");

            console.log('product_strategies table initialized/updated.');

            // 2. product_audit_logs
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS product_audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sku VARCHAR(50) NOT NULL,
                    action_type VARCHAR(50) NOT NULL,
                    content TEXT,
                    status VARCHAR(20) DEFAULT 'AUTO_APPROVED',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_sku (sku)
                );
            `);
            console.log('product_audit_logs table initialized.');

            // 3. supplier_strategies (New normalized tables)
            await SupplierStrategyModel.initializeTables();

        } catch (error) {
            console.error('Error initializing Strategy tables:', error);
        }
    }

    static async findBySku(sku: string): Promise<ProductStrategy | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM product_strategies WHERE sku = ?',
            [sku]
        );
        return (rows[0] as ProductStrategy) || null;
    }

    static async upsert(strategy: ProductStrategy): Promise<void> {
        const {
            sku, start_year_month, forecast_cycle, forecast_year_month,
            safety_stock_days, service_level, rop, eoq,
            benchmark_type, mom_range, mom_time_sliders, mom_weight_sliders, yoy_range, yoy_weight_sliders, ratio_adjustment,
            forecast_overrides, calculated_forecasts, supplier_info, replenishment_mode,
            dead_stock_days, is_stocking_enabled, authorized_viewer_ids
        } = strategy;

        await pool.execute(
            `INSERT INTO product_strategies (
                sku, start_year_month, forecast_cycle, forecast_year_month,
                safety_stock_days, service_level, rop, eoq,
                benchmark_type, mom_range, mom_time_sliders, mom_weight_sliders, yoy_range, yoy_weight_sliders, ratio_adjustment,
                forecast_overrides, calculated_forecasts, supplier_info, replenishment_mode,
                auto_replenishment, auto_replenishment_time,
                dead_stock_days, is_stocking_enabled, authorized_viewer_ids
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                start_year_month = VALUES(start_year_month),
                forecast_cycle = VALUES(forecast_cycle),
                forecast_year_month = VALUES(forecast_year_month),
                safety_stock_days = VALUES(safety_stock_days),
                service_level = VALUES(service_level),
                rop = VALUES(rop),
                eoq = VALUES(eoq),
                benchmark_type = VALUES(benchmark_type),
                mom_range = VALUES(mom_range),
                mom_time_sliders = VALUES(mom_time_sliders),
                mom_weight_sliders = VALUES(mom_weight_sliders),
                yoy_range = VALUES(yoy_range),
                yoy_weight_sliders = VALUES(yoy_weight_sliders),
                ratio_adjustment = VALUES(ratio_adjustment),
                forecast_overrides = VALUES(forecast_overrides),
                calculated_forecasts = VALUES(calculated_forecasts),
                supplier_info = VALUES(supplier_info),
                replenishment_mode = VALUES(replenishment_mode),
                auto_replenishment = VALUES(auto_replenishment),
                auto_replenishment_time = VALUES(auto_replenishment_time),
                dead_stock_days = VALUES(dead_stock_days),
                is_stocking_enabled = VALUES(is_stocking_enabled),
                authorized_viewer_ids = VALUES(authorized_viewer_ids)
            `,
            [
                sku, start_year_month || null, forecast_cycle || 6, forecast_year_month || null,
                safety_stock_days ?? 1, service_level ?? 0.95, rop ?? 0, eoq ?? 0,
                benchmark_type || 'mom', mom_range ?? 6,
                mom_time_sliders ? JSON.stringify(mom_time_sliders) : null, mom_weight_sliders ? JSON.stringify(mom_weight_sliders) : null,
                yoy_range ?? 3, yoy_weight_sliders ? JSON.stringify(yoy_weight_sliders) : null,
                ratio_adjustment ?? 0,
                forecast_overrides ? JSON.stringify(forecast_overrides) : null,
                calculated_forecasts ? JSON.stringify(calculated_forecasts) : null,
                supplier_info ? JSON.stringify(supplier_info) : null,
                replenishment_mode || 'economic',
                strategy.auto_replenishment ?? false,
                strategy.auto_replenishment_time ?? null,
                dead_stock_days ?? 180,
                is_stocking_enabled ?? true,
                authorized_viewer_ids ? JSON.stringify(authorized_viewer_ids) : null
            ]
        );
    }

    static async findAutoReplenishmentCandidates(timeHHMM: string): Promise<ProductStrategy[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM product_strategies WHERE auto_replenishment = 1 AND auto_replenishment_time = ?',
            [timeHHMM]
        );
        return rows as ProductStrategy[];
    }

    static async addLog(log: AuditLog): Promise<void> {
        await pool.execute(
            `INSERT INTO product_audit_logs (sku, action_type, content, status) VALUES (?, ?, ?, ?)`,
            [log.sku, log.action_type, log.content, log.status]
        );
    }

    static async getLogs(sku: string): Promise<AuditLog[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM product_audit_logs WHERE sku = ? ORDER BY created_at DESC LIMIT 50',
            [sku]
        );
        return rows as AuditLog[];
    }
}
