
import axios from 'axios';

async function testDefault() {
    const token = 'eca290ee-df1d-4aff-bb93-4e264edc2e27';
    // 模拟 env.ts 里的错误默认域名 (缺少 .api 段)
    const apiBase = 'http://open.tianyancha.com/services/open/ic/baseinfo/2.0';
    const companyName = '爱安特（常州）精密机械有限公司';

    console.log('--- Testing Tianyancha Default Config (Likely wrong) ---');
    try {
        const response = await axios.get(apiBase, {
            params: { keyword: companyName },
            headers: { 'Authorization': token },
            timeout: 5000
        });
        console.log('Status:', response.status);
    } catch (error: any) {
        console.log('Failed as expected with default config!');
        if (error.response) {
            console.log('Status:', error.response.status);
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testDefault();
