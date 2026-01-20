const { parseInquiryFile } = require('./dist/services/inquiryService');
const path = require('path');
const fs = require('fs');

async function testSelf() {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'));
        if (files.length === 0) {
            console.log('No PDF found to test');
            return;
        }
        const file = files[0];
        const filePath = path.join(uploadDir, file);
        console.log(`Starting test for ${file}...`);

        const result = await parseInquiryFile(filePath, file);
        console.log('Test result: SUCCESS');
        console.log('Extracted lines:', result.rawContent.length);
        console.log('Sample raw data:', JSON.stringify(result.rawContent.slice(0, 2), null, 2));
    } catch (e) {
        console.error('Test result: FAILED');
        console.error(e);
    }
}
testSelf();
