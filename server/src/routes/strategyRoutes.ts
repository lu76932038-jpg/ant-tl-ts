import { Router } from 'express';
import { StrategyController } from '../controllers/strategyController';

const router = Router();

// Get Strategy & Supplier Info
router.get('/:sku/strategy', StrategyController.getStrategy);

// Update Strategy (Auto-Approve)
router.post('/:sku/strategy', StrategyController.updateStrategy);

// Get Audit Logs
router.get('/:sku/logs', StrategyController.getLogs);

export default router;
