import { Router } from 'express';
import { analyzeInquiry } from '../controllers/inquiryController';
import { authenticate } from '../middleware/auth';
import statsRouter from './statsRoutes';
import feedbackRouter from './feedbackRoutes';

const router = Router();

router.post('/analyze-inquiry', authenticate, analyzeInquiry);
router.use('/stats', statsRouter);
router.use('/feedback', feedbackRouter);

export default router;
