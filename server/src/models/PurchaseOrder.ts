import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PurchaseOrder {
    id: number;
    po_id: string; // PO-2023...
    sku: string;
    product_name: string;
    quantity: number;
    supplier_info: string; // JSON string
    status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
    order_date: string;
    created_at?: Date;
}

export class PurchaseOrderModel {
    private static generatePOId(): string {
        const prefix = 'PO';
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-6);
        return `${prefix}${yyyy}${mm}${timestamp}`;
    }

    static async findAll(): Promise<PurchaseOrder[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM purchase_orders ORDER BY created_at DESC'
        );
        return rows as PurchaseOrder[];
    }

    static async create(item: Omit<PurchaseOrder, 'id' | 'po_id' | 'status' | 'created_at'>): Promise<number> {
        const poId = PurchaseOrderModel.generatePOId();
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO purchase_orders (po_id, sku, product_name, quantity, supplier_info, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [poId, item.sku, item.product_name, item.quantity, item.supplier_info, item.order_date, 'DRAFT']
        );
        return result.insertId;
    }

    static async updateStatus(id: number, status: 'CONFIRMED' | 'CANCELLED'): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            'UPDATE purchase_orders SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async findById(id: number): Promise<PurchaseOrder | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM purchase_orders WHERE id = ?',
            [id]
        );
        return (rows[0] as PurchaseOrder) || null;
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    po_id VARCHAR(50) UNIQUE NOT NULL,
                    sku VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NOT NULL,
                    quantity INT DEFAULT 1,
                    supplier_info JSON,
                    order_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'DRAFT',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('purchase_orders table initialized.');
        } catch (error) {
            console.error('Error initializing PurchaseOrder table:', error);
        }
    }
}
