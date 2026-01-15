import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
        role: 'user' | 'admin';
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: '未提供认证令牌' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
        const user = await UserModel.findById(decoded.userId);

        if (!user || !user.is_active) {
            res.status(401).json({ error: '无效的认证令牌' });
            return;
        }

        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        res.status(401).json({ error: '认证失败' });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: '需要管理员权限' });
        return;
    }
    next();
};
