import { Router } from 'express';
import { getAllUsers, updateUser, deleteUser, changePassword } from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// 普通用户可以修改自己的密码
router.post('/change-password', authenticate, changePassword);

// 用户管理路由仍需管理员权限
router.get('/', authenticate, requireAdmin, getAllUsers);
router.put('/:id', authenticate, requireAdmin, updateUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);

export default router;
