
import { Router } from 'express';
import { CustomerCreditRiskController } from '../controllers/CustomerCreditRiskController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 基础认证已在 app.ts 的父级路由中处理，
// 如果这里需要额外的细粒度认证，请确保引用正确。
// router.use(authenticate); // 暂时注释掉，避免双重认证逻辑冲突，且目前已知 app.ts 已经包裹了 authenticate


router.get('/list', CustomerCreditRiskController.getList);
router.get('/stats', CustomerCreditRiskController.getStats);
router.get('/unassigned', CustomerCreditRiskController.getUnassigned);
router.get('/detail/:code', CustomerCreditRiskController.getDetail);
router.get('/history/:customerCode', CustomerCreditRiskController.getAiHistory);
router.post('/add', CustomerCreditRiskController.addCustomers);
router.post('/update', CustomerCreditRiskController.updateRisk);
router.post('/sync', CustomerCreditRiskController.sync);

// 企查查外部数据接口（优先走本地缓存，T+7失效后实时拉取）
router.get('/external/:customerCode', CustomerCreditRiskController.getExternalRisk);
// 手动强制刷新企查查数据（跳过缓存）
router.post('/external/:customerCode/refresh', CustomerCreditRiskController.refreshExternalRisk);

// DeepSeek AI 信用分析接口
router.post('/ai-analyze', CustomerCreditRiskController.analyzeWithAI);

// SUB2API 实时测试接口 (模拟抓取过程)
router.post('/test-sub2api', CustomerCreditRiskController.testSub2Api);

export default router;
