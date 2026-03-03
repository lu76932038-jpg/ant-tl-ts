
import { QichachaService } from '../services/QichachaService';
import { config } from '../config/env';

async function testQichacha() {
    console.log('--- 企查查官方 API 接入测试 ---');
    console.log('正在查询: 爱安特（常州）精密机械有限公司');

    if (!QichachaService.isConfigured()) {
        console.error('错误: 企查查 AppKey 或 SecretKey 未配置。');
        return;
    }

    try {
        const result = await QichachaService.fetchAll('爱安特（常州）精密机械有限公司', 'TEST_001');

        console.log('\n[查询成功]');
        console.log('------------------------------------');
        console.log(`公司名称: 爱安特（常州）精密机械有限公司`);
        console.log(`社会统一信用代码: ${result.businessRegistration.registrationNumber}`);
        console.log(`注册资本 (原始值): ${result.businessRegistration.registCapi}`);
        console.log(`经营状态: ${result.businessRegistration.bizStatus}`);
        console.log(`所属行业: ${result.businessRegistration.industry}`);
        console.log('------------------------------------');

        // 验证注册资本是否符合预期 (18000 万)
        const capiValue = parseFloat(result.businessRegistration.registCapi || '0');
        if (capiValue >= 18000) {
            console.log('✅ 验证通过: 注册资本已更新为最新的 18000.00 万元人民币级别。');
        } else {
            console.warn('⚠️ 验证警告: 注册资本仍显示为旧值或抓取不完整: ', capiValue);
        }

    } catch (error: any) {
        console.error('❌ 查询失败:', error.message);
    }
}

testQichacha();
