import { Request, Response } from 'express';
import { ShipListModel } from '../models/ShipList';

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
