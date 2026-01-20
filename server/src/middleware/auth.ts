import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
        role: 'user' | 'admin';
        permissions: string[];
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
            role: user.role,
            permissions: user.permissions || []
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

/**
 * 校验特定功能权限的中间件
 * @param permission 权限标识符
 */
export const requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ error: '未认证' });
            return;
        }

        // 管理员默认拥有所有权限
        if (req.user.role === 'admin') {
            return next();
        }

        if (!req.user.permissions.includes(permission)) {
            res.status(403).json({ error: `权限不足: 需要 [${permission}] 权限` });
            return;
        }

        next();
    };
};
