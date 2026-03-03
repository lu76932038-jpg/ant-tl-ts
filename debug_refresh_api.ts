
import pool from './server/src/config/database';
import { CustomerCreditRiskController } from './server/src/controllers/CustomerCreditRiskController';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

async function debug() {
    console.log('--- Integrated Debug: refreshExternalRisk ---');
    const customerCode = 'CUST050612'; // 爱安特的代码 (根据截图)

    // 模拟 Express Request/Response
    const req: any = {
        params: { customerCode },
        body: { source: 'tianyancha' }
    };

    const res: any = {
        status: function (s: number) { this.statusCode = s; return this; },
        json: function (j: any) { this.data = j; return this; },
        statusCode: 200,
        data: null
    };

    try {
        await CustomerCreditRiskController.refreshExternalRisk(req, res);
        console.log('Result Status:', res.statusCode);
        console.log('Result Data:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.error('Crash in Controller:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

debug();
