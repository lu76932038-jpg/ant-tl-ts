import { Router } from 'express';
import { StockController } from '../controllers/stockController';

const router = Router();

router.get('/', StockController.getAllStocks);
router.post('/', StockController.createStock);
router.post('/initialize', StockController.initialize);

export default router;
