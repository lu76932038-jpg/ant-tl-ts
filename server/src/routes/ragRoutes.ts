import express from 'express';
import { getChatLogs, getChatLogById, getPrompts, savePrompt, getSchemaDocs, saveSchemaDoc } from '../controllers/ragController';
const router = express.Router();

// Logs
router.get('/logs', getChatLogs);
router.get('/logs/:id', getChatLogById);

// Prompts
router.get('/prompts', getPrompts);
router.post('/prompts', savePrompt);

// Schema Docs
router.get('/schema', getSchemaDocs);
router.post('/schema', saveSchemaDoc);

// Sessions
import { getSessions, createSession, getSessionMessages, updateSession, deleteSession } from '../controllers/ragController';
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.get('/sessions/:id/messages', getSessionMessages);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// Feedback
import { submitFeedback } from '../controllers/ragController';
router.post('/logs/:id/feedback', submitFeedback);

router.post('/logs/:id/feedback', submitFeedback);

// Optimization
import { getEvaluationStats, getSuggestions, applySuggestion } from '../controllers/OptimizationController';
router.get('/optimization/stats', getEvaluationStats);
router.get('/optimization/suggestions', getSuggestions);
router.post('/optimization/apply', applySuggestion);

export default router;
