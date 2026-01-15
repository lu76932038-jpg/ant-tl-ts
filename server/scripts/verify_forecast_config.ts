
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const SKU = 'SKU-TEST';

async function verify() {
    try {
        console.log(`Starting verification v2 for SKU: ${SKU}`);

        // 1. Get initial strategy
        console.log('1. Fetching initial strategy...');
        let res = await axios.get(`${BASE_URL}/products/${SKU}/strategy`);
        let strategy = res.data.strategy;
        console.log('Initial Strategy:', strategy);

        // 2. Update strategy with start_year_month AND forecast_year_month
        const newStartMonth = '2025-01';
        const newForecastMonth = '2028-12';
        console.log(`2. Updating: Start=${newStartMonth}, End=${newForecastMonth}...`);

        const updatePayload = {
            ...strategy,
            start_year_month: newStartMonth,
            forecast_year_month: newForecastMonth,
            safety_stock_days: 0.8
        };

        res = await axios.post(`${BASE_URL}/products/${SKU}/strategy`, updatePayload);
        if (res.data.success) {
            console.log('Update successful.');
        } else {
            console.error('Update failed:', res.data);
            process.exit(1);
        }

        // 3. Verify persistence
        console.log('3. Verifying persistence...');
        res = await axios.get(`${BASE_URL}/products/${SKU}/strategy`);
        strategy = res.data.strategy;

        if (strategy.start_year_month === newStartMonth && strategy.forecast_year_month === newForecastMonth) {
            console.log('SUCCESS: Both Start and End dates persisted correctly!');
            console.log('Current Strategy:', strategy);
        } else {
            console.error(`FAILURE: Expected Start=${newStartMonth}, End=${newForecastMonth}. Got Start=${strategy.start_year_month}, End=${strategy.forecast_year_month}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
