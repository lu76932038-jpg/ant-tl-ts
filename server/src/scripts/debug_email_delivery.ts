import { sendVerificationEmail } from '../services/emailService';

async function testDelivery() {
    const targetEmail = 'lujiaqi@ant-fa.com';
    console.log(`Attempting to send email to: ${targetEmail}`);

    try {
        const code = await sendVerificationEmail(targetEmail);
        console.log(`SUCCESS: Email send function returned without error.`);
        console.log(`Verification code generated: ${code}`);
        console.log(`Please check the inbox for ${targetEmail} (and Spam folder).`);
    } catch (error) {
        console.error('FAILURE: Email sending failed.');
        console.error(error);
    }
}

testDelivery();
