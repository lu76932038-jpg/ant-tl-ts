import '../src/config/env';
import { ShipListModel } from '../src/models/ShipList';

const run = async () => {
    try {
        console.log('Running EXTENDED invalid data tests...');

        // 1. Test NaN Quantity (e.g. "2,000")
        console.log('Testing "2,000" Quantity...');
        try {
            // Mimic Controller logic: Number("2,000") -> NaN
            const qty = Number("2,000"); // NaN

            await ShipListModel.upsertBatch([{
                outbound_id: `FAIL-QTY-${Date.now()}`,
                product_model: `SKU-FAIL-QTY`,
                product_name: `Fail Product`,
                outbound_date: '2023-01-01',
                quantity: qty, // NaN
                customer_name: 'Fail Cust',
                unit_price: 10
            }]);
            console.log('NaN Quantity: Success (Unexpected)');
        } catch (e: any) {
            console.log('NaN Quantity: Failed (Expected)');
            console.log('Error:', e.message);
        }

        // 2. Test Invalid Unit Price (e.g. "20元")
        console.log('Testing "20元" Price...');
        try {
            const price = Number("20元"); // NaN

            await ShipListModel.upsertBatch([{
                outbound_id: `FAIL-PRICE-${Date.now()}`,
                product_model: `SKU-FAIL-PRICE`,
                product_name: `Fail Product`,
                outbound_date: '2023-01-01',
                quantity: 1,
                customer_name: 'Fail Cust',
                unit_price: price // NaN
            }]);
            console.log('NaN Price: Success (Unexpected)');
        } catch (e: any) {
            console.log('NaN Price: Failed (Expected)');
            console.log('Error:', e.message);
        }

        // 3. Test Very Long String (Data Truncation)
        console.log('Testing Long Customer Name...');
        try {
            await ShipListModel.upsertBatch([{
                outbound_id: `FAIL-LEN-${Date.now()}`,
                product_model: `SKU-FAIL-LEN`,
                product_name: `Fail Product`,
                outbound_date: '2023-01-01',
                quantity: 1,
                customer_name: 'A'.repeat(300), // Exceeds 255?
                unit_price: 10
            }]);
            console.log('Long Name: Success (Unexpected)');
        } catch (e: any) {
            console.log('Long Name: Failed (Expected)');
            console.log('Error:', e.message);
        }

        process.exit(0);

    } catch (error) {
        console.error('Script Error', error);
        process.exit(1);
    }
};

run();
