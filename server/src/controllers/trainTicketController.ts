import { Request, Response } from 'express';
import { TrainTicketService } from '../services/trainTicketService';
import AdmZip from 'adm-zip';

export class TrainTicketController {
    private service: TrainTicketService;

    constructor() {
        this.service = new TrainTicketService();
    }

    public processTickets = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            // Process the ZIP
            const result = await this.service.processZip(req.file.buffer);

            // Create a Master ZIP to contain both results (Stateless approach)
            const masterZip = new AdmZip();

            // Add the "Clean ZIP" (Requirement 2)
            masterZip.addFile('clean_pdfs.zip', result.cleanZip);

            // Add the "Merged Result" (Requirement 3)
            // result.mergedFilename is either 'merged_pages.zip' or 'something.pdf'
            masterZip.addFile(result.mergedFilename, result.mergedResult);

            const masterBuffer = masterZip.toBuffer();

            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', 'attachment; filename="processed_tickets_result.zip"');
            res.set('Content-Length', masterBuffer.length.toString());

            res.send(masterBuffer);

        } catch (error) {
            console.error('Error processing tickets:', error);
            res.status(500).json({ error: 'Failed to process tickets', details: (error as Error).message });
        }
    }
}
