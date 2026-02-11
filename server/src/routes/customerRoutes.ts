import express from 'express';
import { CustomerController } from '../controllers/CustomerController';

const router = express.Router();

router.get('/', CustomerController.getList);

export default router;
