import { Request, Response } from 'express';
import { ShipListModel } from '../models/ShipList';
import { StockModel, StockStatus } from '../models/Stock';

export const getShipList = async (req: Request, res: Response) => {
    try {
        const ships = await ShipListModel.findAll();
        res.json(ships);
    } catch (error) {
        console.error('Error fetching shiplist:', error);
        res.status(500).json({ error: 'Failed to fetch shiplist' });
    }
};

export const createShipRecord = async (req: Request, res: Response) => {
    try {
        const { product_model, product_name, outbound_date, quantity, customer_name, unit_price } = req.body;

        if (!product_model || !product_name || !outbound_date || !quantity || !customer_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = await ShipListModel.create({
            product_model,
            product_name,
            outbound_date,
            quantity: Number(quantity),
            customer_name,
            unit_price: unit_price ? Number(unit_price) : 0
        });

        res.status(201).json({ id, message: 'Outbound record created successfully' });
    } catch (error) {
        console.error('Error creating outbound record:', error);
        res.status(500).json({ error: 'Failed to create outbound record' });
    }
};

export const generateMockData = async (req: Request, res: Response) => {
    try {
        const SKU = 'SKU-TEST';
        const NAME = '测试产品';
        const START_DATE = new Date('2021-01-01');
        const END_DATE = new Date(); // Today

        const mockItems: any[] = [];
        const customers = ['上海贸易有限公司', '北京科技发展部', '广州电子元件厂', '深圳创新科技有限公司', '成都物流中心', '武汉制造基地'];

        for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
            // Generate 1 record per day
            const dailyCount = 1;

            for (let i = 0; i < dailyCount; i++) {
                const dateStr = d.toISOString().split('T')[0];
                const quantity = Math.floor(Math.random() * 9999) + 1; // 1 to 9999
                const unitPrice = (Math.random() * 5) + 10; // 10 to 15 (float)
                const customer = customers[Math.floor(Math.random() * customers.length)];

                // Generate unique outbound ID locally to save DB roundtrips/complexity in batch
                const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const outboundId = `CK${dateStr.replace(/-/g, '')}${randomSuffix}${i}`; // Ensure uniqueness with loop index

                mockItems.push({
                    outbound_id: outboundId,
                    product_model: SKU,
                    product_name: NAME,
                    outbound_date: dateStr,
                    quantity: quantity,
                    customer_name: customer,
                    unit_price: Number(unitPrice.toFixed(2))
                });
            }
        }

        console.log(`Generating ${mockItems.length} mock records...`);
        await ShipListModel.createBatch(mockItems);

        res.json({ message: `Successfully generated ${mockItems.length} mock records for ${SKU}` });
    } catch (error) {
        console.error('Error generating mock data:', error);
        res.status(500).json({ error: 'Failed to generate mock data' });
    }
};

export const importShipData = async (req: Request, res: Response) => {
    try {
        const items = req.body; // Expect JSON array
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid data format. Expected non-empty array.' });
        }

        const validItems: any[] = [];
        const createdSkus = new Set<string>();
        let newSkuCount = 0;

        // 1. Pre-process and validate
        // Since we might have many rows, we process them sequentially or in chunks.
        // For simplicity and safety (checking DB check), we do it sequentially for SKU checks.
        // Optimization: Fetch ALL existing SKUs first to avoid N queries.

        // Optimization: Fetch ALL existing SKUs first to avoid N queries.
        const allStock = await StockModel.findAll();
        const existingSkus = new Set(allStock.map(s => s.sku));

        for (const item of items) {
            // Basic Validation
            if (!item.product_model || !item.product_name || !item.outbound_date || !item.quantity || !item.customer_name) {
                continue; // Skip invalid rows or we could throw error
            }

            const sku = item.product_model;

            // 2. Auto-create Product if missing
            if (!existingSkus.has(sku) && !createdSkus.has(sku)) {
                console.log(`Auto-creating new product from import: ${sku}`);
                console.log(`Auto-creating new product from import: ${sku}`);
                await StockModel.create({
                    sku: sku,
                    name: item.product_name, // Use the name from import
                    status: StockStatus.HEALTHY, // Default Healthy
                    inStock: 0,
                    available: 0,
                    inTransit: 0,
                    unit: '个'
                });
                createdSkus.add(sku);
                newSkuCount++;
            }

            // 3. Prepare Ship Record
            // If outbound_id is provided, check uniqueness? 
            // For now, let's assume if it's provided we use it, if not we generate it. 
            // ShipListModel.createBatch doesn't auto-generate if we pass it, 
            // BUT createBatch logic in Model (as checked previously) assumes we pass everything.
            // Let's look at ShipListModel.createBatch again. 
            // It expects `outbound_id` in the item.

            let oid = item.outbound_id;
            if (!oid) {
                // We need to generate one. 
                // Since model method is private or static, we might need access or replicate logic.
                // Or better, let's update createBatch in Model to handle missing IDs? 
                // For now, replicate logic here to keep Model simple batch insert.
                const prefix = 'CK';
                const d = new Date(); // Use current time for import operation part
                // Using random to avoid collision in same batch milliseconds
                const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                // Simple unique ID for batch
                oid = `${prefix}-${Date.now()}-${random}-${validItems.length}`;
            }

            validItems.push({
                outbound_id: oid,
                product_model: sku,
                product_name: item.product_name,
                outbound_date: item.outbound_date,
                quantity: Number(item.quantity),
                customer_name: item.customer_name,
                unit_price: item.unit_price ? Number(item.unit_price) : 0
            });
        }

        if (validItems.length > 0) {
            await ShipListModel.upsertBatch(validItems);
        }

        res.json({
            success: true,
            totalImported: validItems.length,
            newSkusCreated: newSkuCount
        });

    } catch (error) {
        console.error('Error importing ship data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
};
