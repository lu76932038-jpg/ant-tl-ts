import express from 'express';
import { PurchasePlanController } from '../controllers/purchasePlanController';

const router = express.Router();

router.get('/', PurchasePlanController.getAll);
router.post('/', PurchasePlanController.createPlan);
router.post('/:id/convert', PurchasePlanController.convertToPO);
router.post('/:id/cancel', PurchasePlanController.cancelPlan);

export default router;
