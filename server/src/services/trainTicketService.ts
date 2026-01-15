import AdmZip from 'adm-zip';
import { PDFDocument } from 'pdf-lib';
import path from 'path';

export interface ProcessResult {
    cleanZip: Buffer;
    mergedResult: Buffer;
    mergedFilename: string;
    totalPdfs: number;
}

export class TrainTicketService {
    /**
     * Process the uploaded ZIP file.
     * 1. Extracts PDF files.
     * 2. Creates a clean ZIP with just these PDFs.
     * 3. Merges PDFs in batches of 10.
     * 4. Returns buffers for both results.
     */
    async processZip(fileBuffer: Buffer): Promise<ProcessResult> {
        const zip = new AdmZip(fileBuffer);
        const zipEntries = zip.getEntries();

        const pdfFiles: { name: string; date: Date; data: Buffer }[] = [];

        // 1. Extract and Filter PDFs
        for (const entry of zipEntries) {
            if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || entry.entryName.includes('/.')) {
                continue;
            }

            if (entry.entryName.toLowerCase().endsWith('.pdf')) {
                pdfFiles.push({
                    name: path.basename(entry.entryName),
                    date: entry.header.time, // Keep original timestamp if possible, or just use sort
                    data: entry.getData()
                });
            }
        }

        if (pdfFiles.length === 0) {
            throw new Error('No PDF files found in the uploaded ZIP.');
        }

        // Sort by name to have a deterministic order (optional but good for "10 per page")
        pdfFiles.sort((a, b) => a.name.localeCompare(b.name));

        // 2. Create Clean ZIP
        const cleanZip = new AdmZip();
        for (const pdf of pdfFiles) {
            cleanZip.addFile(pdf.name, pdf.data);
        }
        const cleanZipBuffer = cleanZip.toBuffer();

        // 3. Merge PDFs in batches of 10
        const BATCH_SIZE = 10;
        const mergedPdfs: { name: string; data: Buffer }[] = [];

        for (let i = 0; i < pdfFiles.length; i += BATCH_SIZE) {
            const batch = pdfFiles.slice(i, i + BATCH_SIZE);
            const mergedPdfDoc = await PDFDocument.create();

            for (const pdf of batch) {
                try {
                    const srcDoc = await PDFDocument.load(pdf.data);
                    const copiedPages = await mergedPdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
                    copiedPages.forEach((page) => mergedPdfDoc.addPage(page));
                } catch (error) {
                    console.error(`Error processing PDF ${pdf.name}:`, error);
                    // Continue with other files even if one fails? Or fail hard?
                    // Let's continue but maybe add a blank page with error text? 
                    // For now, just skip corrupt files to avoid breaking the whole batch.
                }
            }

            const mergedPdfBytes = await mergedPdfDoc.save();
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            // E.g., merged_1-10.pdf, merged_11-20.pdf
            const endIdx = Math.min(i + BATCH_SIZE, pdfFiles.length);
            const batchName = `merged_${i + 1}-${endIdx}.pdf`;

            mergedPdfs.push({
                name: batchName,
                data: Buffer.from(mergedPdfBytes)
            });
        }

        // 4. Prepare Merged Result
        let mergedResult: Buffer;
        let mergedFilename: string;

        if (mergedPdfs.length === 1) {
            mergedResult = mergedPdfs[0].data;
            mergedFilename = mergedPdfs[0].name;
        } else {
            // Zip the merged PDFs
            const mergedZip = new AdmZip();
            for (const mPdf of mergedPdfs) {
                mergedZip.addFile(mPdf.name, mPdf.data);
            }
            mergedResult = mergedZip.toBuffer();
            mergedFilename = 'merged_pages.zip';
        }

        return {
            cleanZip: cleanZipBuffer,
            mergedResult,
            mergedFilename,
            totalPdfs: pdfFiles.length
        };
    }
}
