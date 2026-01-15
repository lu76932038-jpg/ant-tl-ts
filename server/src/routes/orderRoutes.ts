import { Router } from 'express';
import { getOrderByNo, getSalesSummary, queryOrderAI, chatWithOrders } from '../controllers/orderController';

const router = Router();

// GET /api/orders/summary - 获取销售员业绩汇总
router.get('/summary', getSalesSummary);

// GET /api/orders/:orderNo - 根据订单号查询
router.get('/:orderNo', getOrderByNo);

// POST /api/orders/chat - 自然语言对话查询
router.post('/chat', chatWithOrders);

// POST /api/orders/ai-query - AI 直接 SQL 查询
router.post('/ai-query', queryOrderAI);

export default router;
