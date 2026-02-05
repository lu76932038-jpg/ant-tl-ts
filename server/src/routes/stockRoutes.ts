import { Router } from 'express';
import { StockController } from '../controllers/stockController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, StockController.getAllStocks);
router.post('/', StockController.createStock);
router.get('/:sku/stocking-stats', authenticate, StockController.getStockingStats);
router.post('/initialize', StockController.initialize);
router.get('/settings/stock-defaults', authenticate, StockController.getStockDefaults);
router.post('/settings/stock-defaults', authenticate, StockController.saveStockDefaults);

export default router;
