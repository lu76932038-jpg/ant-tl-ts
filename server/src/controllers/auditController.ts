import { Response } from 'express';
import { AuditLogModel } from '../models/AuditLog';
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
