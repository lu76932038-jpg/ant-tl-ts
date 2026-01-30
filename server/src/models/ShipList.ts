import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ShipList {
    id: number;
    outbound_id: string; // Unique user-facing ID
    product_model: string; // Corresponds to SKU in StockList
    product_name: string;
    outbound_date: string; // Format: YYYY-MM-DD
    quantity: number;
    customer_name: string;
    unit_price?: number; // New field: Unit Price (Excl. Tax)
    created_at?: Date;
}

export class ShipListModel {
    static async findAll(): Promise<ShipList[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM shiplist ORDER BY outbound_date DESC, created_at DESC'
        );
        return rows as ShipList[];
    }

    private static generateOutboundId(): string {
        const prefix = 'CK';
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        // Format: CK-20250129-123456
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `${prefix}-${yyyy}${mm}${dd}-${random}`;
    }

    static async create(item: Omit<ShipList, 'id' | 'created_at' | 'outbound_id'>): Promise<number> {
        const outboundId = ShipListModel.generateOutboundId();
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO shiplist (outbound_id, product_model, product_name, outbound_date, quantity, customer_name, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [outboundId, item.product_model, item.product_name, item.outbound_date, item.quantity, item.customer_name, item.unit_price || 0]
        );
        return result.insertId;
    }

    static async createBatch(items: Omit<ShipList, 'id' | 'created_at'>[]): Promise<void> {
        if (items.length === 0) return;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Limit batch size to avoid packet too large errors
            const BATCH_SIZE = 500;
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                const values: any[] = [];
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');

                batch.forEach(item => {
                    values.push(
                        item.outbound_id,
                        item.product_model,
                        item.product_name,
                        item.outbound_date,
                        item.quantity,
                        item.customer_name,
                        item.unit_price || 0
                    );
                });

                await connection.execute(
                    `INSERT INTO shiplist (outbound_id, product_model, product_name, outbound_date, quantity, customer_name, unit_price) VALUES ${placeholders}`,
                    values
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

    static async upsertBatch(items: Omit<ShipList, 'id' | 'created_at'>[]): Promise<void> {
        if (items.length === 0) return;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const BATCH_SIZE = 500;
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                const values: any[] = [];
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');

                batch.forEach(item => {
                    values.push(
                        item.outbound_id,
                        item.product_model,
                        item.product_name,
                        item.outbound_date,
                        item.quantity,
                        item.customer_name,
                        item.unit_price || 0
                    );
                });

                // ON DUPLICATE KEY UPDATE: Update fields if outbound_id matches
                const sql = `
                    INSERT INTO shiplist (outbound_id, product_model, product_name, outbound_date, quantity, customer_name, unit_price) 
                    VALUES ${placeholders}
                    ON DUPLICATE KEY UPDATE
                        product_model = VALUES(product_model),
                        product_name = VALUES(product_name),
                        outbound_date = VALUES(outbound_date),
                        quantity = VALUES(quantity),
                        customer_name = VALUES(customer_name),
                        unit_price = VALUES(unit_price)
                `;

                await connection.execute(sql, values);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS shiplist (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    outbound_id VARCHAR(50) UNIQUE NOT NULL,
                    product_model VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NOT NULL,
                    outbound_date DATE NOT NULL,
                    quantity INT DEFAULT 1,
                    customer_name VARCHAR(255) NOT NULL,
                    unit_price DECIMAL(10, 2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Schema Migrations
            try {
                // Add unit_price if missing
                await pool.execute(`ALTER TABLE shiplist ADD COLUMN unit_price DECIMAL(10, 2) DEFAULT 0.00;`);
            } catch (err: any) { if (err.code !== 'ER_DUP_FIELDNAME') console.log('Unit price col exists'); }

            try {
                // Add outbound_id if missing
                await pool.execute(`ALTER TABLE shiplist ADD COLUMN outbound_id VARCHAR(50) UNIQUE;`);
                console.log('Added outbound_id column.');

                // If we just added the column, we might need to populate it for existing records
                // For simplicity, we can update in SQL or just leave null if allowed (but we set NOT NULL logic above for CREATE, ALTER usually allows NULL unless specified)
                // Let's force update existing nulls
                const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, created_at FROM shiplist WHERE outbound_id IS NULL');
                for (const row of rows) {
                    const fakeId = 'CK' + new Date(row.created_at).getTime() + Math.floor(Math.random() * 1000);
                    await pool.execute('UPDATE shiplist SET outbound_id = ? WHERE id = ?', [fakeId, row.id]);
                }
            } catch (err: any) { if (err.code !== 'ER_DUP_FIELDNAME') console.log('Outbound ID col exists'); }

            console.log('Shiplist table created/verified successfully');
        } catch (error) {
            console.error('Error initializing shiplist table:', error);
            throw error;
        }
    }
}
