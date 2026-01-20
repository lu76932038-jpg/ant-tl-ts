import { Router } from 'express';
import { getAuditLogs, getLoginLogs } from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// 审计日志接口
router.get('/', authenticate, getAuditLogs);
// 登录日志接口 - 添加管理员校验
router.get('/login-logs', authenticate, requireAdmin, getLoginLogs);

export default router;
