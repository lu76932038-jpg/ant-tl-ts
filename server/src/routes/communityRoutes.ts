import { Router } from 'express';
import { CommunityController } from '../controllers/communityController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public read-only (optional) or Authenticated for all?
// Plan says "Authenticated for posting". Let's allow reading without auth if possible,
// but for simplicity and "corporate tool" nature, auth is usually default.
// The `authenticate` middleware is likely required for `req.user` populating in controller.

// Questions
router.get('/questions', CommunityController.getQuestions);
router.get('/questions/:id', CommunityController.getQuestionDetail);
router.post('/questions', authenticate, CommunityController.createQuestion);

// Answers
router.post('/questions/:questionId/answers', authenticate, CommunityController.createAnswer);

// Interactions
router.post('/vote', authenticate, CommunityController.vote);

export default router;
