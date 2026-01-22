import { Router } from 'express';
import { analyzeInquiry } from '../controllers/inquiryController';
import { authenticate } from '../middleware/auth';
import statsRouter from './statsRoutes';

const router = Router();

router.post('/analyze-inquiry', authenticate, analyzeInquiry);
router.use('/stats', statsRouter);

export default router;
