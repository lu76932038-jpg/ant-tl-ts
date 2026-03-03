import { QichachaService } from './src/services/QichachaService';

async function test() {
    console.log('--- 测试修复后的 QichachaService.fetchAll (模拟客户端刷新企查查) ---');
    try {
        const companyName = '深圳市腾讯计算机系统有限公司';
        const result = await QichachaService.fetchAll(companyName, 'TEST-123');
        console.log(`\n\n------- 获取 [${companyName}] 企查查数据结果 -------`);
        console.log(JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('------- 请求出错 -------');
        console.error(e.message);
    }
}

test();
