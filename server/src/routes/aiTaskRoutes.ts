import { Router } from 'express';
import { AiTaskController } from '../controllers/aiTaskController';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

// 仅管理员能访问的 AI 任务路由
router.get('/', authenticate, requirePermission('admin'), AiTaskController.getAllTasks);
router.post('/', authenticate, requirePermission('admin'), AiTaskController.createTask);
router.put('/:id/status', authenticate, requirePermission('admin'), AiTaskController.updateTaskStatus);

export default router;
