import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Download, FileText, Share2, RotateCw, File,
    CheckCircle2, CircleX, LoaderCircle, MessageSquare,
    Clock, Calendar, User, FileSpreadsheet, FileCode,
    ImageIcon, ThumbsUp, ThumbsDown, History, Info, ExternalLink, LayoutGrid
} from 'lucide-react';
import { api } from '../../services/api';
import { InquiryTask } from '../../types';
import GuideTour, { GuideStep } from '../../components/GuideTour';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const InquiryDetail: React.FC = () => {
    const { user } = useAuth();
    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '-';
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<InquiryTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);

    useEffect(() => {
        if (task?.process_logs) {
            const firstAIIndex = task.process_logs.findIndex((l: any) => l.details?.aiPrompt);
            if (firstAIIndex !== -1) setSelectedLogIdx(firstAIIndex);
        }
    }, [task]);

    useEffect(() => {
        fetchTaskDetail();
    }, [id]);

    const fetchTaskDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/inquiry/${id}`);
            const data = res as any;
            setTask(data);
            setCommentText(data.comment || '');
        } catch (error) {
            console.error('Failed to fetch task detail', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRating = async (rating: number) => {
        if (!task || task.rating !== null) return;
        try {
            await api.put(`/inquiry/${task.id}/feedback`, {
                rating,
                comment: commentText
            });
            fetchTaskDetail();
        } catch (error) {
            console.error('Rating failed', error);
        }
    };

    const handleSaveComment = async () => {
        if (!task) return;
        setSavingComment(true);
        try {
            await api.put(`/inquiry/${task.id}/feedback`, {
                rating: task.rating,
                comment: commentText
            });
            alert('保存备注成功');
            fetchTaskDetail();
        } catch (error) {
            console.error('Save comment failed', error);
        } finally {
            setSavingComment(false);
        }
    };

    const downloadFile = async (type: 'original' | 'extracted' | 'result') => {
        if (!task) return;
        try {
            const data = await api.get(`/inquiry/${task.id}/download/${type}`, { responseType: 'blob' });
            const blob = new Blob([data as any]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = type === 'original' ? task.file_name :
                type === 'extracted' ? `Extracted_${task.file_name}.xlsx` :
                    `AI_Result_${task.file_name}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(`Download ${type} failed`, error);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-100 rounded-full animate-pulse"></div>
                    <LoaderCircle className="w-20 h-20 text-blue-500 animate-spin absolute top-0 left-0" />
                </div>
                <p className="mt-6 text-slate-400 font-black animate-pulse tracking-widest uppercase text-xs">加载任务详情中...</p>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <CircleX className="w-16 h-16 text-red-100 mb-4" />
                <p className="text-slate-500 font-bold">未找到该任务信息</p>
                <button onClick={() => navigate('/inquiry')} className="mt-4 text-blue-500 hover:underline">返回列表</button>
            </div>
        );
    }

    const guideSteps: GuideStep[] = [
        {
            targetId: 'guide-workflow',
            title: '全流程工作流 🔬',
            content: '这是 AI 解析的“后台”，展示了从文件读取到最终生成结果的所有逻辑步骤。',
            position: 'top'
        },
        {
            targetId: 'guide-details',
            title: '模型交互详情 🤖',
            content: '点击下方的步骤卡片，你可以在这里看到 AI 真正看过的数据以及它给出的原始反馈。',
            position: 'bottom'
        },
        {
            targetId: 'guide-feedback',
            title: '纠错与备注系统 ✍️',
            content: '你可以在此输入备注，保存后它会同步出现在外层列表中。同时支持对结果进行满意度打分。',
            position: 'left'
        },
        {
            targetId: 'guide-downloads',
            title: '一键下载 📦',
            content: '支持下载原始文件、AI 处理过程中的汇总数据以及最终的正式报价 Excel 表。',
            position: 'left'
        },
        {
            targetId: 'guide-attributes',
            title: '技术参数 ⚡',
            content: '查看任务的具体耗时、使用的模型版本以及负责人。如果耗时过长，可以通过这里进行排查。',
            position: 'left'
        }
    ];

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
            {/* 顶部 Header */}
            <div className="flex-none bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/inquiry')}
                        className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all border border-transparent hover:border-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-black text-slate-800 tracking-tight">任务详情: {task.file_name}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    task.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-red-50 text-red-600 border-red-100'}`}>
                                {task.status === 'completed' ? '已完成' : task.status === 'pending' ? '解析中' : '解析失败'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">任务 ID: {task.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { localStorage.removeItem('has_completed_guide_inquiry_detail'); window.location.reload(); }}
                        className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-blue-500 rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title="重新查看指引"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>
                    {(task.user_id === user?.id || user?.role === 'admin') && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                            <Share2 className="w-4 h-4" />
                            分享任务
                        </button>
                    )}
                </div>
            </div>

            {/* 主内容区域 */}
            <div className="flex-1 overflow-hidden flex p-8 gap-8">
                {/* 左侧主要内容面板 */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col flex-1 overflow-hidden">
                        <div id="guide-workflow" className="flex-none px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                    <RotateCw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">AI 解析工作流</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">智能流水线全过程可视化</p>
                                </div>
                            </div>
                        </div>

                        {/* 内容展示区 */}
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-50/20">
                            <div className="space-y-10 animate-in fade-in duration-700">
                                {/* 1. 网格化处理流水线 */}
                                {task.process_logs && Array.isArray(task.process_logs) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {task.process_logs.map((log: any, idx: number) => {
                                            const isSelected = selectedLogIdx === idx;
                                            const isSuccess = log.status === 'success';
                                            const isError = log.status === 'error';
                                            const hasDetails = log.details && (log.details.aiPrompt || log.details.aiResponse);

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => hasDetails && setSelectedLogIdx(idx)}
                                                    className={`relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer group
                                                        ${isSelected ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-100 -translate-y-1' :
                                                            isSuccess ? 'bg-white border-slate-100 hover:border-blue-200' :
                                                                isError ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'}
                                                    `}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter
                                                            ${isSelected ? 'bg-white/20 text-white' :
                                                                isSuccess ? 'bg-emerald-50 text-emerald-600' :
                                                                    isError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {log.step}
                                                        </span>
                                                        <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-200' : 'text-slate-300'}`}>
                                                            {new Date(log.time).toLocaleTimeString([], { hour12: false })}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs font-bold leading-relaxed line-clamp-2
                                                        ${isSelected ? 'text-white' : isError ? 'text-red-500' : 'text-slate-600'}`}>
                                                        {log.message}
                                                    </p>

                                                    {isSuccess && !isSelected && (
                                                        <div className="absolute -right-1 -top-1">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-white" />
                                                        </div>
                                                    )}

                                                    {hasDetails && !isSelected && (
                                                        <div className="mt-3 flex items-center gap-1 text-[8px] font-black text-blue-400 group-hover:text-blue-500 uppercase tracking-widest">
                                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                                                            点击查看输入输出
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {task.status === 'pending' && (
                                            <div className="p-5 rounded-3xl border border-dashed border-blue-200 bg-blue-50/10 flex items-center justify-center animate-pulse">
                                                <div className="flex flex-col items-center gap-2">
                                                    <LoaderCircle className="w-5 h-5 text-blue-300 animate-spin" />
                                                    <span className="text-[9px] font-black text-blue-300">处理中...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. 选中的 AI 交互详情面板 */}
                                {selectedLogIdx !== null && task.process_logs?.[selectedLogIdx]?.details && (
                                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                            <div id="guide-details" className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
                                                {task.process_logs[selectedLogIdx].step} 交互详情 (DeepSeek-V3)
                                            </div>
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                            {/* Prompt Panel */}
                                            {task.process_logs[selectedLogIdx].details.aiPrompt && (
                                                <div className="flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                                                    <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Prompt (模型输入)</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-400">INPUT TOKENS</div>
                                                    </div>
                                                    <div className="flex-1 p-8 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-slate-600 bg-white whitespace-pre-wrap">
                                                        {task.process_logs[selectedLogIdx].details.aiPrompt}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Panel */}
                                            {task.process_logs[selectedLogIdx].details.aiResponse && (
                                                <div className="flex flex-col bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden min-h-[400px]">
                                                    <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Model Response (模型输出)</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-emerald-400/50 tracking-widest font-mono">200 SUCCESS</div>
                                                    </div>
                                                    <div className="flex-1 p-8 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-emerald-300/80 bg-slate-900 whitespace-pre-wrap">
                                                        {task.process_logs[selectedLogIdx].details.aiResponse}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 内容快照 (如果是 AI 提取步骤) */}
                                        {task.process_logs[selectedLogIdx].details.maskedContent && (
                                            <div className="bg-amber-50/20 p-8 rounded-[2rem] border border-amber-100/30">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Info className="w-3 h-3 text-amber-500" />
                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Extracted Text Content (提取文本映射)</span>
                                                </div>
                                                <div className="font-mono text-[10px] leading-relaxed text-amber-900/40 whitespace-pre-wrap italic line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                                                    {task.process_logs[selectedLogIdx].details.maskedContent}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧属性与操作面板 */}
                <div className="w-[400px] flex flex-col gap-8 flex-none overflow-auto custom-scrollbar pr-2">
                    {/* 总结评价 */}
                    <div id="guide-feedback" className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">评价与备注</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRating(1)}
                                    disabled={task.rating !== null}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all 
                                        ${task.rating === 1 ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}
                                        ${task.rating !== null && task.rating !== 1 ? 'opacity-20 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <ThumbsUp className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleRating(-1)}
                                    disabled={task.rating !== null}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all 
                                        ${task.rating === -1 ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50'}
                                        ${task.rating !== null && task.rating !== -1 ? 'opacity-20 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <ThumbsDown className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:bg-white transition-all min-h-[120px]"
                                    placeholder="输入该任务的反馈或内部备注信息..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <div className="absolute top-4 right-4 text-slate-200">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveComment}
                                disabled={savingComment}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                {savingComment ? <LoaderCircle className="w-4 h-4 animate-spin" /> : '更新备注'}
                            </button>
                        </div>
                    </div>

                    {/* 下载中心 */}
                    <div id="guide-downloads" className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">下载中心</h3>
                        <div className="grid gap-3">
                            <button onClick={() => downloadFile('original')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><File className="w-4 h-4 text-slate-400" /></div>
                                    <div className="text-sm font-black text-slate-600 text-left">原始上传文件</div>
                                </div>
                                <Download className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                            </button>
                            <button onClick={() => downloadFile('extracted')} disabled={!task.raw_content} className="flex items-center justify-between p-4 bg-amber-50/50 hover:bg-amber-50 rounded-2xl transition-all group disabled:opacity-30 disabled:grayscale">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><FileSpreadsheet className="w-4 h-4 text-amber-500" /></div>
                                    <div className="text-sm font-black text-amber-600 text-left">OCR 提取记录</div>
                                </div>
                                <Download className="w-4 h-4 text-amber-300 group-hover:text-amber-600" />
                            </button>
                            <button onClick={() => downloadFile('result')} disabled={task.status !== 'completed'} className="flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl transition-all group disabled:opacity-30 disabled:grayscale">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                                    <div className="text-sm font-black text-emerald-600 text-left">AI 解析结果 (Excel)</div>
                                </div>
                                <Download className="w-4 h-4 text-emerald-300 group-hover:text-emerald-600" />
                            </button>
                        </div>
                    </div>

                    {/* 任务详情卡片 */}
                    <div id="guide-attributes" className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <Info className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">基础属性</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: '提交人', value: task.user_name || 'System Admin', icon: User },
                                { label: '文件类型', value: task.file_name.split('.').pop()?.toUpperCase() || 'UNKNOWN', icon: FileMsgIcon(task.file_name) },
                                { label: '任务ID', value: task.id.slice(0, 8), icon: FileText },
                                { label: '提交时间', value: formatDate(task.created_at), icon: Calendar },
                                { label: '完成时间', value: formatDate(task.completed_at), icon: History },
                                { label: '解析模型', value: 'DeepSeek-V3 (Smart)', icon: LayoutGrid },
                                { label: '耗时', value: task.completed_at ? `${Math.floor((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000)}s` : 'Processing...', icon: Clock },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 group cursor-default">
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.label}</div>
                                        <div className="text-sm font-bold text-slate-600 truncate">{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <GuideTour
                tourKey="inquiry_detail"
                steps={guideSteps}
                onComplete={() => console.log('Detail guide completed')}
            />
        </div>
    );
};

// 辅助函数
const FileMsgIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['pdf'].includes(ext)) return FileCode;
    if (['doc', 'docx'].includes(ext)) return FileText;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ImageIcon;
    return File;
};

export default InquiryDetail;
