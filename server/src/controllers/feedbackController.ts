import { Request, Response } from 'express';
import { FeedbackModel } from '../models/Feedback';

export const createFeedback = async (req: Request, res: Response) => {
    try {
        const { type, content } = req.body;
        const userId = (req as any).user?.id;

        if (!content) {
            return res.status(400).json({ error: 'Suggestion content is required' });
        }

        // 1. Simulate AI Feasibility Analysis (Heuristic Rule-based)
        let aiReply = '';
        const lowerContent = content.toLowerCase();

        if (content.length < 10) {
            aiReply = "【系统分析】您的建议太过简短，建议补充更多细节以便我们评估。（建议补充：具体场景、期望效果）";
        } else if (lowerContent.includes('bug') || lowerContent.includes('错') || lowerContent.includes('fail') || lowerContent.includes('error')) {
            aiReply = "【可行性分析】检测到可能属于系统故障。优先级：High。建议：已自动归档至缺陷跟踪池，我们将尽快核实修复。感谢您的反馈！";
        } else if (lowerContent.includes('增加') || lowerContent.includes('添加') || lowerContent.includes('支持')) {
            aiReply = "【可行性分析】这是一个功能增强建议。技术可行性：高。开发成本：中等。建议：已加入需求评估队列，将在下个迭代中排期讨论。";
        } else if (lowerContent.includes('慢') || lowerContent.includes('卡')) {
            aiReply = "【可行性分析】性能优化类建议。技术可行性：高。建议：系统将安排专项性能排查，优化数据库查询与前端渲染逻辑。";
        } else {
            aiReply = "【可行性分析】感谢您的宝贵建议！我们已收到并建档，产品团队将在 3 个工作日内完成详细评估。";
        }

        // 2. Save to DB
        const feedbackId = await FeedbackModel.create({
            user_id: userId,
            type,
            content,
            ai_reply: aiReply,
            status: 'PENDING'
        });

        res.json({
            success: true,
            data: {
                id: feedbackId,
                reply: aiReply
            }
        });

    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

export const getFeedbacks = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        // Option: admins see all, users see their own? For now, let's just show user's own to keep it personal.
        // Or if it's a "User Voice" board, maybe all? Let's stick to personal for now based on req.
        const feedbacks = await FeedbackModel.findAll(userId);
        res.json(feedbacks);
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
};
