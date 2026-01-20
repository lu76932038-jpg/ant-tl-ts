import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { extractDataFromContent as extractDataDeepSeek, restoreRawTable } from './deepseekService';
import { extractTextFromImageAliyun } from './aliyunService';

/**
 * 主解析入口
 * 流程：文件 -> 文本提取 (OCR/Mammoth/XLSX) -> 存储中间结果 -> DeepSeek 解析 -> 结构化数据
 */
export const parseInquiryFile = async (filePath: string, fileName: string, onProgress?: (data: { rawContent?: any, logs?: any[] }) => Promise<void>) => {
    const ext = path.extname(fileName).toLowerCase();
    const logs: any[] = [];
    const addLog = (step: string, message: string, status: 'success' | 'info' | 'error' | 'warning' = 'info', details?: any) => {
        const log = { time: new Date().toISOString(), step, message, status, details };
        logs.push(log);
        console.log(`[Parser][${status.toUpperCase()}] ${step}: ${message}`);
    };

    let extractedText = '';
    let extractedData: any = null;

    try {
        addLog('文件读取', `开始处理文件: ${fileName}`, 'info');

        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(sheet);
            extractedData = jsonData;
            extractedText = JSON.stringify(jsonData, null, 2);
            addLog('文本提取', `Excel 已转换为 JSON 清单，共 ${jsonData.length} 行`, 'success');

        } else if (ext === '.docx' || ext === '.doc') {
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = result.value;
            addLog('文本提取', `Word 文本提取完成，长度: ${extractedText.length}`, 'success');

        } else if (['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext)) {
            const fileData = fs.readFileSync(filePath);
            const base64Data = fileData.toString('base64');
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

            addLog('OCR识别', `正在调起阿里云 OCR 服务...`, 'info');
            extractedText = await extractTextFromImageAliyun({ mimeType, data: base64Data });
            addLog('OCR识别', `OCR 识别成功，字数: ${extractedText?.length || 0}`, 'success');

        } else if (ext === '.pdf') {
            addLog('PDF解析', `正在提取 PDF 原生文本内容...`, 'info');
            const dataBuffer = fs.readFileSync(filePath);

            const parser = new PDFParse({ data: dataBuffer } as any);
            const result = await parser.getText();
            extractedText = (result as any).text;

            if (!extractedText || extractedText.trim().length < 10) {
                addLog('PDF解析', `原生文本提取不足，可能为扫描件或受保护文档`, 'warning');
                throw new Error('PDF 文本内容过少，暂不支持纯图片扫描件 PDF。');
            }
            addLog('PDF解析', `PDF 文本提取成功`, 'success');

        } else {
            throw new Error(`不支持的文件类型: ${ext}`);
        }

        if (!extractedText || extractedText.trim() === '') {
            throw new Error('未能从文件中提取出任何有效文本内容');
        }

        // 对于非 Excel 文件，需要使用 DeepSeek 还原原始表格结构作为 "原生结果"
        if (ext !== '.xlsx' && ext !== '.xls') {
            addLog('结构还原', `正在分析文档结构并尝试还原原始清单详情...`, 'info');
            try {
                extractedData = await restoreRawTable(extractedText);
                addLog('结构还原', `原始清单已识别，共 ${extractedData.length} 行`, 'success');
            } catch (err) {
                addLog('结构还原', `表格结构识别失败，降级为文本行展示`, 'warning');
                extractedData = extractedText.split('\n')
                    .filter(l => l.trim())
                    .map((l, index) => ({ '行号': index + 1, '内容': l.trim() }));
            }
        }

        // 阶段性回调：保存中间提取结果
        if (onProgress) {
            await onProgress({ rawContent: extractedData, logs });
        }

        // 调用 DeepSeek 进行深度解析（标准化）
        addLog('AI分析', `正在通过 DeepSeek 模型进行智能匹配与标准化...`, 'info', { model: 'DeepSeek-V3' });
        const { data: parsedResult, debug } = await extractDataDeepSeek(extractedText);
        addLog('AI分析', `分析完成，识别到 ${parsedResult?.length || 0} 条标准化询价项`, 'success', {
            aiPrompt: debug.prompt,
            aiResponse: debug.response,
            maskedContent: debug.maskedContent
        });

        return {
            rawContent: extractedData,
            parsedResult,
            logs
        };

    } catch (error: any) {
        addLog('系统错误', error.message, 'error');
        console.error('Error in parseInquiryFile:', error);
        throw { error, logs };
    }
};
