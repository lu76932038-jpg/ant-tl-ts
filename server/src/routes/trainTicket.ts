import { Router } from 'express';
import multer from 'multer';
import { TrainTicketController } from '../controllers/trainTicketController';

const router = Router();
// Use memory storage to process files without saving to disk first
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const controller = new TrainTicketController();

router.post('/process', upload.single('file'), controller.processTickets);

export default router;
