import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 审计日志接口，认证即可（控制器会根据角色过滤）
router.get('/', authenticate, getAuditLogs);

export default router;
