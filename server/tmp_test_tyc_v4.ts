import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: './.env' });

async function testTianyancha() {
    const token = process.env.TIANYANCHA_TOKEN;
    const apiBase = 'http://open.api.tianyancha.com/services/open/ic/baseinfoV2/2.0';
    const companyName = '爱安特（常州）精密机械有限公司';

    console.log('--- Tianyancha Connection Test V4 ---');
    console.log(`Target URL: ${apiBase}`);
    console.log(`Company: ${companyName}`);

    try {
        const response = await axios.get(apiBase, {
            params: { name: companyName },
            headers: {
                'Authorization': token || ''
            },
            timeout: 10000
        });

        console.log('Status:', response.status);
        console.log('Response Body:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Test Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testTianyancha();
