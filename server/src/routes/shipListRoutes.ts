import express from 'express';
import { getShipList, createShipRecord, generateMockData, importShipData } from '../controllers/shipListController';

const router = express.Router();

router.get('/', getShipList);
router.post('/', createShipRecord);
router.post('/import', importShipData as any);
router.post('/generate-mock', generateMockData);

export default router;
