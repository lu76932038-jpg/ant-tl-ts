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

const normalizeDate = (input: any): string => {
    if (!input) return '';

    // Handle Excel Serial Date (Number)
    // Excel base date: Dec 30 1899. 
    // Logic: 25569 is the offset between Excel (1900-01-01) and Unix (1970-01-01) roughly.
    // Precise: new Date(1899, 11, 30) plus days.
    if (typeof input === 'number') {
        // Adjust for Excel leap year bug (1900 is not leap year in reality but Excel thinks so) if needed.
        // For modern dates (>March 1 1900), straightforward.
        const date = new Date(Math.round((input - 25569) * 86400 * 1000));
        // Tweak: ensure we get YYYY-MM-DD. 
        // toISOString() uses UTC. Excel dates usually implied local or "date only". 
        // We assume the date is intended to be the same globally (e.g. 2022-10-28).
        // Adding a small buffer (12 hours) prevents midnight rounding issues going back a day.
        date.setSeconds(date.getSeconds() + 43200); // 12 hours
        return date.toISOString().split('T')[0];
    }

    // Handle String
    if (typeof input === 'string') {
        const trimmed = input.trim();
        // Check YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        // Try parsing
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }

    return String(input);
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
        // Optimization: Fetch ALL existing SKUs first to avoid N queries.
        const allStock = await StockModel.findAll();
        // Use lowercase for case-insensitive comparison (MySQL is case-insensitive by default)
        const existingSkus = new Set(allStock.map(s => s.sku.toLowerCase()));

        for (const item of items) {
            // Basic Validation
            if (!item.product_model || !item.product_name || !item.outbound_date || !item.quantity || !item.customer_name) {
                // Try to normalize date before rejecting?
                // logic: parse `outbound_date` from item, even if it's number
            }

            // Normalize Date First
            const rawDate = item.outbound_date;
            const normalizedDate = normalizeDate(rawDate);

            // Re-validate details with normalized date
            if (!item.product_model || !item.product_name || !normalizedDate || !item.quantity || !item.customer_name) {
                continue; // Skip invalid rows
            }

            const sku = item.product_model;
            const skuLower = sku.toLowerCase();

            // 2. Auto-create Product if missing
            // check both existing DB and effectively created in this batch
            if (!existingSkus.has(skuLower) && !createdSkus.has(skuLower)) {
                try {
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
                    newSkuCount++;
                } catch (e: any) {
                    // Ignore duplicate entry error (e.g. case sensitivity race or existing)
                    if (e.code === 'ER_DUP_ENTRY') {
                        console.warn(`Skipped duplicate creation for SKU: ${sku}`);
                    } else {
                        throw e; // Rethrow other errors
                    }
                }
                // Mark as processed to prevent retries in loop
                createdSkus.add(skuLower);
            }

            // 3. Prepare Ship Record
            let oid = item.outbound_id;
            if (!oid) {
                const prefix = 'CK';
                const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                oid = `${prefix}-${Date.now()}-${random}-${validItems.length}`;
            }

            validItems.push({
                outbound_id: oid,
                product_model: sku,
                product_name: item.product_name,
                outbound_date: normalizedDate,
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

    } catch (error: any) {
        console.error('Error importing ship data:', error);
        res.status(500).json({
            error: 'Failed to import data',
            details: error.message || String(error)
        });
    }
};
