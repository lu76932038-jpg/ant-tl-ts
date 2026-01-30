import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PurchasePlan {
    id: number;
    plan_id: string; // PLAN-2023...
    sku: string;
    product_name: string;
    quantity: number;
    supplier_info: string; // JSON string
    status: 'PLAN';
    source: 'MANUAL' | 'AUTO'; // 新增来源字段
    order_date: string;
    email_notification_info?: string; // JSON: { recipients, status, sent_at, error }
    created_at?: Date;
}

export class PurchasePlanModel {
    private static generatePlanId(): string {
        const prefix = 'PLAN';
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-6);
        return `${prefix}${yyyy}${mm}${timestamp}`;
    }

    static async findAll(): Promise<PurchasePlan[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM purchase_plans ORDER BY created_at DESC'
        );
        return rows as PurchasePlan[];
    }

    static async create(item: Omit<PurchasePlan, 'id' | 'plan_id' | 'created_at'>): Promise<number> {
        const planId = PurchasePlanModel.generatePlanId();
        const source = item.source || 'MANUAL';
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO purchase_plans (plan_id, sku, product_name, quantity, supplier_info, order_date, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [planId, item.sku, item.product_name, item.quantity, item.supplier_info, item.order_date, 'PLAN', source]
        );
        return result.insertId;
    }

    static async updateEmailStatus(id: number, info: any): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE purchase_plans SET email_notification_info = ? WHERE id = ?',
            [JSON.stringify(info), id]
        );
        return result.affectedRows > 0;
    }

    static async findById(id: number): Promise<PurchasePlan | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM purchase_plans WHERE id = ?',
            [id]
        );
        return (rows[0] as PurchasePlan) || null;
    }

    static async delete(id: number): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'DELETE FROM purchase_plans WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS purchase_plans (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    plan_id VARCHAR(50) UNIQUE NOT NULL,
                    sku VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NOT NULL,
                    quantity INT DEFAULT 1,
                    supplier_info JSON,
                    order_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'PLAN',
                    source VARCHAR(20) DEFAULT 'MANUAL',
                    email_notification_info JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Helper to add column safely
            const addColumn = async (sql: string) => {
                try {
                    await pool.execute(sql);
                } catch (e: any) {
                    // Ignore duplicate column error (Code 1060 or ER_DUP_FIELDNAME)
                    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
                        console.warn('Column add warning:', e.message);
                    }
                }
            };

            await addColumn("ALTER TABLE purchase_plans ADD COLUMN source VARCHAR(20) DEFAULT 'MANUAL'");
            await addColumn("ALTER TABLE purchase_plans ADD COLUMN email_notification_info JSON");

            console.log('purchase_plans table initialized.');
        } catch (error) {
            console.error('Error initializing PurchasePlan table:', error);
        }
    }
}
