import nodemailer from 'nodemailer';
import { config } from '../config/env';

// In-memory store for verification codes: email -> { code, expiresAt }
const verificationCodes: Record<string, { code: string; expiresAt: number }> = {};

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

export const sendVerificationEmail = async (email: string): Promise<string> => {
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;

    verificationCodes[email.toLowerCase().trim()] = { code, expiresAt };

    if (!config.email.host || !config.email.user) {
        console.warn('SMTP configuration missing. Printing code to console instead.');
        console.log(`[EMAIL MOCK] Verification code for ${email}: ${code}`);
        return code;
    }

    try {
        await transporter.sendMail({
            from: `"Ant Tools Security" <${config.email.user}>`, // sender address
            to: email, // list of receivers
            subject: "您的验证码 - 殸木系统", // Subject line
            text: `您的验证码是: ${code}。有效时间5分钟，请勿告诉他人。`, // plain text body
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2c2c2c;">验证码</h2>
                    <p>您正在进行身份验证，您的验证码是：</p>
                    <h1 style="color: #007bff; letter-spacing: 5px;">${code}</h1>
                    <p>有效时间 5 分钟，请勿泄露给他人。</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">如果这不是您本人的操作，请忽略此邮件。</p>
                </div>
            `, // html body
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
        // Fallback to console log for dev if email fails
        console.log(`[EMAIL FALLBACK] Verification code for ${email}: ${code}`);
        throw new Error('发送验证邮件失败，请检查邮箱地址或稍后重试');
    }

    return code;
};

export const verifyEmailCode = (email: string, code: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const record = verificationCodes[normalizedEmail];

    console.log(`Debug: Verifying code for ${normalizedEmail}. Input: ${normalizedCode}. Record: ${record ? record.code : 'null'}`);

    if (!record) {
        console.log('Debug: No record found for email.');
        return false;
    }

    if (Date.now() > record.expiresAt) {
        console.log('Debug: Code expired.');
        delete verificationCodes[normalizedEmail];
        return false;
    }

    if (record.code === normalizedCode) {
        delete verificationCodes[normalizedEmail]; // Consume code on successful verify
        return true;
    }

    console.log(`Debug: Code mismatch. Expected ${record.code}, got ${normalizedCode}`);
    return false;
};
