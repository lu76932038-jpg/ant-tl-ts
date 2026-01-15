import express from 'express';
import { getShipList, createShipRecord, generateMockData } from '../controllers/shipListController';

const router = express.Router();

router.get('/', getShipList);
router.post('/', createShipRecord);
router.post('/generate-mock', generateMockData);

export default router;
