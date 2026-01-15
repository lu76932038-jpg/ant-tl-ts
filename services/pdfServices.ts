
import JSZip from 'jszip';
import { PDFDocument, rgb } from 'pdf-lib';
import { ExtractedTicket } from '../types';

// PDF.js worker setup
const PDFJS = (window as any).pdfjsLib;
PDFJS.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Extracts all PDF files from an array of ZIP files.
 */
export const extractPdfsFromZips = async (files: File[]): Promise<ExtractedTicket[]> => {
    const extractedTickets: ExtractedTicket[] = [];

    for (const file of files) {
        try {
            const zip = await JSZip.loadAsync(file);
            const pdfFiles = Object.keys(zip.files).filter(fileName => fileName.toLowerCase().endsWith('.pdf'));

            for (const pdfName of pdfFiles) {
                const pdfData = await zip.files[pdfName].async('uint8array');
                // Use a slice to ensure we have a clean copy of the data
                const cleanData = pdfData.slice();
                extractedTickets.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: pdfName.split('/').pop() || pdfName,
                    data: cleanData,
                    zipName: file.name
                });
            }
        } catch (err) {
            console.error(`Failed to parse zip ${file.name}:`, err);
            throw new Error(`无法解压文件 ${file.name}，请检查是否为有效的 ZIP 格式`);
        }
    }

    return extractedTickets;
};

/**
 * Merges tickets into an A4 document, 10 tickets per page (2x5 grid).
 */
export const mergeTicketsToA4 = async (tickets: ExtractedTicket[]): Promise<Uint8Array> => {
    const mergedPdf = await PDFDocument.create();

    // A4 size in points: 595.28 x 841.89
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    const MARGIN_X = 25;
    const MARGIN_Y = 30;
    const COLS = 2;
    const ROWS = 5;
    const ITEMS_PER_PAGE = COLS * ROWS;

    const CELL_WIDTH = (PAGE_WIDTH - 2 * MARGIN_X) / COLS;
    const CELL_HEIGHT = (PAGE_HEIGHT - 2 * MARGIN_Y) / ROWS;

    for (let i = 0; i < tickets.length; i += ITEMS_PER_PAGE) {
        const page = mergedPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const currentBatch = tickets.slice(i, i + ITEMS_PER_PAGE);

        for (let j = 0; j < currentBatch.length; j++) {
            const ticket = currentBatch[j];
            const col = j % COLS;
            const row = Math.floor(j / COLS);

            try {
                // Load the ticket document with specific settings for compatibility
                const ticketDoc = await PDFDocument.load(ticket.data, {
                    ignoreEncryption: true,
                    throwOnInvalidObject: false
                });

                const sourcePages = ticketDoc.getPages();
                if (sourcePages.length === 0) continue;

                const sourcePage = sourcePages[0];
                const { width: srcWidth, height: srcHeight } = sourcePage.getSize();

                // Embed the page
                const [embeddedPage] = await mergedPdf.embedPages([sourcePage]);

                // Calculate grid cell position (from top-left visually)
                const cellX = MARGIN_X + col * CELL_WIDTH;
                const cellY = PAGE_HEIGHT - (MARGIN_Y + (row + 1) * CELL_HEIGHT);

                // Calculate scaling to fit the ticket into the 277x156 cell (approx)
                const scale = Math.min(
                    (CELL_WIDTH * 0.9) / srcWidth,
                    (CELL_HEIGHT * 0.9) / srcHeight
                );

                const drawWidth = srcWidth * scale;
                const drawHeight = srcHeight * scale;

                // Center content within the cell
                const offsetX = (CELL_WIDTH - drawWidth) / 2;
                const offsetY = (CELL_HEIGHT - drawHeight) / 2;

                // Draw a very light placeholder background to debug visibility
                page.drawRectangle({
                    x: cellX + 2,
                    y: cellY + 2,
                    width: CELL_WIDTH - 4,
                    height: CELL_HEIGHT - 4,
                    color: rgb(0.98, 0.98, 0.98),
                    borderColor: rgb(0.9, 0.9, 0.9),
                    borderWidth: 0.5,
                });

                // Draw the ticket content
                page.drawPage(embeddedPage, {
                    x: cellX + offsetX,
                    y: cellY + offsetY,
                    width: drawWidth,
                    height: drawHeight,
                });

            } catch (err) {
                console.error(`Failed to merge PDF for ${ticket.name}:`, err);
                // Continue to the next ticket instead of failing the whole merge
            }
        }
    }

    // Set standard metadata
    mergedPdf.setTitle('火车票发票合并');
    mergedPdf.setAuthor('火车票发票提取合并助手');

    return await mergedPdf.save();
};

/**
 * Renders the first page of a PDF to a base64 image string for preview.
 */
export const renderPdfToImage = async (data: Uint8Array): Promise<string> => {
    try {
        const loadingTask = PDFJS.getDocument({
            data: data.slice(), // Use a copy
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 }); // Higher scale for better preview

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return '';

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (error) {
        console.error('PDF preview rendering error:', error);
        return '';
    }
};
