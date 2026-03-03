import axios from 'axios';
import { config } from './src/config/env';

async function testModels() {
    const { key, baseUrl } = config.sub2api;
    console.log(`Testing baseUrl: ${baseUrl}`);
    
    try {
        console.log(`\n\n------- 尝试请求 /models 路径 -------`);
        const response = await axios.get(`${baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${key}`,
            },
            timeout: 10000 
        });

        console.log('Result:', JSON.stringify(response.data, null, 2));
    } catch (e: any) {
        console.error('------- 请求出错 -------');
        console.error(e.response?.data || e.message);
    }
}

testModels();
