import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, LoaderCircle, Eye, ShieldAlert, FileText } from 'lucide-react';
import { api } from '../services/api';

interface UploadDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (data?: { task?: any; tasks?: any[] }) => void;
    onUploadProgress?: (progress: number) => void;
}

// 合规确认弹窗
const ComplianceModal: React.FC<{ onConfirm: () => (void | Promise<void>); onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-800">数据安全与隐私确认</h2>
                    <p className="text-slate-500 text-sm leading-relaxed px-4">
                        本系统由公司内部使用。为确保信息安全，我们在将数据提交给 AI 之前，会进行严格的本地脱敏处理。
                    </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                    <div className="flex gap-4 items-start">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Eye className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-700 text-sm">内容脱敏</div>
                            <p className="text-[11px] text-slate-500">自动抹除 [公司名]、[姓名]、[电话] 等关键隐私标识。</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-700 text-sm">全链路审计</div>
                            <p className="text-[11px] text-slate-500">所有解析行为将被记录，供后续安全审计与追溯。</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                        我明白，确认并上传
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
                    >
                        暂不处理
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const UploadDrawer: React.FC<UploadDrawerProps> = ({ isOpen, onClose, onUploadComplete, onUploadProgress }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [showCompliance, setShowCompliance] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [currentFileName, setCurrentFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 配置
    const MAX_SIZE_MB = parseInt(import.meta.env.VITE_UPLOAD_MAX_SIZE_MB || '30', 10);

    // 处理单个文件上传
    const handleProcessFile = async (file: File) => {
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // 第一阶段：上传到服务器 (物理文件传输)
            // 后端现在是异步的，所以接口会很快返回
            const response: any = await api.post('/inquiry/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(percent);
                    onUploadProgress?.(percent);
                }
            });

            console.log('文件上传成功，taskId:', response.taskId);

            // 第二阶段：提示用户已转入后台
            setUploadProgress(100);

            // 修改点：不再每次成功都回调通知列表刷新，减少请求频率
            // onUploadComplete();
            return response.task; // 返回任务数据以便最后统一处理

        } catch (error: any) {
            console.error('上传失败:', error);
            const errorMsg = error.response?.data?.error || error.message || '未知错误';
            alert(`上传失败: ${errorMsg}`);
        } finally {
            // setIsProcessing(false) 移至外层 handleConfirmCompliance
            setUploadProgress(0);
        }
    };

    // 选择文件
    const onFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const fileList = Array.from(files);
        setPendingFiles(fileList);
        setShowCompliance(true);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 确认合规后上传
    const handleConfirmCompliance = async () => {
        setShowCompliance(false);
        setIsProcessing(true);
        const uploadedTasks = [];
        let hasError = false;

        // 辅助函数：延迟
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            setCurrentFileIndex(i);
            setCurrentFileName(file.name);

            try {
                const task = await handleProcessFile(file);
                if (task) uploadedTasks.push(task);

                // 关键加固：每次上传后等待1秒，防止瞬间触发后端限流
                if (i < pendingFiles.length - 1) {
                    await delay(1000);
                }
            } catch (error: any) {
                hasError = true;
                // 核心点：如果遇到 429 限流，立即熔断，不再尝试后续文件
                if (error?.response?.status === 429 || error?.message?.includes('429')) {
                    alert('检测到操作频繁，为保护系统稳定，已中止后续文件上传。请 5 秒后再试。');
                    break;
                }
            }
        }

        setIsProcessing(false);
        setPendingFiles([]);

        // 终极加固：仅在全部结束后，根据上传成功的任务进行一次性增量更新
        if (uploadedTasks.length > 0) {
            // 这里可以传入已上传的任务列表，让父组件一次性插入
            onUploadComplete({ tasks: uploadedTasks });
        }
    };

    return (
        <>
            {/* 遮罩层 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* 抽屉面板 */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* 头部 */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold">批量上传询价单</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* 内容区 */}
                <div className="p-8 flex-1 overflow-y-auto">
                    <div
                        className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 text-center flex flex-col items-center gap-4 ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            if (e.dataTransfer.files) onFilesSelected(e.dataTransfer.files);
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            accept=".xlsx, .xls, .doc, .docx, .pdf, .jpg, .jpeg, .png"
                            onChange={(e) => onFilesSelected(e.target.files)}
                        />

                        <div className={`p-5 rounded-full ${isProcessing ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            {isProcessing ? (
                                <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
                            ) : (
                                <Upload className="w-10 h-10 text-slate-400" />
                            )}
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-bold text-slate-700">拖拽文件或点击浏览</h3>
                            <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                支持 CSV, Excel, Word, PDF 或高清图片。<br />
                                单文件限制 {MAX_SIZE_MB}MB。
                            </p>
                        </div>

                        {/* 进度条 */}
                        {isProcessing && (
                            <div className="w-full mt-4 space-y-2 animate-in fade-in duration-500">
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                                    <span className="text-blue-600">
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="flex items-center gap-1.5 min-w-0 w-full">
                                                <LoaderCircle className="w-3 h-3 animate-spin shrink-0" />
                                                <span className="truncate">
                                                    ({currentFileIndex + 1}/{pendingFiles.length}) {currentFileName}
                                                </span>
                                            </div>
                                            {uploadProgress < 95 ? (
                                                <span className="text-[9px] text-slate-400">正在安全上传至云端...</span>
                                            ) : uploadProgress < 100 ? (
                                                <span className="text-[9px] text-emerald-500 font-black">后端 AI 正在深度解析文件结构...</span>
                                            ) : (
                                                <span className="text-[9px] text-emerald-500 font-black">该文件处理完成，准备处理下一个...</span>
                                            )}
                                        </div>
                                    </span>
                                    <span className="text-slate-400 font-mono self-start">{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out rounded-full ${uploadProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`}
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="mt-4 w-full py-3 bg-[#2c2c2c] text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-black disabled:bg-slate-300 transition-all"
                        >
                            {isProcessing ? '处理中...' : '选择文件'}
                        </button>
                    </div>

                    {/* 解析指南 */}
                    <div className="mt-8 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">解析指南</h4>
                        <div className="space-y-3">
                            {[
                                { label: '数值格式', desc: '数量与价格自动对齐并补全两位小数，如 1,234.00' },
                                { label: '日期识别', desc: 'AI 自动转换各种日期格式为 YYYY-MM-DD' },
                                { label: '隐私加密', desc: '所有上传内容在传输前会自动抹除敏感实体词' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{item.label}</div>
                                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 底部 */}
                <div className="p-6 bg-slate-50 border-t border-slate-100" />
            </div>

            {/* 合规弹窗 */}
            {showCompliance && (
                <ComplianceModal
                    onConfirm={handleConfirmCompliance}
                    onCancel={() => {
                        setShowCompliance(false);
                        setPendingFiles([]);
                    }}
                />
            )}
        </>
    );
};

export default UploadDrawer;
