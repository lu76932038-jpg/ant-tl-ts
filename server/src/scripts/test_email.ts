import { sendVerificationEmail } from '../services/emailService';

async function test() {
    console.log('Testing email sending...');
    // Send to the sender itself for testing
    const email = 'qm20251229@qq.com';
    try {
        const code = await sendVerificationEmail(email);
        console.log(`Test completed. If successful, check inbox for code: ${code}`);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

test();
