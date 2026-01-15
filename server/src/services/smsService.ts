import { Request, Response } from 'express';

// In-memory store for verification codes: phone -> { code, expiresAt }
const verificationCodes: Record<string, { code: string; expiresAt: number }> = {};

export const generateVerificationCode = (phone: string): string => {
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;

    verificationCodes[phone] = { code, expiresAt };

    // Log to console instead of sending real SMS
    console.log(`[MOCK SMS] Verification code for ${phone}: ${code}`);

    return code;
};

export const verifyCode = (phone: string, code: string): boolean => {
    const record = verificationCodes[phone];

    if (!record) {
        return false;
    }

    if (Date.now() > record.expiresAt) {
        delete verificationCodes[phone];
        return false;
    }

    if (record.code === code) {
        delete verificationCodes[phone]; // Consume code on successful verify
        return true;
    }

    return false;
};
