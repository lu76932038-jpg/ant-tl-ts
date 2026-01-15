import { Router } from 'express';
import path from 'path';

const router = Router();

// GET /debug-page 直接返回 debug.html（无需登录）
router.get('/debug-page', (req, res) => {
    const filePath = path.resolve(__dirname, '../../public/debug.html');
    res.sendFile(filePath);
});

export default router;
