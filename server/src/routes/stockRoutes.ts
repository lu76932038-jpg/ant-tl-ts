import { Router } from 'express';
import { StockController } from '../controllers/stockController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, StockController.getAllStocks);
router.post('/', StockController.createStock);
router.post('/initialize', StockController.initialize);

export default router;
