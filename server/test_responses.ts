import axios from 'axios';
import { config } from './src/config/env';

async function testResponseFormat() {
    const { key, baseUrl } = config.sub2api;
    const model = 'gpt-5.3-codex-spark';
    const prompt = '测试请求格式：请返回一个包含 { "status": "ok" } 的 JSON，不要多余字符。';

    try {
        const res2 = await axios.post(`${baseUrl}/responses`, {
            model: model,
            input: prompt
        }, {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        console.log(JSON.stringify(res2.data, null, 2));
    } catch (e: any) {
        console.error('Test Error:', e.response?.data || e.message);
    }
}

testResponseFormat();
