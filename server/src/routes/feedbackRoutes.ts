import express from 'express';
import { createFeedback, getFeedbacks } from '../controllers/feedbackController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createFeedback);
router.get('/', authenticate, getFeedbacks);

export default router;
