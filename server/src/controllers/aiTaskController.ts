import { Request, Response } from 'express';
import { AiTaskModel } from '../models/AiTask';
import { CommunityModel, Answer } from '../models/CommunityModel';

export class AiTaskController {

    // 获取所有的 AI 任务
    static async getAllTasks(req: Request, res: Response) {
        try {
            console.log('--- 收到获取 AI 任务列表的请求 ---');
            const tasks = await AiTaskModel.getAllTasks();
            console.log(`--- 获取成功，当前任务总数: ${tasks.length} ---`);
            res.json(tasks);
        } catch (error) {
            console.error('Error fetching AI tasks:', error);
            res.status(500).json({ message: 'Failed to fetch AI tasks' });
        }
    }

    // 更新任务状态并且可能触发社区自动回复
    static async updateTaskStatus(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { status, plan_content, admin_comment } = req.body;

            if (isNaN(id) || !status) {
                return res.status(400).json({ message: 'Invalid ID or status parameter' });
            }

            // 获取源任务信息，判断是否关联了社区帖子
            const task = await AiTaskModel.getTaskById(id);
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            const oldStatus = task.status;

            // 更新任务信息，包括可能的方案修改和评论
            await AiTaskModel.updateTask(id, {
                status,
                plan_content: plan_content || task.plan_content,
                admin_comment: admin_comment || task.admin_comment
            });

            if (oldStatus !== status && task.source_link_id) {
                const userId = (req as any).user?.id || 1;
                let replyContent = '';

                if (status === 'DEVELOPING') {
                    replyContent = `
                        <p><b>【进度同步】管理员审批通过 🚀</b></p>
                        <br/>
                        <p><b>最终确定的研发方案：</b></p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            ${plan_content || task.plan_content}
                        </div>
                        ${admin_comment ? `<br/><p><b>管理员点评：</b></p><p style="color: #4f46e5;">${admin_comment}</p>` : ''}
                        <br/>
                        <p>当前开发流程已经启动，功能模块正在加紧建设中，请随时关注后续上线通知。</p>
                    `;
                } else if (status === 'COMPLETED') {
                    replyContent = `<p><b>【进度同步】已上线完成 ✅</b></p><br/><p>大家好！此需求对应功能现已全面上线并部署至生产环境。欢迎大家前往体验和验证！</p>`;
                } else if (status === 'REJECTED') {
                    replyContent = `<p><b>【进度同步】方案被驳回 ❌</b></p><br/><p>很抱歉，管理员在评估后暂时驳回了此方案流转。</p>${admin_comment ? `<p><b>原因：</b> ${admin_comment}</p>` : ''}`;
                }

                if (replyContent) {
                    const answer: Answer = {
                        question_id: task.source_link_id,
                        content: replyContent,
                        author_id: userId,
                        is_accepted: false
                    };
                    await CommunityModel.createAnswer(answer);
                }
            }

            res.json({ message: 'Task status updated successfully', success: true });
        } catch (error) {
            console.error('Error updating AI task status:', error);
            res.status(500).json({ message: 'Failed to update task status' });
        }
    }

    // 后续若是AI创建任务所需接口
    static async createTask(req: Request, res: Response) {
        try {
            const { source_link_id, title, description, plan_content } = req.body;

            if (!source_link_id || !title || !plan_content) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            const insertId = await AiTaskModel.createTask({
                source_link_id,
                title,
                description,
                plan_content,
                status: 'PENDING_APPROVAL'
            });

            res.status(201).json({ message: 'AI Task created successfully', id: insertId });
        } catch (error) {
            console.error('Error creating AI task:', error);
            res.status(500).json({ message: 'Failed to create AI task' });
        }
    }
}
