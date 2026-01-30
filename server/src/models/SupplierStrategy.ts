import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/database';

export interface Supplier {
    supplier_code: string;
    name: string;
    rating?: number;
}

export interface ProductSupplierConfig {
    sku: string;
    supplier_code: string;
    is_default?: boolean;
    lead_time_fast?: number;
    lead_time_economic?: number;
}

export interface PriceTierRecord {
    id?: number;
    strategy_id?: number;
    min_qty: number;
    unit_price: number;
    lead_time_days: number;
    is_selected: boolean;
}

export class SupplierStrategyModel {
    /**
     * 初始化表结构
     */
    static async initializeTables() {
        try {
            // 1. suppliers 表 (供应商主档)
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    supplier_code VARCHAR(64) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    rating DECIMAL(3, 2) DEFAULT NULL,
                    status VARCHAR(20) DEFAULT 'ACTIVE',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // 2. product_supplier_strategies 表 (SKU-供应商关系)
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS product_supplier_strategies (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    sku VARCHAR(64) NOT NULL,
                    supplier_code VARCHAR(64) NOT NULL,
                    is_default BOOLEAN DEFAULT FALSE,
                    lead_time_fast INT DEFAULT 7,
                    lead_time_economic INT DEFAULT 30,
                    min_order_qty INT DEFAULT 1,
                    order_unit_qty INT DEFAULT 1,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY idx_sku_supplier (sku, supplier_code)
                );
            `);

            // 3. supplier_price_tiers 表 (阶梯价格)
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS supplier_price_tiers (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    strategy_id BIGINT NOT NULL,
                    min_qty INT NOT NULL,
                    unit_price DECIMAL(10, 4) NOT NULL,
                    lead_time_days INT NOT NULL,
                    is_selected BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (strategy_id) REFERENCES product_supplier_strategies(id) ON DELETE CASCADE
                );
            `);

            console.log('Supplier strategy tables initialized.');
        } catch (error) {
            console.error('Error initializing supplier strategy tables:', error);
        }
    }

    /**
     * 根据 SKU 获取供应商及策略详情
     */
    /**
     * 根据 SKU 获取供应商及策略详情
     * 优先返回 is_default=true 的，其次是最近更新的
     * 如果指定了 supplier_code，则精确查找该供应商
     */
    static async findFullStrategyBySku(sku: string, supplierCode?: string) {
        let query = `SELECT pss.*, s.name as supplier_name 
             FROM product_supplier_strategies pss
             JOIN suppliers s ON pss.supplier_code = s.supplier_code
             WHERE pss.sku = ?`;

        const params: any[] = [sku];

        if (supplierCode) {
            query += ` AND pss.supplier_code = ?`;
            params.push(supplierCode);
        } else {
            query += ` ORDER BY pss.is_default DESC, pss.updated_at DESC LIMIT 1`;
        }

        // 获取绑定的默认供应商配置
        const [configs] = await pool.execute<RowDataPacket[]>(query, params);

        if (configs.length === 0) return null;

        const config = configs[0];

        // 获取对应的阶梯价格
        const [tiers] = await pool.execute<RowDataPacket[]>(
            `SELECT min_qty as minQty, unit_price as price, lead_time_days as leadTime, is_selected as isSelected
             FROM supplier_price_tiers 
             WHERE strategy_id = ? 
             ORDER BY min_qty ASC`,
            [config.id]
        );

        return {
            name: config.supplier_name,
            code: config.supplier_code,
            isDefault: !!config.is_default,
            leadTimeFast: config.lead_time_fast,
            leadTimeEconomic: config.lead_time_economic,
            minOrderQty: config.min_order_qty || 1,
            orderUnitQty: config.order_unit_qty || 1,
            priceTiers: tiers
        };
    }

    /**
     * 获取所有供应商列表 (用于下拉选择)
     */
    static async getAllSuppliers(): Promise<Supplier[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT supplier_code, name, rating FROM suppliers WHERE status = "ACTIVE" ORDER BY name ASC'
        );
        return rows as Supplier[];
    }

    /**
     * 保存/更新供应商策略 (带事务)
     * 保存时会强制将当前供应商设为默认供应商
     */
    static async saveStrategy(sku: string, supplierInfo: any) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const { name, code, priceTiers, leadTimeFast, leadTimeEconomic, minOrderQty, orderUnitQty } = supplierInfo;

            // 1. 确保供应商主档存在 (Upsert)
            await connection.execute(
                `INSERT INTO suppliers (supplier_code, name) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [code, name]
            );

            // 1.5 重置该 SKU 所有其他供应商的 is_default 为 FALSE
            await connection.execute(
                `UPDATE product_supplier_strategies SET is_default = FALSE WHERE sku = ?`,
                [sku]
            );

            // 2. 更新 SKU-供应商 关系表 (并设为 default)
            const [configResult] = await connection.execute<ResultSetHeader>(
                `INSERT INTO product_supplier_strategies (sku, supplier_code, lead_time_fast, lead_time_economic, min_order_qty, order_unit_qty, is_default)
                 VALUES (?, ?, ?, ?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE 
                    lead_time_fast = VALUES(lead_time_fast),
                    lead_time_economic = VALUES(lead_time_economic),
                    min_order_qty = VALUES(min_order_qty),
                    order_unit_qty = VALUES(order_unit_qty),
                    is_default = TRUE`,
                [sku, code, leadTimeFast || 7, leadTimeEconomic || 30, minOrderQty || 1, orderUnitQty || 1]
            );

            // 获取生成的 ID (如果是 INSERT 则取 insertId，如果是 UPDATE 则需要查询一次)
            let strategyId: number;
            if (configResult.insertId) {
                strategyId = configResult.insertId;
            } else {
                const [rows] = await connection.execute<RowDataPacket[]>(
                    'SELECT id FROM product_supplier_strategies WHERE sku = ? AND supplier_code = ?',
                    [sku, code]
                );
                strategyId = rows[0].id;
            }

            // 3. 更新阶梯价格 (先删后增)
            await connection.execute('DELETE FROM supplier_price_tiers WHERE strategy_id = ?', [strategyId]);

            if (priceTiers && priceTiers.length > 0) {
                const tierValues = priceTiers.map((t: any) => [
                    strategyId,
                    t.minQty || t.min_qty,
                    t.price || t.unit_price,
                    t.leadTime || t.lead_time_days || 30,
                    t.isSelected || t.is_selected ? 1 : 0
                ]);

                await connection.query(
                    `INSERT INTO supplier_price_tiers (strategy_id, min_qty, unit_price, lead_time_days, is_selected) VALUES ?`,
                    [tierValues]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
