import { Request, Response } from 'express';
import { extractDataFromContent as extractGemini, extractTextFromImage } from '../services/geminiService';
import { extractTextFromImageAliyun } from '../services/aliyunService';
import { extractDataFromContent as extractDeepSeek } from '../services/deepseekService';
import { SecurityService } from '../services/securityService';
import { AuditLogModel } from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

export const analyzeInquiry = async (req: AuthRequest, res: Response) => {
    const startTime = new Date();
    try {
        Logger.info(`[analyzeInquiry] 模型开始解析...`);
        const { content, model = 'deepseek', fileName = 'unknown' } = req.body;
        const userId = req.user?.id || 1;

        if (!content) {
            res.status(400).json({ error: '内容不能为空' });
            return;
        }

        // --- 校验逻辑开始 ---
        Logger.info(`[analyzeInquiry] 文件${fileName}校验逻辑开始...`);

        const { maxSizeMB, allowedTypes } = config.upload;
        // 1. 类型校验
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
        if (!allowedTypes.includes(fileExt) && fileName !== 'unknown') {
            res.status(400).json({ error: `不支持的文件类型: .${fileExt}。允许: ${allowedTypes.join(', ')}` });
            return;
        }
        Logger.info(`[analyzeInquiry] 类型校验通过${fileExt}`);


        // 2. 大小校验 (粗略估算 Base64 大小)
        // Base64 ~ 1.33 * Original Size. 
        // config.maxSizeMB * 1024 * 1024 * 1.33 gives max string length limit
        const maxStringLength = maxSizeMB * 1024 * 1024 * 1.35;
        if (typeof content === 'string' && content.length > maxStringLength) {
            res.status(413).json({ error: `文件内容过大，超过限制 (${maxSizeMB}MB)` });
            return;
        }
        Logger.info(`[analyzeInquiry] 大小校验通过${maxStringLength}`);
        // --- 校验逻辑结束 ---

        let rawText = '';
        if (typeof content === 'string') {
            rawText = content;
        } else {
            rawText = '[图片/文件数据]';
        }

        // 1. 安全检测
        const securityCheck = SecurityService.checkSensitiveContent(rawText);
        if (!securityCheck.isSafe) {
            await AuditLogModel.create({
                user_id: userId,
                action: 'analyze_inquiry',
                file_name: fileName,
                raw_content_preview: rawText.substring(0, 1000),
                masked_content_preview: 'BLOCKED',
                ai_model: model,
                status: 'blocked',
                error_message: `包含违规词: ${securityCheck.foundWords.join(', ')}`,
                start_time: startTime,
                end_time: new Date(),
                error_details: null
            });
            res.status(403).json({
                error: `内容包含违规词: ${securityCheck.foundWords.join(', ')}`,
                isBlocked: true
            });
            return;
        }
        Logger.info(`[analyzeInquiry] 安全检测通过`);

        // 2. 数据脱敏
        const maskedContent = typeof content === 'string'
            ? SecurityService.maskSensitiveData(content)
            : content;
        Logger.info(`[analyzeInquiry] 数据脱敏通过`);

        // 3. 调用 AI 解析 (智能路由)
        let items = [];
        let aiRawResponse = '';
        let actualModelUsed = model;

        // 如果包含图像数据且当前选中的是 deepseek，启用混合模式：Gemini OCR -> DeepSeek Parse
        // 否则保持默认逻辑

        try {
            // 超时控制
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`解析超时 (>${config.upload.timeoutMs}ms)`)), config.upload.timeoutMs);
            });
            Logger.info(`[analyzeInquiry] 开始调用 AI 解析 model: ${model}, typeof content: ${typeof content}`);

            if (typeof content !== 'string' && model === 'deepseek') {
                // --- 混合模式 ---
                Logger.info(`[analyzeInquiry] 启用混合模式: OCR -> DeepSeek Logic`);
                actualModelUsed = 'deepseek (hybrid)';

                // 1. OCR (Aliyun or Gemini)
                let ocrTask: Promise<string>;
                let contentObj = content as { mimeType: string, data: string };
                if (!contentObj.mimeType && fileName) {
                    const ext = fileName.split('.').pop()?.toLowerCase();
                    if (ext === 'png') contentObj.mimeType = 'image/png';
                    else if (ext === 'jpg' || ext === 'jpeg') contentObj.mimeType = 'image/jpeg';
                    else if (ext === 'webp') contentObj.mimeType = 'image/webp';
                    else if (ext === 'pdf') contentObj.mimeType = 'application/pdf';
                }

                const mimeType = contentObj.mimeType || '';
                const isImage = mimeType.startsWith('image/');

                if (config.ai.aliyunKey && isImage) {
                    Logger.info(`[analyzeInquiry] 使用 Aliyun Qwen-VL OCR (${mimeType})`);
                    ocrTask = extractTextFromImageAliyun(contentObj);
                } else {
                    Logger.info(`[analyzeInquiry] 使用 Gemini OCR (Fallback for ${mimeType})`);
                    ocrTask = extractTextFromImage(contentObj);
                }
                Logger.info(`[analyzeInquiry] 调用结束 OCR `);
                // Non-blocking debug logging
                ocrTask.then((data: string) => Logger.debug(`[analyzeInquiry] ocrTask resolved. Preview: ${data?.substring(0, 100)}...`));
                timeoutPromise.catch(err => Logger.debug(`[analyzeInquiry] timeoutPromise rejected: ${(err as Error).message}`));


                const rawOcrText = await Promise.race([ocrTask, timeoutPromise]) as string;
                Logger.info(`[analyzeInquiry] OCR 提取文本长度: ${rawOcrText.length} `);

                // 2. 脱敏
                const maskedOcrText = SecurityService.maskSensitiveData(rawOcrText);

                // 3. 解析 (DeepSeek)
                // 注意：这里我们透传脱敏后的 OCR 文本给 DeepSeek
                const deepSeekTask = extractDeepSeek(maskedOcrText);
                items = await Promise.race([deepSeekTask, timeoutPromise]) as any;

            } else {
                // --- 标准模式 ---
                // 如果是图片但选了 DeepSeek (且没进上面逻辑? 不可能，上面覆盖了所有 DeepSeek+Image 情况)
                // 剩下的情况:
                // 1. 文本 + DeepSeek
                // 2. 文本 + Gemini
                // 3. 图片 + Gemini

                const aiTask = model === 'deepseek'
                    ? extractDeepSeek(maskedContent)
                    : extractGemini(maskedContent);

                items = await Promise.race([aiTask, timeoutPromise]) as any;
            }

            aiRawResponse = JSON.stringify(items, null, 2);
            Logger.info(`[analyzeInquiry] AI 解析完成`);
            // 4. 记录成功审计日志
            await AuditLogModel.create({
                user_id: userId,
                action: actualModelUsed !== model ? `routed_${actualModelUsed} ` : 'analyze_inquiry',
                file_name: fileName,
                raw_content_preview: rawText.substring(0, 1000),
                masked_content_preview: (typeof maskedContent === 'string' ? maskedContent : 'IMAGE').substring(0, 1000),
                ai_model: actualModelUsed,
                status: 'success',
                start_time: startTime,
                end_time: new Date(),
                error_details: null
            });
            Logger.info(`[analyzeInquiry] 记录成功审计日志`);

            // 5. 返回结果，包含调试信息
            res.json({
                items,
                debug: {
                    rawContent: rawText,
                    maskedContent: typeof maskedContent === 'string' ? maskedContent : '图片数据已脱敏处理',
                    aiRawResponse: aiRawResponse
                }
            });
            // console.log(`[analyzeInquiry] 返回结果，包含调试信息: `, items);

        } catch (aiError: any) {
            Logger.error('AI 解析失败:', aiError);
            await AuditLogModel.create({
                user_id: userId,
                action: 'analyze_inquiry',
                file_name: fileName,
                raw_content_preview: rawText.substring(0, 1000),
                masked_content_preview: (typeof maskedContent === 'string' ? maskedContent : 'IMAGE').substring(0, 1000),
                ai_model: model,
                status: 'failed',
                error_message: aiError.message,
                start_time: startTime,
                end_time: new Date(),
                error_details: aiError.stack || JSON.stringify(aiError)
            });
            throw aiError;
        }

    } catch (error: any) {
        Logger.error('解析错误:', error);
        res.status(500).json({ error: error.message || '解析失败' });
    }
};
