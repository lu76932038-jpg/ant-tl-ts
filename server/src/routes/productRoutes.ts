import express from 'express';
import { ProductController } from '../controllers/productController';

const router = express.Router();

router.get('/:sku/detail', ProductController.getDetail as unknown as express.RequestHandler);
router.post('/:sku/strategy', ProductController.updateStrategy as unknown as express.RequestHandler);

export default router;
