import { Request, Response } from 'express';
import { config } from '../config/env';
import path from 'path';

export class UploadController {
    static async uploadImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Generate public URL
            // Assuming express.static serves from '../public' and uploads are in '../public/uploads'
            // The file path returned by multer is absolute or relative depending on config.
            // But we typically configured destination to 'public/uploads'.

            const filename = req.file.filename;
            const url = `/uploads/${filename}`; // Public URL

            res.json({
                message: 'Upload successful',
                url: url,
                originalName: req.file.originalname
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
}
