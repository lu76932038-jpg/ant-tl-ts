import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { InquiryTaskModel } from '../models/InquiryTask';

export const getUsageStats = async (req: Request, res: Response) => {
    try {
        const userCount = await UserModel.count();
        const inquiryCount = await InquiryTaskModel.count({ status: 'completed' });

        // Optimally, we should add countCompleted() to the model, but this is safer without seeing the Model file.

        res.json({
            userCount,
            inquiryCount
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
