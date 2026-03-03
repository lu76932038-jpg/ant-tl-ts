
import pool from './src/config/database.ts';
import { CustomerCreditRiskModel } from './src/models/CustomerCreditRisk.ts';

async function runMigrate() {
    try {
        console.log('Running credit risk table migration...');
        await CustomerCreditRiskModel.initializeTable();
        console.log('Migration successful.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrate();
