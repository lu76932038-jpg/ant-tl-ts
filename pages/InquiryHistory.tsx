import React, { useState, useEffect } from 'react';
import { Download, FileText, Share2, Eye, Clock, File, CheckCircle2, CircleX, LoaderCircle, Plus, LayoutGrid, ThumbsUp, ThumbsDown, MessageSquare, ArrowUpDown, ChevronUp, ChevronDown, FileSpreadsheet, FileCode, ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { InquiryTask } from '../types';
import UploadDrawer from '../components/UploadDrawer';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const InquiryHistory: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<InquiryTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<InquiryTask | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareUserIds, setShareUserIds] = useState<string>('');
    const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [now, setNow] = useState(Date.now());
    const [detailModalTask, setDetailModalTask] = useState<InquiryTask | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'raw' | 'parsed' | 'logs'>('raw');

    // 排序配置
    const [sortConfig, setSortConfig] = useState<{ key: keyof InquiryTask | 'duration' | 'type'; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    // 留言弹窗状态
    const [commentModalTask, setCommentModalTask] = useState<InquiryTask | null>(null);
    const [commentText, setCommentText] = useState('');

    // 每秒更新当前时间，驱动倒计时/计时器显示
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchTasks();

        // WebSocket 实时监听
        const socket = io(import.meta.env.VITE_API_BASE_URL || '/', {
            path: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/socket.io` : '/socket.io',
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnectionAttempts: 5
        });

        if (user) {
            socket.emit('join', user.id);
        }

        socket.on('task_updated', (data) => {
            console.log('收到任务更新通知:', data);

            // 如果是状态变更，给予提示
            if (data.status === 'completed') {
                // 这里可以根据需要增加更漂亮的 Toast
                console.log(`任务 [${data.id}] 解析完成`);
            } else if (data.status === 'failed') {
                alert(`任务解析失败: ${data.error_message || '未知错误'}`);
            }

            fetchTasks(); // 实时刷新列表
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '-';
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const getProcessingTime = (task: InquiryTask) => {
        const start = new Date(task.created_at).getTime();
        // 如果是老数据（没有 completed_at 且状态是 completed/failed），显示 0
        if (!task.completed_at && task.status !== 'pending') return 0;

        const end = task.completed_at ? new Date(task.completed_at).getTime() : now;
        const diff = Math.max(0, Math.floor((end - start) / 1000));
        return diff;
    };

    const getFileType = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['xlsx', 'xls', 'csv'].includes(ext)) return 'Excel';
        if (['pdf'].includes(ext)) return 'PDF';
        if (['doc', 'docx'].includes(ext)) return 'Word';
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'Image';
        return 'Other';
    };

    const handleSort = (key: any) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleRating = async (task: InquiryTask, rating: number) => {
        try {
            await api.put(`/inquiry/${task.id}/feedback`, {
                rating: task.rating === rating ? null : rating, // 再次点击取消评价
                comment: task.comment
            });
            fetchTasks();
        } catch (error) {
            console.error('Rating failed', error);
        }
    };

    const openCommentModal = (task: InquiryTask) => {
        setCommentModalTask(task);
        setCommentText(task.comment || '');
    };

    const handleSaveComment = async () => {
        if (!commentModalTask) return;
        try {
            await api.put(`/inquiry/${commentModalTask.id}/feedback`, {
                rating: commentModalTask.rating,
                comment: commentText
            });
            setCommentModalTask(null);
            fetchTasks();
        } catch (error) {
            console.error('Save comment failed', error);
        }
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        const { key, direction } = sortConfig;
        let valA: any = a[key as keyof InquiryTask];
        let valB: any = b[key as keyof InquiryTask];

        if (key === 'duration') {
            valA = getProcessingTime(a);
            valB = getProcessingTime(b);
        } else if (key === 'type') {
            valA = getFileType(a.file_name);
            valB = getFileType(b.file_name);
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const result = valA < valB ? -1 : 1;
        return direction === 'asc' ? result : -result;
    });

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/inquiry');
            setTasks(response);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        const completableTasks = tasks.filter(t => t.status === 'completed');
        if (completableTasks.length === 0) return;

        const allSelected = completableTasks.every(t => selectedTaskIds.includes(t.id));
        if (allSelected) {
            setSelectedTaskIds(prev => prev.filter(id => !completableTasks.some(t => t.id === id)));
        } else {
            setSelectedTaskIds(prev => Array.from(new Set([...prev, ...completableTasks.map(t => t.id)])));
        }
    };

    const toggleSelectTask = (task: InquiryTask, e?: React.MouseEvent | React.ChangeEvent) => {
        e?.stopPropagation();
        if (task.status !== 'completed') return;

        setSelectedTaskIds(prev =>
            prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id]
        );
    };

    const handleMergeDownload = async () => {
        if (selectedTaskIds.length === 0) return;
        try {
            const response = await api.post('/inquiry/download/merge',
                { taskIds: selectedTaskIds },
                { responseType: 'blob' }
            );
            // 注意：因为 api.ts 拦截器返回了 response.data，所以这里的 response 就是 blob 或者是 blob 包装的 data
            const blob = response instanceof Blob ? response : new Blob([response as any]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.setAttribute('download', `Merged_Inquiry_${timeStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Merge download failed', error);
            alert('合并导出失败');
        }
    };

    // ... (处理下载和分享的逻辑保持不变)

    const handleDownloadOriginal = async (task: InquiryTask) => {
        try {
            const response = await api.get(`/inquiry/${task.id}/download/original`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', task.file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('下载失败');
        }
    };

    const handleDownloadExtracted = async (task: InquiryTask) => {
        try {
            const response = await api.get(`/inquiry/${task.id}/download/extracted`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Extracted_${task.file_name}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download extracted data failed', error);
            alert('下载原始提取数据失败');
        }
    };

    const handleDownloadResult = async (task: InquiryTask) => {
        if (task.status !== 'completed') return;
        try {
            const response = await api.get(`/inquiry/${task.id}/download/result`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `AI_Result_${task.file_name}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download AI result failed', error);
            alert('下载 AI 解析结果失败');
        }
    };

    const handleTerminate = async (task: InquiryTask) => {
        if (!confirm('确定要终止该解析任务吗？')) return;
        try {
            await api.put(`/inquiry/${task.id}/terminate`);
            fetchTasks();
        } catch (error) {
            console.error('Terminate failed', error);
            alert('终止任务失败');
        }
    };

    const handleShare = async () => {
        if (!selectedTask) return;
        try {
            const ids = shareUserIds.split(/[,，]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            await api.put(`/inquiry/${selectedTask.id}/share`, { sharedWith: ids });
            alert('分享成功');
            setShareModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Share failed', error);
            alert('分享失败');
        }
    };

    const openShareModal = (task: InquiryTask) => {
        setSelectedTask(task);
        setShareUserIds(task.shared_with.join(', '));
        setShareModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* 页面头部：询价任务中心样式 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm tracking-widest uppercase">
                        <LayoutGrid className="w-4 h-4" />
                        Inquiry Center
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">询价任务中心</h1>
                    <p className="text-slate-500 text-sm">统一管理您的解析任务、下载报告及团队分享</p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedTaskIds.length > 0 && (
                        <button
                            onClick={handleMergeDownload}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 animate-in fade-in slide-in-from-right-4"
                        >
                            <Download className="w-5 h-5" />
                            合并导出 ({selectedTaskIds.length})
                        </button>
                    )}
                    <button
                        onClick={fetchTasks}
                        className="p-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all shadow-sm group"
                        title="刷新列表"
                    >
                        <Clock className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setUploadDrawerOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#2c2c2c] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        新建上传
                    </button>
                </div>
            </div>

            {/* 统计概览 (简版) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800">{tasks.length}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase">总任务数</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800">
                            {tasks.filter(t => t.status === 'completed').length}
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase">已完成</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                        <LoaderCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800">
                            {tasks.filter(t => t.status === 'pending').length}
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase">处理中</div>
                    </div>
                </div>
            </div>

            {/* 任务列表 */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                {loading && tasks.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <LoaderCircle className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-medium">暂无历史记录，点击"新建上传"开始</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 z-10">
                                <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/80 backdrop-blur border-b border-slate-100">
                                    <th className="px-6 py-5 font-black w-8">
                                        <input
                                            type="checkbox"
                                            checked={tasks.length > 0 && tasks.filter(t => t.status === 'completed').length > 0 && tasks.filter(t => t.status === 'completed').every(t => selectedTaskIds.includes(t.id))}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                                            disabled={tasks.filter(t => t.status === 'completed').length === 0}
                                        />
                                    </th>
                                    <th className="px-4 py-5 font-black text-center">操作</th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1">状态 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('id')}>
                                        <div className="flex items-center justify-center gap-1">任务ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('file_name')}>
                                        <div className="flex items-center justify-center gap-1">文件名 {sortConfig.key === 'file_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('type')}>
                                        <div className="flex items-center justify-center gap-1">类型 {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('user_name')}>
                                        <div className="flex items-center justify-center gap-1">提交人 {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center justify-center gap-1">提交时间 {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('completed_at')}>
                                        <div className="flex items-center justify-center gap-1">完成时间 {sortConfig.key === 'completed_at' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('duration')}>
                                        <div className="flex items-center justify-center gap-1">耗时 {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('rating')}>
                                        <div className="flex items-center justify-center gap-1">评价 {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-6 py-5 font-black text-center cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('comment')}>
                                        <div className="flex items-center justify-center gap-1">留言 {sortConfig.key === 'comment' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className={`hover:bg-slate-50/50 transition-all group ${selectedTaskIds.includes(task.id) ? 'bg-blue-50/30' : ''} ${task.status !== 'completed' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                        onClick={(e) => toggleSelectTask(task, e)}
                                    >
                                        <td className="px-6 py-5">
                                            <input
                                                type="checkbox"
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={(e) => toggleSelectTask(task, e)}
                                                disabled={task.status !== 'completed'}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        <td className="px-4 py-5 text-center space-x-0.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <button onClick={(e) => { e.stopPropagation(); setDetailModalTask(task); }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="查看详情"><Eye className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDownloadOriginal(task); }} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all" title="下载源文件"><File className="w-3.5 h-3.5" /></button>

                                                <div className="relative group/dl">
                                                    <button className={`p-2 rounded-lg transition-all ${task.raw_content || task.status === 'completed' ? 'hover:bg-emerald-50 text-emerald-500' : 'text-slate-200 cursor-not-allowed'}`} title="下载转换结果"><Download className="w-3.5 h-3.5" /></button>
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover/dl:block z-50 bg-white shadow-2xl rounded-xl border border-slate-100 p-1 w-32 animate-in fade-in slide-in-from-top-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadExtracted(task); }}
                                                            disabled={!task.raw_content}
                                                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-30 flex items-center gap-2"
                                                        >
                                                            <FileSpreadsheet className="w-3 h-3" /> 原始提取清单
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadResult(task); }}
                                                            disabled={task.status !== 'completed'}
                                                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-30 flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> AI 匹配清单
                                                        </button>
                                                    </div>
                                                </div>

                                                {task.status === 'pending' ? (
                                                    <button onClick={(e) => { e.stopPropagation(); handleTerminate(task); }} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all" title="终止解析"><CircleX className="w-3.5 h-3.5" /></button>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); openShareModal(task); }} className="p-2 hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-500 rounded-lg transition-all" title="分享协作"><Share2 className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 min-w-[120px]">
                                            <div className="flex items-center justify-center gap-2">
                                                {task.status === 'completed' && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight"><CheckCircle2 className="w-3 h-3" /> 已完成</span>}
                                                {task.status === 'pending' && (
                                                    <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight">
                                                        <LoaderCircle className="w-3 h-3 animate-spin" />
                                                        解析中 ({getProcessingTime(task)}s)
                                                    </span>
                                                )}
                                                {task.status === 'failed' && <span className="text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight" title={task.error_message}><CircleX className="w-3 h-3" /> 失败</span>}
                                                {task.status === 'terminated' && <span className="text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight"><CircleX className="w-3 h-3" /> 已终止</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-[10px] font-mono text-slate-400 text-center">
                                            {task.id.slice(0, 8)}
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="font-bold text-slate-700 truncate max-w-[120px] mx-auto text-center" title={task.file_name}>{task.file_name}</div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-500">
                                                {getFileType(task.file_name) === 'Excel' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
                                                {getFileType(task.file_name) === 'PDF' && <FileCode className="w-3.5 h-3.5 text-red-500" />}
                                                {getFileType(task.file_name) === 'Word' && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                                                {getFileType(task.file_name) === 'Image' && <ImageIcon className="w-3.5 h-3.5 text-amber-500" />}
                                                <span className="text-[10px] font-medium">{getFileType(task.file_name)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{task.user_name || '未知'}</span>
                                        </td>
                                        <td className="px-4 py-5 text-slate-500 text-[10px] whitespace-nowrap text-center">
                                            {formatDate(task.created_at)}
                                        </td>
                                        <td className="px-4 py-5 text-slate-500 text-[10px] whitespace-nowrap text-center">
                                            {formatDate(task.completed_at)}
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1 text-slate-600 font-mono text-[10px] font-bold">
                                                <Clock className="w-3 h-3 text-slate-300" />
                                                {getProcessingTime(task)}s
                                            </div>
                                        </td>
                                        <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRating(task, 1); }}
                                                    className={`p-1.5 rounded-lg transition-all ${task.rating === 1 ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-300 hover:text-emerald-500'}`}
                                                    title="满意"
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRating(task, -1); }}
                                                    className={`p-1.5 rounded-lg transition-all ${task.rating === -1 ? 'bg-red-100 text-red-600' : 'hover:bg-slate-100 text-slate-300 hover:text-red-500'}`}
                                                    title="不满意"
                                                >
                                                    <ThumbsDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openCommentModal(task); }}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${task.comment ? 'bg-blue-50 text-blue-600 w-full justify-between' : 'text-slate-300 hover:text-blue-500'}`}
                                                title="留言反馈"
                                            >
                                                {task.comment ? (
                                                    <>
                                                        <span className="text-[10px] font-medium truncate max-w-[60px]">{task.comment}</span>
                                                        <MessageSquare className="w-3 h-3 shrink-0" />
                                                    </>
                                                ) : (
                                                    <MessageSquare className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 上传抽屉组件 */}
            <UploadDrawer
                isOpen={uploadDrawerOpen}
                onClose={() => setUploadDrawerOpen(false)}
                onUploadComplete={() => {
                    setUploadDrawerOpen(false);
                    fetchTasks();
                }}
            />

            {/* 分享弹窗 */}
            {shareModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Share2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">分享任务</h3>
                                <p className="text-xs text-slate-500">此任务将展示在对方的中心列表中</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">协作用户 ID (逗号分隔)</label>
                            <input
                                type="text"
                                value={shareUserIds}
                                onChange={(e) => setShareUserIds(e.target.value)}
                                placeholder="例如: 2, 5, 8"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShareModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">取消</button>
                            <button onClick={handleShare} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">确认分享</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 详情页面 Modal */}
            {detailModalTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-6xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-100">
                        {/* 头部 */}
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white shadow-sm rounded-[1.5rem] text-blue-600">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        任务详情: {detailModalTask.file_name}
                                        {detailModalTask.status === 'completed' && <span className="bg-emerald-100 text-emerald-600 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black">AI 解析完成</span>}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1">ID: {detailModalTask.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailModalTask(null)}
                                className="w-12 h-12 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-400 rounded-2xl transition-all border border-slate-100 shadow-sm"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* 导航 */}
                        <div className="flex px-8 border-b border-slate-50 gap-8">
                            {[
                                { id: 'raw', label: '原始提取清单', count: detailModalTask.raw_content?.length },
                                { id: 'parsed', label: 'AI 标准化清单', count: detailModalTask.parsed_result?.length },
                                { id: 'logs', label: '解析过程日志', count: detailModalTask.process_logs?.length }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveDetailTab(tab.id as any)}
                                    className={`py-6 font-black text-sm relative transition-all ${activeDetailTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && <span className="ml-2 px-2 py-0.5 bg-slate-100 text-[10px] rounded-md">{tab.count}</span>}
                                    {activeDetailTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                                </button>
                            ))}
                        </div>

                        {/* 内容展示区 */}
                        <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
                            {activeDetailTab === 'raw' && (
                                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                    {!detailModalTask.raw_content ? (
                                        <div className="p-20 text-center text-slate-400">尚未提取原始清单</div>
                                    ) : (
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 font-black">Row</th>
                                                    <th className="px-6 py-4 font-black">提取内容 (原始)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {detailModalTask.raw_content.slice(0, 50).map((row: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4 font-mono text-slate-300">{idx + 1}</td>
                                                        <td className="px-6 py-4 text-slate-600 font-mono text-[10px]">{JSON.stringify(row)}</td>
                                                    </tr>
                                                ))}
                                                {detailModalTask.raw_content.length > 50 && (
                                                    <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-300">仅展示前 50 条记录...</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeDetailTab === 'parsed' && (
                                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                    {!detailModalTask.parsed_result ? (
                                        <div className="p-20 text-center text-slate-400">AI 尚未完成解析</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left min-w-[1200px]">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4 font-black">型号</th>
                                                        <th className="px-6 py-4 font-black">品牌</th>
                                                        <th className="px-6 py-4 font-black">品名</th>
                                                        <th className="px-6 py-4 font-black text-center">数量/单位</th>
                                                        <th className="px-6 py-4 font-black">备注</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {detailModalTask.parsed_result.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-slate-800">{item.model}</td>
                                                            <td className="px-6 py-4 text-blue-600 font-black">{item.brand}</td>
                                                            <td className="px-6 py-4 text-slate-500">{item.productName}</td>
                                                            <td className="px-6 py-4 text-center font-mono">
                                                                <span className="font-black text-slate-800">{item.quantity}</span>
                                                                <span className="text-slate-400 ml-1">{item.unit}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-400 italic text-[10px]">{item.remarks || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeDetailTab === 'logs' && (
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    {!detailModalTask.process_logs?.length ? (
                                        <div className="p-20 text-center text-slate-400">暂无解析日志</div>
                                    ) : (
                                        detailModalTask.process_logs.map((log: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-3 h-3 rounded-full mt-1.5 ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : log.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                    <div className="w-0.5 h-full bg-slate-200 group-last:hidden" />
                                                </div>
                                                <div className="pb-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black font-mono text-slate-400">{new Date(log.time).toLocaleTimeString()}</span>
                                                        <span className="font-black text-slate-700">{log.step}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.message}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 底部功能区 */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => handleDownloadOriginal(detailModalTask)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <File className="w-4 h-4" /> 源文件
                            </button>
                            <button
                                onClick={() => handleDownloadExtracted(detailModalTask)}
                                disabled={!detailModalTask.raw_content}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> 导出提取清单
                            </button>
                            <button
                                onClick={() => handleDownloadResult(detailModalTask)}
                                disabled={detailModalTask.status !== 'completed'}
                                className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                <Download className="w-5 h-5" /> 下载 AI 解析结果
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 留言编辑弹窗 */}
            {commentModalTask && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">任务留言</h3>
                                <p className="text-xs text-slate-500">记录关于解析结果的备注或反馈</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="输入您的留言内容..."
                                className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setCommentModalTask(null)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">取消</button>
                            <button onClick={handleSaveComment} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">保存留言</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InquiryHistory;

