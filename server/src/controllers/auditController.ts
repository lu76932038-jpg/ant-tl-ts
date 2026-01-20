import { Response } from 'express';
import { AuditLogModel } from '../models/AuditLog';
import { LoginLogModel } from '../models/LoginLog';
import { AuthRequest } from '../middleware/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.role === 'admin' ? undefined : req.user?.id;
        const logs = await AuditLogModel.findAll(userId);
        res.json(logs);
    } catch (error: any) {
        console.error('获取审计日志错误:', error);
        res.status(500).json({ error: '获取审计日志失败' });
    }
};

export const getLoginLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: '权限不足' });
            return;
        }

        const username = req.query.username as string;
        const status = req.query.status as string;

        const logs = await LoginLogModel.findAll({ username, status });
        res.json(logs);
    } catch (error: any) {
        console.error('获取登录日志错误:', error);
        res.status(500).json({ error: '获取登录日志失败' });
    }
};
