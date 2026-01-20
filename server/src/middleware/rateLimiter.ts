import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * 极简内存速率限制器
 * 用于防止 API 被爆破及 AI 额度被异常消耗
 */

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    }
}

const store: RateLimitStore = {};

export const rateLimiter = (windowMs: number, maxRequests: number) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        // 使用用户 ID 或 IP 作为标识符
        const identifier = req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
        const now = Date.now();

        if (!store[identifier] || now > store[identifier].resetTime) {
            store[identifier] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }

        store[identifier].count++;

        if (store[identifier].count > maxRequests) {
            const retryAfter = Math.ceil((store[identifier].resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            res.status(429).json({
                error: '请求过于频繁',
                message: `请在 ${retryAfter} 秒后再试。`
            });
            return;
        }

        next();
    };
};
