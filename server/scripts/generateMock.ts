import { ShipListModel } from '../src/models/ShipList';
import pool from '../src/config/database';

const generateMockData = async () => {
    try {
        const SKU = 'SKU-TEST';
        const NAME = '测试产品';
        const START_DATE = new Date('2021-01-01');
        const END_DATE = new Date(); // Today

        const mockItems: any[] = [];
        const customers = ['上海贸易有限公司', '北京科技发展部', '广州电子元件厂', '深圳创新科技有限公司', '成都物流中心', '武汉制造基地'];

        console.log(`Generating data from ${START_DATE.toISOString()} to ${END_DATE.toISOString()}...`);

        // Initialize table first to ensure schema is correct
        await ShipListModel.initializeTable();

        for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
            // Generate 10-20 records per day
            const dailyCount = Math.floor(Math.random() * 11) + 10; // 10 to 20

            for (let i = 0; i < dailyCount; i++) {
                const dateStr = d.toISOString().split('T')[0];
                const quantity = Math.floor(Math.random() * 9999) + 1; // 1 to 9999
                const unitPrice = (Math.random() * 5) + 10; // 10 to 15 (float)
                const customer = customers[Math.floor(Math.random() * customers.length)];

                const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const outboundId = `CK${dateStr.replace(/-/g, '')}${randomSuffix}${i}`;

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

        console.log(`Inserting ${mockItems.length} mock records...`);
        // Use createBatch from Model
        await ShipListModel.createBatch(mockItems);

        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error generating mock data:', error);
        process.exit(1);
    }
};

generateMockData();
