import { EntryListModel } from '../models/EntryList';
import pool from '../config/database';

async function main() {
    try {
        console.log('Starting to add test entries for SKU-TEST...');

        const sku = 'SKU-TEST';
        const now = new Date();

        const entries = [
            { days: 5, qty: 100, supplier: '测试供应商 A' },
            { days: 15, qty: 200, supplier: '测试供应商 B' },
            { days: 35, qty: 300, supplier: '测试供应商 C' }
        ];

        for (const entry of entries) {
            const arrivalDate = new Date(now);
            arrivalDate.setDate(arrivalDate.getDate() + entry.days);
            const arrivalDateStr = arrivalDate.toISOString().split('T')[0];

            console.log(`Adding entry: ${entry.qty} pcs, arriving on ${arrivalDateStr}`);

            await EntryListModel.create({
                sku: sku,
                product_name: '测试产品',
                quantity: entry.qty,
                unit_price: 12.5,
                arrival_date: arrivalDateStr,
                supplier: entry.supplier,
                purchase_date: new Date().toISOString().split('T')[0]
            });
        }

        console.log('Successfully added entries.');

    } catch (error) {
        console.error('Error adding entries:', error);
    } finally {
        await pool.end();
    }
}

main();
