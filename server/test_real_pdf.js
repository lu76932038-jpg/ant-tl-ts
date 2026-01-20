const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function testPdf() {
    try {
        // 找一个已上传的 PDF
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            console.log('No uploads dir');
            return;
        }
        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'));
        if (files.length === 0) {
            console.log('No PDF files found in uploads');
            return;
        }

        const filePath = path.join(uploadDir, files[0]);
        console.log(`Testing file: ${filePath}`);
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getText();
        console.log('Extracted text preview:', result.text ? result.text.substring(0, 100) : 'EMPTY');
    } catch (e) {
        console.error('Test Error:', e);
    }
}
testPdf();
