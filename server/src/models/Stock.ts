import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export enum StockStatus {
    ALL = '全部',
    CRITICAL = '急需补货',
    WARNING = '库存预警',
    HEALTHY = '健康',
    STAGNANT = '呆滞'
}

export interface Stock {
    id: number;
    sku: string;
    name: string;
    status: StockStatus;
    inStock: number;
    available: number;
    inTransit: number;
    unit?: string;
    warehouse?: string;
    product_type?: string;
    created_at?: Date;
    updated_at?: Date;
}

export const INITIAL_STOCK_DATA: Omit<Stock, 'id'>[] = [
    { sku: 'SKU-102938', name: '无线人体工学鼠标', status: StockStatus.CRITICAL, inStock: 12, available: 8, inTransit: 0, unit: '个' },
    { sku: 'SKU-554210', name: '机械键盘 Pro 2', status: StockStatus.WARNING, inStock: 45, available: 40, inTransit: 50, unit: '个' },
    { sku: 'SKU-992100', name: '智能降噪耳机', status: StockStatus.HEALTHY, inStock: 320, available: 310, inTransit: 100, unit: '个' },
    { sku: 'SKU-112233', name: 'USB-C 数据线套装', status: StockStatus.STAGNANT, inStock: 850, available: 850, inTransit: 0, unit: '套' },
    { sku: 'SKU-445566', name: '4K 超高清显示器', status: StockStatus.CRITICAL, inStock: 3, available: 1, inTransit: 20, unit: '台' },
    { sku: 'SKU-778899', name: '蓝牙便携音箱', status: StockStatus.HEALTHY, inStock: 150, available: 145, inTransit: 30, unit: '个' },
    { sku: 'SKU-234567', name: '平板电脑支架', status: StockStatus.HEALTHY, inStock: 420, available: 410, inTransit: 0, unit: '个' },
    { sku: 'SKU-890123', name: 'Type-C 扩展坞', status: StockStatus.WARNING, inStock: 18, available: 15, inTransit: 100, unit: '个' },
    { sku: 'SKU-345678', name: '笔记本散热器', status: StockStatus.HEALTHY, inStock: 210, available: 205, inTransit: 0, unit: '个' },
    { sku: 'SKU-901234', name: '高清网络摄像头', status: StockStatus.HEALTHY, inStock: 85, available: 80, inTransit: 20, unit: '个' },
    { sku: 'SKU-567890', name: '游戏手柄 X版', status: StockStatus.STAGNANT, inStock: 350, available: 350, inTransit: 0, unit: '个' },
    { sku: 'SKU-123789', name: '智能穿戴手环', status: StockStatus.HEALTHY, inStock: 560, available: 550, inTransit: 100, unit: '个' },
    { sku: 'SKU-654321', name: '便携式SSD 1TB', status: StockStatus.WARNING, inStock: 25, available: 22, inTransit: 60, unit: '个' },
    { sku: 'SKU-987654', name: '桌面收纳盒', status: StockStatus.HEALTHY, inStock: 1200, available: 1150, inTransit: 0, unit: '套' },
    { sku: 'SKU-321654', name: '氮化镓充电器 65W', status: StockStatus.HEALTHY, inStock: 280, available: 275, inTransit: 50, unit: '个' },
    { sku: 'SKU-774411', name: '工业级路由器', status: StockStatus.STAGNANT, inStock: 140, available: 140, inTransit: 0, unit: '台' },
];

export class StockModel {
    static async findAll(): Promise<Stock[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM StockList ORDER BY created_at DESC'
        );
        return rows as Stock[];
    }

    static async findBySku(sku: string): Promise<Stock | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM StockList WHERE sku = ?',
            [sku]
        );
        return (rows.length > 0 ? rows[0] : null) as Stock | null;
    }

    static async create(stock: Omit<Stock, 'id'>): Promise<number> {
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO StockList (sku, name, status, inStock, available, inTransit, unit, warehouse, product_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                stock.sku,
                stock.name,
                stock.status,
                stock.inStock,
                stock.available,
                stock.inTransit,
                stock.unit || '个',
                stock.warehouse || null,
                stock.product_type || null
            ]
        );
        return result.insertId;
    }

    static async update(id: number, data: Partial<Stock>): Promise<void> {
        const entries = Object.entries(data).filter(([key]) => key !== 'id');
        if (entries.length === 0) return;

        const fields = entries.map(([key]) => `${key} = ?`).join(', ');
        const values = entries.map(([, value]) => value);

        await pool.execute(
            `UPDATE StockList SET ${fields} WHERE id = ?`,
            [...values, id]
        );
    }

    static async initializeTable(mockData: any[]): Promise<void> {
        try {
            const [tables] = await pool.execute<RowDataPacket[]>(
                "SHOW TABLES LIKE 'StockList'"
            );

            if (tables.length === 0) {
                await pool.execute(`
                    CREATE TABLE IF NOT EXISTS StockList (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        sku VARCHAR(100) NOT NULL UNIQUE,
                        name VARCHAR(255) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        inStock INT DEFAULT 0,
                        available INT DEFAULT 0,
                        inTransit INT DEFAULT 0,
                        unit VARCHAR(20) DEFAULT '个',
                        warehouse VARCHAR(50),
                        product_type VARCHAR(100),
                        is_stocking_recommended BOOLEAN DEFAULT FALSE,
                        is_stocking_enabled BOOLEAN DEFAULT FALSE,
                        is_dead_stock BOOLEAN DEFAULT FALSE,
                        risk_status VARCHAR(20) DEFAULT 'HEALTHY',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                `);
                console.log('StockList table created successfully');
            } else {
                // Migration: Check and set columns if missing
                try {
                    await pool.execute("ALTER TABLE StockList ADD COLUMN unit VARCHAR(20) DEFAULT '个'");
                } catch (e: any) { if (e.code !== 'ER_DUP_FIELDNAME') { /* ignore */ } }

                try {
                    await pool.execute("ALTER TABLE StockList ADD COLUMN warehouse VARCHAR(50)");
                    console.log('Added column warehouse to StockList');
                } catch (e: any) { if (e.code !== 'ER_DUP_FIELDNAME') { /* ignore */ } }

                try {
                    await pool.execute("ALTER TABLE StockList ADD COLUMN product_type VARCHAR(100)");
                    console.log('Added column product_type to StockList');
                    await pool.execute("ALTER TABLE StockList ADD COLUMN product_type VARCHAR(100)");
                    console.log('Added column product_type to StockList');
                } catch (e: any) { if (e.code !== 'ER_DUP_FIELDNAME') { /* ignore */ } }

                try {
                    await pool.execute("ALTER TABLE StockList ADD COLUMN is_stocking_recommended BOOLEAN DEFAULT FALSE");
                    await pool.execute("ALTER TABLE StockList ADD COLUMN is_stocking_enabled BOOLEAN DEFAULT FALSE");
                    await pool.execute("ALTER TABLE StockList ADD COLUMN is_dead_stock BOOLEAN DEFAULT FALSE");
                    await pool.execute("ALTER TABLE StockList ADD COLUMN risk_status VARCHAR(20) DEFAULT 'HEALTHY'");
                    console.log('Added persistence columns to StockList');
                } catch (e: any) { if (e.code !== 'ER_DUP_FIELDNAME') { /* ignore */ } }
            }

            // 检查当前数据量
            const [rows] = await pool.execute<RowDataPacket[]>(
                'SELECT COUNT(*) as count FROM StockList'
            );

            const currentCount = rows[0].count;

            // 确保 SKU-TEST 存在 (即使数据量已经足够，也要保证测试数据存在)
            const [testSkuRows] = await pool.execute<RowDataPacket[]>(
                'SELECT * FROM StockList WHERE sku = ?',
                ['SKU-TEST']
            );

            if (testSkuRows.length === 0) {
                console.log('Inserting SKU-TEST into StockList...');
                await pool.execute(
                    'INSERT INTO StockList (sku, name, status, inStock, available, inTransit, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    ['SKU-TEST', '测试产品', StockStatus.HEALTHY, 5000, 4800, 200, '个']
                );
            }

            // 当数据量不足 300 时，自动补充模拟数据至 300 条 - DISABLED V3.0.1
            /*
            const targetCount = 300;
            if (currentCount < targetCount) {
                console.log(`StockList table has ${currentCount} entries, supplementing to ${targetCount}...`);
                const itemsToGenerate = targetCount - currentCount;
                const baseData = INITIAL_STOCK_DATA; // 使用预定义的模拟数据作为模板

                for (let i = 0; i < itemsToGenerate; i++) {
                    const randomIndex = Math.floor(Math.random() * baseData.length);
                    const templateItem = baseData[randomIndex];

                    // 生成一个唯一的 SKU
                    const newSku = `SKU-GEN-${Date.now()}-${i}`;

                    await pool.execute(
                        'INSERT INTO StockList (sku, name, status, inStock, available, inTransit) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            newSku,
                            templateItem.name,
                            templateItem.status,
                            templateItem.inStock,
                            templateItem.available,
                            templateItem.inTransit
                        ]
                    );
                }
                console.log(`Supplemented ${itemsToGenerate} entries. Total count: ${targetCount}`);
            }
            */

        } catch (error) {
            console.error('Error initializing StockList table:', error);
            throw error;
        }
    }
}
