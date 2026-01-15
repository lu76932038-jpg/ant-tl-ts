import { Router } from 'express';
import path from 'path';

const router = Router();

// Serve the inquiry UI page under /admin/inquiry
router.get('/inquiry', (req, res) => {
    const filePath = path.join(__dirname, '../../public/inquiry.html');
    res.sendFile(filePath);
});

export default router;
