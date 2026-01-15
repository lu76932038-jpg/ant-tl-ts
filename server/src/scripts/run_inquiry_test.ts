import fetch from 'node-fetch';
import { config } from '../config/env';

async function main() {
    // 1. 登录获取 JWT token
    const loginResponse = await fetch(`http://localhost:${config.server.port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'test123' })
    });
    const loginData: any = await loginResponse.json();
    const token = loginData.token;
    console.log('Login token:', token);

    // 2. 调用询价解析接口
    const inquiryPayload = {
        content: `询价单
客户：上海某某机械有限公司
项目：P2025001

1. 施耐德断路器 iC65N 2P C16A, 10个
2. 接触器 LC1D18M7C, 5台, 目标价 85元
3. 欧姆龙继电器 MY2N-J DC24V, 20pcs
备注：请提供含税运价，急需现货。`,
        model: 'deepseek',
        fileName: 'sample.txt'
    };

    const inquiryResponse = await fetch(`http://localhost:${config.server.port}/api/analyze-inquiry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inquiryPayload)
    });
    const inquiryResult = await inquiryResponse.json();
    console.log('Inquiry result:', JSON.stringify(inquiryResult, null, 2));
}

main().catch(err => console.error('Error:', err));
