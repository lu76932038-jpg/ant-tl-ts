
const nodemailer = require('nodemailer');

const config = {
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
        user: 'qm20251229@qq.com',
        pass: 'urpcminbjtdmbief',
    },
};

const transporter = nodemailer.createTransport(config);

async function test() {
    console.log('Testing SMTP connection...');
    try {
        await transporter.verify();
        console.log('Connection successful!');

        console.log('Sending test email...');
        await transporter.sendMail({
            from: `"Test" <${config.auth.user}>`,
            to: '41796884@qq.com',
            subject: 'SMTP Test',
            text: 'If you see this, SMTP is working.',
        });
        console.log('Email sent successfully!');
    } catch (error) {
        console.error('SMTP Error:', error);
    }
}

test();
