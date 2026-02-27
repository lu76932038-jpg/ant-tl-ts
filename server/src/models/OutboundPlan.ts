import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface OutboundPlan {
    id: number;
    plan_code: string; // Unique plan number via sync
    sku: string;
    product_name?: string | null;
    quantity: number;
    customer_name: string;
    customer_code?: string;
    planned_date: string; // YYYY-MM-DD
    warehouse?: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    created_at?: Date;
    updated_at?: Date;
}

export class OutboundPlanModel {
    static async findAll(): Promise<OutboundPlan[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM outbound_plan ORDER BY planned_date ASC, created_at DESC'
        );
        return rows as OutboundPlan[];
    }

    static async create(item: Omit<OutboundPlan, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO outbound_plan (plan_code, sku, product_name, quantity, customer_name, customer_code, planned_date, warehouse, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [item.plan_code, item.sku, item.product_name ?? null, item.quantity, item.customer_name, item.customer_code || '', item.planned_date, item.warehouse || '', item.status]
        );
        return result.insertId;
    }

    static async updateStatus(planCode: string, status: 'PENDING' | 'COMPLETED' | 'CANCELLED'): Promise<void> {
        await pool.execute(
            'UPDATE outbound_plan SET status = ? WHERE plan_code = ?',
            [status, planCode]
        );
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS outbound_plan (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    plan_code VARCHAR(100) UNIQUE NOT NULL,
                    sku VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NULL,
                    quantity INT NOT NULL DEFAULT 0,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_code VARCHAR(100) NULL,
                    planned_date DATE NOT NULL,
                    warehouse VARCHAR(100) NULL,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_date (planned_date),
                    INDEX idx_sku (sku)
                )
            `);

            // Check for customer_code column
            const [customerCodeCols] = await pool.execute<RowDataPacket[]>(
                "SHOW COLUMNS FROM outbound_plan LIKE 'customer_code'"
            );
            if (customerCodeCols.length === 0) {
                await pool.execute("ALTER TABLE outbound_plan ADD COLUMN customer_code VARCHAR(100) NULL AFTER customer_name");
                console.log('Added customer_code column to outbound_plan');
            }

            // Check product_name column nullability
            const [productNameCols] = await pool.execute<RowDataPacket[]>(
                "SHOW COLUMNS FROM outbound_plan LIKE 'product_name'"
            );
            if (productNameCols.length > 0 && productNameCols[0].Null === 'NO') {
                await pool.execute("ALTER TABLE outbound_plan MODIFY COLUMN product_name VARCHAR(255) NULL");
                console.log('Modified product_name column to allow NULL');
            }

            console.log('OutboundPlan table initialized.');
        } catch (error) {
            console.error('Error initializing OutboundPlan table:', error);
        }
    }
}
