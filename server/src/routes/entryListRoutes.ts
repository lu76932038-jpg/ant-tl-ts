import { Router } from 'express';
import { EntryListController } from '../controllers/entryListController';

const router = Router();

router.get('/', EntryListController.getAll);
router.post('/', EntryListController.create);
router.post('/:id/confirm', EntryListController.confirmReceipt);

export default router;
