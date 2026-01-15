import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrderController';

const router = Router();

router.get('/', PurchaseOrderController.getAll);
router.get('/suggestions', PurchaseOrderController.getSuggestions);
router.post('/', PurchaseOrderController.createPO);
router.post('/:id/confirm', PurchaseOrderController.confirmPO);

export default router;
