import { Router } from 'express';
import { analyzeInquiry } from '../controllers/inquiryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/analyze-inquiry', authenticate, analyzeInquiry);

export default router;
