import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { StockModel } from './Stock';

export interface EntryList {
    id: number;
    entry_id: string; // Unique ID like IN-20231015-001
    sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    purchase_date?: string; // YYYY-MM-DD
    arrival_date: string; // YYYY-MM-DD
    supplier: string;
    warehouse?: string;
    status: 'PENDING' | 'RECEIVED';
    created_at?: Date;
}

export class EntryListModel {
    static async findAll(): Promise<EntryList[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM entry_list ORDER BY arrival_date DESC, created_at DESC'
        );
        return rows as EntryList[];
    }

    // Get future entries for a specific SKU (for simulation)
    static async findFutureEntries(sku: string): Promise<EntryList[]> {
        // Only count PENDING entries for future simulation
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT * FROM entry_list WHERE sku = ? AND status = 'PENDING' AND arrival_date >= CURDATE() ORDER BY arrival_date ASC",
            [sku]
        );
        return rows as EntryList[];
    }

    // Get ALL pending entries for a specific SKU (including overdue)
    static async findPendingEntries(sku: string): Promise<EntryList[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT * FROM entry_list WHERE sku = ? AND status = 'PENDING' ORDER BY arrival_date ASC",
            [sku]
        );
        return rows as EntryList[];
    }

    private static generateEntryId(): string {
        const prefix = 'IN';
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${yyyy}${mm}${dd}${timestamp}${random}`;
    }

    static async create(item: Omit<EntryList, 'id' | 'created_at' | 'entry_id' | 'status'>): Promise<number> {
        const entryId = EntryListModel.generateEntryId();
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO entry_list (entry_id, sku, product_name, quantity, unit_price, purchase_date, arrival_date, supplier, warehouse, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [entryId, item.sku, item.product_name, item.quantity, item.unit_price, item.purchase_date || null, item.arrival_date, item.supplier, item.warehouse || '', 'PENDING']
        );
        return result.insertId;
    }

    static async confirmReceipt(id: number): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Get Entry Info
            const [rows] = await connection.execute<RowDataPacket[]>(
                "SELECT * FROM entry_list WHERE id = ? AND status = 'PENDING' FOR UPDATE",
                [id]
            );

            if (rows.length === 0) {
                await connection.rollback();
                return false;
            }

            const entry = rows[0] as EntryList;

            // 2. Update Entry Status
            await connection.execute(
                "UPDATE entry_list SET status = 'RECEIVED' WHERE id = ?",
                [id]
            );

            // 3. Update Real Stock (Handle increment logic here or call StockModel if it supports transaction connection - standard pool doesn't share transaction context easily without passing connection. 
            // For simplicity, we execute raw update here or verify if StockModel allows passing connection. 
            // Looking at StockModel, it uses 'pool.execute'. So we must duplicate valid update logic or refactor StockModel.
            // Let's do raw update here for safety.)

            // Check if stock record exists
            const [stockRows] = await connection.execute<RowDataPacket[]>(
                'SELECT * FROM stock_list WHERE sku = ?',
                [entry.sku]
            );

            if (stockRows.length > 0) {
                await connection.execute(
                    'UPDATE stock_list SET in_stock = in_stock + ? WHERE sku = ?',
                    [entry.quantity, entry.sku]
                );
            } else {
                // If product not in stock list but in entry list, perhaps insert? (Assuming stock list should have it)
                // For now, assume stock list has it or we ignore (or insert basic).
                await connection.execute(
                    'INSERT INTO stock_list (sku, product_name, in_stock) VALUES (?, ?, ?)',
                    [entry.sku, entry.product_name, entry.quantity]
                );
            }

            await connection.commit();
            return true;
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
                CREATE TABLE IF NOT EXISTS entry_list (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    entry_id VARCHAR(50) UNIQUE NOT NULL,
                    sku VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NOT NULL,
                    quantity INT DEFAULT 1,
                    unit_price DECIMAL(10, 2) DEFAULT 0.00,
                    purchase_date DATE NULL,
                    arrival_date DATE NOT NULL,
                    supplier VARCHAR(255) NOT NULL,
                    warehouse VARCHAR(100) NULL,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_sku (sku),
                    INDEX idx_date (arrival_date)
                )
            `);
            // Check if purchase_date column exists, if not add it (Migration for existing db)
            const [columns] = await pool.execute<RowDataPacket[]>(
                "SHOW COLUMNS FROM entry_list LIKE 'purchase_date'"
            );
            if (columns.length === 0) {
                await pool.execute("ALTER TABLE entry_list ADD COLUMN purchase_date DATE NULL AFTER unit_price");
                console.log('Added purchase_date column to entry_list');
            }

            // Check for warehouse column
            const [warehouseCols] = await pool.execute<RowDataPacket[]>(
                "SHOW COLUMNS FROM entry_list LIKE 'warehouse'"
            );
            if (warehouseCols.length === 0) {
                await pool.execute("ALTER TABLE entry_list ADD COLUMN warehouse VARCHAR(100) NULL AFTER supplier");
                console.log('Added warehouse column to entry_list');
            }

            // 为 SKU-TEST 生成测试在途数据（如果不存在）
            const [existingPending] = await pool.execute<RowDataPacket[]>(
                "SELECT COUNT(*) as count FROM entry_list WHERE sku = 'SKU-TEST' AND status = 'PENDING'"
            );
            if (existingPending[0].count === 0) {
                console.log('Generating mock PENDING entry_list data for SKU-TEST...');
                const suppliers = ['深圳供应商A', '东莞厂家直供', '苏州代工厂'];
                const now = new Date();

                // 生成3个批次的在途数据
                const mockBatches = [
                    { daysFromNow: 7, quantity: 500 },   // 7天后到货
                    { daysFromNow: 14, quantity: 800 },  // 14天后到货
                    { daysFromNow: -3, quantity: 200 },  // 逾期3天（用于测试逾期显示）
                ];

                for (let i = 0; i < mockBatches.length; i++) {
                    const batch = mockBatches[i];
                    const arrivalDate = new Date(now);
                    arrivalDate.setDate(arrivalDate.getDate() + batch.daysFromNow);
                    const arrivalDateStr = arrivalDate.toISOString().split('T')[0];

                    const purchaseDate = new Date(arrivalDate);
                    purchaseDate.setDate(purchaseDate.getDate() - 30); // 假设提前30天采购
                    const purchaseDateStr = purchaseDate.toISOString().split('T')[0];

                    const entryId = `IN${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}MOCK${i}`;
                    const supplier = suppliers[i % suppliers.length];

                    await pool.execute(
                        'INSERT INTO entry_list (entry_id, sku, product_name, quantity, unit_price, purchase_date, arrival_date, supplier, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [entryId, 'SKU-TEST', '测试产品', batch.quantity, 12.50, purchaseDateStr, arrivalDateStr, supplier, 'PENDING']
                    );
                }
                console.log('Mock PENDING entry_list data generated for SKU-TEST (3 batches).');
            }

            console.log('entry_list table initialized.');
        } catch (error) {
            console.error('Error initializing EntryList table:', error);
        }
    }
}
