import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { InquiryTaskModel } from '../models/InquiryTask';
import { extractDataFromContent } from '../services/geminiService'; // Leveraging existing service logic
// Note: We might need to refactor extractDataFromContent or import it from inquiryService 
// but for now let's assume we can reuse or will adapt.
// Ideally, we move the parsing logic to a backend service. 
// Seeing `client/src/services/inquiryService.ts` was doing the heavy lifting before via API calls to backend? 
// No, the previous `MainApp.tsx` imported `extractDataFromContent` from `../services/inquiryService`.
// If `inquiryService` was frontend-only calling an API, we need that API logic here.
// Let's check `server/src/routes` to see if there was an existing inquiry route or if it was pure client-side API call.
// The user said "previously client-side state only", but where was the AI call made?
// Usually `server/src/services/geminiService.ts` or similar. Let's assume we have `geminiService` or `openaiService`.

// We'll create a basic structure first.
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { notifyTaskUpdate } from '../socket';

const router = express.Router();

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Prevent file name collisions and ensure safe names
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Import the AI extraction function. 
// We need to implement this service server-side if it was client-side before.
import { parseInquiryFile } from '../services/inquiryService';

// POST /api/inquiry/upload - Upload file and process
router.post('/upload', authenticate, upload.single('file'), async (req: any, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user.id;
        const filePath = req.file.path;

        // 修复 multer 中文文件名乱码问题
        const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        const fileSize = req.file.size;
        const taskId = uuidv4();

        // Create initial pending task
        const newTask = await InquiryTaskModel.create({
            id: taskId,
            user_id: userId,
            file_name: fileName,
            file_path: filePath,
            file_size: fileSize,
            status: 'pending',
            parsed_result: null,
            shared_with: []
        });

        // 异步执行 AI 解析任务 (Fire and Forget in background)
        (async () => {
            let currentLogs: any[] = [];
            try {
                console.log(`开始后台解析任务: ${taskId} (${fileName})`);

                const result = await parseInquiryFile(
                    filePath,
                    fileName,
                    async (progress) => {
                        // 检查是否已被用户终止
                        const task = await InquiryTaskModel.findById(taskId);
                        if (task?.status === 'terminated') {
                            throw new Error('TASK_TERMINATED');
                        }

                        if (progress.logs) currentLogs = [...progress.logs];
                        await InquiryTaskModel.updateRawContent(taskId, progress.rawContent, currentLogs);

                        // 发送中间进度通知
                        notifyTaskUpdate(userId, {
                            id: taskId,
                            status: 'pending',
                            raw_content: progress.rawContent,
                            process_logs: currentLogs
                        });
                    }
                );

                // 再次检查终止状态
                const finalCheck = await InquiryTaskModel.findById(taskId);
                if (finalCheck?.status === 'terminated') return;

                await InquiryTaskModel.updateResult(taskId, 'completed', result.parsedResult, undefined, result.logs);

                // 发送最终通知
                notifyTaskUpdate(userId, {
                    id: taskId,
                    status: 'completed',
                    parsed_result: result.parsedResult,
                    raw_content: result.rawContent,
                    process_logs: result.logs,
                    completed_at: new Date()
                });
                console.log(`后台解析任务完成: ${taskId}`);
            } catch (err: any) {
                if (err.message === 'TASK_TERMINATED') {
                    console.log(`任务已手动终止: ${taskId}`);
                    return;
                }

                // 再次检查是否在过程中国状态已变为终止，防止后续逻辑通过消息推送覆盖状态
                const checkTask = await InquiryTaskModel.findById(taskId);
                if (checkTask?.status === 'terminated') {
                    console.log(`捕获到解析异常，但任务已被用户手动终止，跳过错误处理: ${taskId}`);
                    return;
                }

                console.error(`后台解析任务失败: ${taskId}`, err);
                const errorMsg = err.error?.message || err.message || '未知错误';
                const errorLogs = err.logs || currentLogs;

                await InquiryTaskModel.updateResult(taskId, 'failed', null, errorMsg, errorLogs);

                // 发送失败通知
                notifyTaskUpdate(userId, {
                    id: taskId,
                    status: 'failed',
                    error_message: errorMsg,
                    process_logs: errorLogs,
                    completed_at: new Date()
                });
            }
        })();

        // 立即返回给前端
        res.json({
            success: true,
            taskId,
            task: {
                id: taskId,
                file_name: fileName,
                status: 'pending',
                created_at: new Date()
            }
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
});

// GET /api/inquiry - List tasks
router.get('/', authenticate, async (req: any, res) => {
    try {
        const userId = req.user.id;
        let tasks;

        if (req.user.role === 'admin') {
            tasks = await InquiryTaskModel.findAll();
        } else {
            tasks = await InquiryTaskModel.findByUserId(userId);
        }

        res.json(tasks);
    } catch (error) {
        console.error('List Tasks Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/inquiry/:id - Get One
router.get('/:id', authenticate, async (req: any, res) => {
    try {
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Check permission (Owner, Shared user, or Admin)
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (task.user_id !== userId && !task.shared_with.includes(userId) && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/inquiry/:id/download/original
router.get('/:id/download/original', authenticate, async (req: any, res) => {
    try {
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (task.user_id !== userId && !task.shared_with.includes(userId) && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(task.file_path)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.download(task.file_path, task.file_name);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/inquiry/:id/download/result
router.get('/:id/download/result', authenticate, async (req: any, res) => {
    try {
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (task.user_id !== userId && !task.shared_with.includes(userId) && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!task.parsed_result || !Array.isArray(task.parsed_result)) {
            return res.status(400).json({ error: 'No parsed result available to download' });
        }

        // Map English keys to STRICT Chinese headers and order according to ID0020
        const mappedResult = task.parsed_result.map((item: any) => ({
            '询价类型': item.inquiryType || '',
            '品牌': item.brand || '',
            '产品名称': item.productName || '',
            '询价型号': item.model || '',
            '数量': item.quantity || '',
            '物料单位': item.unit || '',
            '询价备注': item.remarks || '',
            '是否带图纸': item.hasDrawing || '',
            '客户物料编码': item.customerMaterialCode || '',
            '目标价格': item.targetPrice || '',
            '参考货期': item.referenceLeadTime || '',
            '期望交期(年-月-日)': item.expectedDeliveryDate || '',
            '预计年用量': item.estimatedAnnualUsage || '',
            '客户订单号': item.customerOrderNumber || '',
            '客户项目号': item.customerProjectNumber || ''
        }));

        // Convert JSON to Excel
        const worksheet = xlsx.utils.json_to_sheet(mappedResult);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "AI 解析结果");

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const safeFileName = task.file_name.replace(/\.[^/.]+$/, "");
        const encodedFileName = encodeURIComponent(`AI_Matched_Result_${safeFileName}.xlsx`);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/inquiry/:id/download/extracted
router.get('/:id/download/extracted', authenticate, async (req: any, res) => {
    try {
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (task.user_id !== userId && !task.shared_with.includes(userId) && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!task.raw_content || !Array.isArray(task.raw_content)) {
            return res.status(400).json({ error: 'No extracted data available' });
        }

        // Convert raw JSON to Excel
        const worksheet = xlsx.utils.json_to_sheet(task.raw_content);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Original Extraction");

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const safeFileName = task.file_name.replace(/\.[^/.]+$/, "");
        const encodedFileName = encodeURIComponent(`Original_Extraction_${safeFileName}.xlsx`);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// POST /api/inquiry/download/merge - Download merged result for multiple tasks
router.post('/download/merge', authenticate, async (req: any, res) => {
    try {
        const { taskIds } = req.body;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ error: 'No tasks selected' });
        }

        const userId = req.user.id;
        // In a real app, we should use a WHERE IN (...) query
        // For simplicity now, we fetch one by one or filter in memory if list is small, 
        // or add a new model method findByIds(ids, userId).
        // Let's add findByIds to model conceptually or just loop efficiently enough for small (<50) batches.

        let mergedData: any[] = [];

        for (const id of taskIds) {
            const task = await InquiryTaskModel.findById(id);
            if (task) {
                // Permission check (Owner, Shared, or Admin)
                if (task.user_id === userId || task.shared_with.includes(userId) || req.user.role === 'admin') {
                    if (task.parsed_result && Array.isArray(task.parsed_result)) {
                        // Add source info to each item if needed? Maybe later.
                        mergedData = [...mergedData, ...task.parsed_result];
                    }
                }
            }
        }

        if (mergedData.length === 0) {
            return res.status(400).json({ error: 'No valid data found to merge' });
        }

        // Map English keys to STRICT Chinese headers and order according to ID0020
        const mappedResult = mergedData.map((item: any) => ({
            '询价类型': item.inquiryType || '',
            '品牌': item.brand || '',
            '产品名称': item.productName || '',
            '询价型号': item.model || '',
            '数量': item.quantity || '',
            '物料单位': item.unit || '',
            '询价备注': item.remarks || '',
            '是否带图纸': item.hasDrawing || '',
            '客户物料编码': item.customerMaterialCode || '',
            '目标价格': item.targetPrice || '',
            '参考货期': item.referenceLeadTime || '',
            '期望交期(年-月-日)': item.expectedDeliveryDate || '',
            '预计年用量': item.estimatedAnnualUsage || '',
            '客户订单号': item.customerOrderNumber || '',
            '客户项目号': item.customerProjectNumber || ''
        }));

        // Convert merged JSON to Excel
        const worksheet = xlsx.utils.json_to_sheet(mappedResult);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Merged Inquiry Data");

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        res.setHeader('Content-Disposition', `attachment; filename="merged_inquiry_${timestamp}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Merge Download Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

import { AuditLogModel } from '../models/AuditLog';
import { UserModel } from '../models/User';

// PUT /api/inquiry/:id/share
router.put('/:id/share', authenticate, async (req: any, res) => {
    try {
        const { usernames } = req.body;
        if (!Array.isArray(usernames)) return res.status(400).json({ error: 'Invalid data' });

        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (task.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owner can share' });
        }

        const userIds: number[] = [];
        for (const username of usernames) {
            const trimmedName = username.trim();
            if (!trimmedName) continue;
            const user = await UserModel.findByUsername(trimmedName);
            if (user) userIds.push(user.id);
        }

        await InquiryTaskModel.updateSharedWith(req.params.id, userIds);

        // 记录审计日志
        AuditLogModel.create({
            user_id: req.user.id,
            action: 'SHARE_TASK',
            file_name: task.file_name,
            raw_content_preview: `Shared with: ${usernames.join(', ')}`,
            masked_content_preview: `TaskID: ${task.id}`,
            ai_model: 'SYSTEM',
            status: 'success'
        }).catch(err => console.error('AuditLog Error:', err));

        res.json({ success: true, sharedCount: userIds.length });
    } catch (error) {
        console.error('Share Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/inquiry/:id/feedback
router.put('/:id/feedback', authenticate, async (req: any, res) => {
    try {
        const { rating, comment } = req.body;
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (task.user_id !== userId && !task.shared_with.includes(userId) && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await InquiryTaskModel.updateFeedback(req.params.id, rating, comment);

        // 记录审计日志
        AuditLogModel.create({
            user_id: req.user.id,
            action: 'SUBMIT_FEEDBACK',
            file_name: task.file_name,
            raw_content_preview: `Rating: ${rating}`,
            masked_content_preview: `Comment: ${comment}`,
            ai_model: 'SYSTEM',
            status: 'success'
        }).catch(err => console.error('AuditLog Error:', err));

        res.json({ success: true });
    } catch (error) {
        console.error('Update Feedback Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/inquiry/:id/terminate
router.put('/:id/terminate', authenticate, async (req: any, res) => {
    try {
        const task = await InquiryTaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (Number(task.user_id) !== Number(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        if (task.status !== 'pending') {
            // 如果任务已经不是 pending（比如已经极速完成或失败了），直接返回成功
            // 避免前端报错，因为这种情况下“停止”的目的已经达到了
            return res.json({
                success: true,
                message: 'Task already processed',
                currentStatus: task.status
            });
        }

        await InquiryTaskModel.updateStatus(req.params.id, 'terminated');

        // 记录审计日志
        AuditLogModel.create({
            user_id: req.user.id,
            action: 'TERMINATE_TASK',
            file_name: task.file_name,
            raw_content_preview: 'Manual termination',
            masked_content_preview: `TaskID: ${task.id}`,
            ai_model: 'SYSTEM',
            status: 'success'
        }).catch(err => console.error('AuditLog Error:', err));

        notifyTaskUpdate(req.user.id, {
            id: req.params.id,
            status: 'terminated',
            completed_at: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
