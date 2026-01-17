import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root (parent of src)
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
    server: {
        port: parseInt(process.env.PORT || '', 10),
        env: process.env.NODE_ENV || 'development'
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        name: process.env.DB_NAME || 'anti',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'ant_tools_secret_key_2025',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    ai: {
        geminiUrl: process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta',
        geminiKey: process.env.GEMINI_API_KEY || '',
        geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        deepseekKey: process.env.DEEPSEEK_API_KEY || '',
        deepseekUrl: process.env.DEEPSEEK_API_URL || '',
        aliyunKey: process.env.ALIYUN_API_KEY || '',
        aliyunUrl: process.env.ALIYUN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    },
    email: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    },
    upload: {
        maxSizeMB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50', 10),
        timeoutMs: parseInt(process.env.UPLOAD_TIMEOUT_MS_EXTENDED || '600000', 10),
        allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'xlsx,xls,doc,docx,pdf,jpg,jpeg,png').split(',')
    },
    proxy: process.env.HTTPS_PROXY || process.env.http_proxy || ''
};
