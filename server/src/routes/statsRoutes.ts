import { Router } from 'express';
import { getUsageStats } from '../controllers/statsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/usage', authenticate, getUsageStats);

export default router;
