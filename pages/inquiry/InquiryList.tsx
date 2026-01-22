import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, FileText, Share2, RotateCw, File, CheckCircle2, CircleX, LoaderCircle, Plus, LayoutGrid, ThumbsUp, ThumbsDown, ChevronUp, ChevronDown, FileSpreadsheet, FileCode, ImageIcon, CircleOff, Clock, HelpCircle, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';
import { InquiryTask } from '../../types';
import UploadDrawer from '../../components/UploadDrawer';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import GuideTour, { GuideStep } from '../../components/GuideTour';

const InquiryList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<InquiryTask[]>([]);
    const isFetchingRef = React.useRef(false); // 增加列表刷新锁
    const isActionPendingRef = React.useRef(false); // 增加手动操作锁（Terminate/Share等）
    const lastFetchTimeRef = React.useRef(0); // 强制请求时间间隔锁（节流）
    const errorCircuitBreakerRef = React.useRef(0); // 429 熔断计时器
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<InquiryTask | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareUserIds, setShareUserIds] = useState<string>('');
    const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [now, setNow] = useState(Date.now());

    // 排序配置
    const [sortConfig, setSortConfig] = useState<{ key: keyof InquiryTask | 'duration' | 'type'; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    // 搜索与过滤状态
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // 默认查询范围从 3 天延长至 30 天，防止用户产生的“数据丢失”错觉
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>('');

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 每秒更新当前时间，驱动倒计时/计时器显示
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 监听路由路径变化，如果是从导航菜单点击进入，重置过滤状态
    useEffect(() => {
        if (location.pathname === '/' || location.pathname === '/inquiry-history') {
            const params = new URLSearchParams(location.search);
            const status = params.get('status');
            if (status) {
                setStatusFilter(status);
            } else {
                // 如果是从侧边栏点击或直接访问路径（且没有状态参数），重置过滤
                // 解决用户反馈的“页面切换后数据查不到”问题（通常是因为保留了之前的 pending 过滤状态）
                setStatusFilter(null);
                setSearchTerm('');
            }
        }
    }, [location.pathname, location.search]);

    useEffect(() => {
        fetchTasks();

        // WebSocket 实时监听优化 (加固：支持子路径部署，携带 Token 进行鉴权)
        // 强制使用 /socket.io 路径，避免路径拼接错误导致的 404
        const socketPath = import.meta.env.VITE_SOCKET_PATH || '';

        console.log('[Socket] 初始化连接，路径:', socketPath);

        const socket = io('/', {
            path: socketPath,
            transports: ['polling', 'websocket'], // 恢复默认顺序，先 polling 再升级，兼容性更好
            autoConnect: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
            auth: {
                token: localStorage.getItem('token')
            }
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] 连接失败详情:', err.message);
        });

        socket.on('connect', () => {
            console.log('%c[Socket] 已建立实时通信连接', 'color: #10b981; font-weight: bold');
            if (user) {
                socket.emit('join', user.id);
                if (user.role === 'admin') socket.emit('join_admin');
            }
        });

        socket.on('connect_error', (error) => {
            console.warn('[Socket] 实时链路连接受限（请检查网络或重新登录）:', error.message);
        });

        socket.on('task_updated', (data) => {
            console.log('[Socket] 收到任务更新推送:', data.id, data.status);
            // 改为增量更新状态，不再触发全量列表请求，从根本上解决 429 问题
            setTasks(prevTasks => {
                const index = prevTasks.findIndex(t => t.id === data.id);
                if (index === -1) {
                    // 如果是新任务（例如在其他设备上传的），则需要刷新列表
                    // 但为了安全，这里我们先不处理，等用户手动刷新或下次进入
                    return prevTasks;
                }
                const newTasks = [...prevTasks];
                newTasks[index] = { ...newTasks[index], ...data };
                return newTasks;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // 已移除自动轮询机制，完全依赖 WebSocket 实时推送以彻底杜绝 429 报错。
    // 如果 WebSocket 断开，用户可以通过手动刷新按钮进行拉取。

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '-';
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const getProcessingTime = (task: InquiryTask) => {
        const start = new Date(task.created_at).getTime();
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
        if (task.rating !== null && task.rating !== undefined) return;
        try {
            await api.put(`/inquiry/${task.id}/feedback`, {
                rating: rating,
                comment: task.comment
            });
            // 评价后改为增量更新本地状态，不再刷新全量列表
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, rating } : t));
        } catch (error) {
            console.error('Rating failed', error);
        }
    };

    const searchedTasks = tasks.filter(task => {
        if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (new Date(task.created_at) < sDate) return false;
        }
        if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (new Date(task.created_at) > eDate) return false;
        }
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            return (
                task.file_name.toLowerCase().includes(lowerSearch) ||
                task.id.toLowerCase().includes(lowerSearch) ||
                (task.user_name || '').toLowerCase().includes(lowerSearch)
            );
        }
        return true;
    });

    const filteredTasks = searchedTasks.filter(task => {
        if (statusFilter && task.status !== statusFilter) return false;
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const sortedTasks = [...filteredTasks].sort((a, b) => {
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

    const totalPages = Math.ceil(sortedTasks.length / pageSize);
    const paginatedTasks = sortedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const fetchTasks = async (silent = false) => {
        if (isFetchingRef.current) return;

        // 终极加固 1: 强制请求节流，2秒内只允许一次全量拉取
        const nowTime = Date.now();
        if (nowTime - lastFetchTimeRef.current < 2000) return;

        // 终极加固 2: 熔断检查，如果处于 429 静默期，拦截请求
        if (nowTime < errorCircuitBreakerRef.current) return;

        try {
            isFetchingRef.current = true;
            lastFetchTimeRef.current = nowTime;
            if (!silent) setLoading(true);
            const response = await api.get('/inquiry') as unknown as InquiryTask[];
            setTasks(response);
        } catch (error: any) {
            console.error('Failed to fetch tasks', error);
            // 终极加固 3: 识别 429 并开启长效熔断
            if (error?.response?.status === 429 || error?.message?.includes('429')) {
                errorCircuitBreakerRef.current = Date.now() + 30000; // 进入 30 秒静默期，彻底平息服务器压力
            }
        } finally {
            isFetchingRef.current = false;
            if (!silent) setLoading(false);
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
        }
    };

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
        }
    };

    const handleTerminate = async (task: InquiryTask) => {
        if (!confirm('确定要终止该解析任务吗？')) return;
        if (isActionPendingRef.current) return;

        try {
            isActionPendingRef.current = true;
            // 乐观更新：立即在界面上将状态改为已终止，提供即时反馈
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'terminated' } : t));

            await api.put(`/inquiry/${task.id}/terminate`);
        } catch (error: any) {
            console.error('Terminate failed', error);
            // 终极加固 4: 如果发生 429，开启长效熔断
            if (error?.response?.status === 429 || error?.message?.includes('429')) {
                errorCircuitBreakerRef.current = Date.now() + 30000;
                alert('系统负载过高，已自动开启安全静默保护（30秒内禁止操作），请稍后再试。');
            } else {
                alert('终止任务失败，请检查网络或重试');
                // 注意：彻底移除了 fetchTasks() 补偿调用，防止雪崩
            }
        } finally {
            isActionPendingRef.current = false;
        }
    };

    const handleShare = async () => {
        if (!selectedTask) return;
        try {
            const usernames = shareUserIds.split(/[,，]/).map(s => s.trim()).filter(s => s !== '');
            await api.put(`/inquiry/${selectedTask.id}/share`, { usernames });
            setShareModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Share failed', error);
        }
    };

    const openShareModal = (task: InquiryTask) => {
        setSelectedTask(task);
        setShareUserIds(task.shared_with_names?.join(', ') || '');
        setShareModalOpen(true);
    };

    const guideSteps: GuideStep[] = [
        {
            targetId: 'guide-upload-btn',
            title: '上传询价单 📥',
            content: '点击这里开始上传 Excel、PDF 或图片。系统将自动调用 AI 模型提取物料型号、数量等关键信息。',
            position: 'bottom'
        },
        {
            targetId: 'guide-status-bar',
            title: '状态纵览 📊',
            content: '从这里可以快速过滤不同状态的任务。点击图标即可查看“成功”、“处理中”或“失败”的详细分类。',
            position: 'bottom'
        },
        {
            targetId: 'guide-merge-btn',
            title: '高效合并导出 📁',
            content: '这是一个效率神器！勾选下方多条“解析成功”的任务，点击此按钮可将所有明细合并成一张 Excel 导出。',
            position: 'bottom'
        },
        {
            targetId: 'guide-table-header',
            title: '任务管理列表 📑',
            content: '你可以在这里看到所有处理任务。点击列标题可以进行排序，方便你按时间或状态管理询价单。',
            position: 'bottom'
        },
        {
            targetId: 'guide-action-original',
            title: '原始文件汇存 📄',
            content: '这是您上传的最初版本文件。系统为您永久留存，点击即可随时下载核对。',
            position: 'left'
        },
        {
            targetId: 'guide-action-extracted',
            title: 'OCR 提取底表 🧾',
            content: '系统通过 OCR 技术将图片/PDF 转为的原始 JSON 或初步电子档，您可以查看 AI 润色前的“底稿”。',
            position: 'left'
        },
        {
            targetId: 'guide-action-result',
            title: 'AI 解析正式表 💎',
            content: '这是最具价值的成果！模型已为您完成物料对齐、数量校准，可直接导出为标准报价 Excel。',
            position: 'left'
        },
        {
            targetId: 'guide-action-more',
            title: '协作与控制 ⚡',
            content: '您可以将任务一键分享给同事查看，或者在发现上传错误时手动终止解析任务。',
            position: 'left'
        }
    ];

    const [stats, setStats] = useState({ userCount: 0, inquiryCount: 0 });

    useEffect(() => {
        // Fetch stats
        api.get('/stats/usage').then((res: any) => {
            setStats(res);
        }).catch(err => console.error('Failed to fetch stats', err));
    }, []);

    // ... existing specific useEffects ...

    return (
        <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto overflow-hidden w-full min-h-0">
            {/* 顶层区域 (标题 + 筛选) */}
            <div className="flex-none space-y-4 pb-6 px-2">
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">询价管理 / 询价解析列表</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-100/50 rounded-full border border-slate-100">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                已服务 <span className="text-blue-600">{stats.userCount || '-'}</span> 位用户
                                <span className="mx-2 text-slate-300">|</span>
                                累计解析 <span className="text-blue-600">{stats.inquiryCount || '-'}</span> 单
                            </span>
                        </div>
                        <button
                            onClick={() => { localStorage.removeItem('has_completed_guide_inquiry_list'); window.location.reload(); }}
                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                            title="重新查看新手引导"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:inline">操作指引</span>
                        </button>
                    </div>
                </div>

                <div className="bg-[#f0f0f0]/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <button id="guide-upload-btn"
                                onClick={() => setUploadDrawerOpen(true)}
                                className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 group"
                                title="添加任务"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            </button>
                            <button
                                onClick={() => fetchTasks()}
                                className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-xl shadow-sm hover:text-blue-500 transition-all"
                                title="刷新列表"
                            >
                                <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                id="guide-merge-btn"
                                onClick={handleMergeDownload}
                                disabled={selectedTaskIds.length === 0}
                                className={`w-12 h-12 flex items-center justify-center border rounded-xl shadow-sm transition-all group relative px-0
                                    ${selectedTaskIds.length > 0
                                        ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 scale-100 opacity-100'
                                        : 'bg-white text-slate-300 border-slate-100 opacity-60 scale-100 cursor-not-allowed'}
                                `}
                                title={selectedTaskIds.length > 0 ? `合并导出 (${selectedTaskIds.length})` : '请先勾选任务'}
                            >
                                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                                    {selectedTaskIds.length}
                                </span>
                            </button>
                        </div>

                        <div className="relative min-w-[240px]">
                            <input
                                type="text"
                                placeholder="搜索型号或名称..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-5 pr-5 py-3 bg-white border border-slate-100 text-sm rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 shadow-sm transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center px-4 gap-3 h-12 hover:border-blue-200 transition-colors group">
                                <Clock className="w-4 h-4 text-slate-300" />
                                <div className="flex items-center gap-2 font-mono text-[13px] font-black text-slate-700">
                                    <div className="relative flex items-center">
                                        <span className={startDate ? 'text-slate-700' : 'text-slate-300'}>
                                            {startDate || 'yyyy-mm-dd'}
                                        </span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                        />
                                    </div>
                                    <span className="text-slate-200 px-1 font-normal">至</span>
                                    <div className="relative flex items-center">
                                        <span className={endDate ? 'text-slate-700' : 'text-slate-300'}>
                                            {endDate || 'yyyy-mm-dd'}
                                        </span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <style>{`
                            input[type="date"]::-webkit-calendar-picker-indicator {
                                display: none;
                                -webkit-appearance: none;
                            }
                        `}</style>

                        <div id="guide-status-bar" className="flex items-center gap-2 ml-auto">
                            {[
                                { id: null, label: '全部记录', icon: LayoutGrid, color: 'slate', count: searchedTasks.length },
                                { id: 'completed', label: '解析成功', icon: CheckCircle2, color: 'emerald', count: searchedTasks.filter(t => t.status === 'completed').length },
                                { id: 'pending', label: '正在处理项目', icon: LoaderCircle, color: 'blue', count: searchedTasks.filter(t => t.status === 'pending').length },
                                { id: 'terminated', label: '已终止项目', icon: CircleOff, color: 'slate', count: searchedTasks.filter(t => t.status === 'terminated').length },
                                { id: 'failed', label: '解析失败', icon: CircleX, color: 'red', count: searchedTasks.filter(t => t.status === 'failed').length }
                            ].map((btn, index) => (
                                <button
                                    key={btn.label}
                                    onClick={() => setStatusFilter(btn.id as any)}
                                    title={btn.label}
                                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all font-black text-sm group shrink-0
                                    ${statusFilter === btn.id
                                            ? 'bg-black text-white shadow-lg'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-50 shadow-sm'}`}
                                >
                                    <btn.icon className={`w-5 h-5 ${btn.id === 'pending' && btn.count > 0 ? 'animate-spin' : ''} 
                                    ${statusFilter === btn.id ? 'text-white' : `text-${btn.color}-500`}`}
                                    />
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] min-w-[20px] text-center
                                    ${statusFilter === btn.id ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                                        {btn.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 任务列表卡片 */}
            <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500">
                {loading && tasks.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-96 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>
                            <LoaderCircle className="w-16 h-16 text-blue-500 animate-spin absolute top-0 left-0" />
                        </div>
                        <p className="text-slate-400 font-bold animate-pulse">正在获取任务列表...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-100/50">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-black text-slate-800 text-lg">未找到匹配的记录</p>
                        <p className="text-sm font-medium mt-1">尝试调整搜索词或过滤器</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-sm text-left border-separate border-spacing-0">
                            <thead id="guide-table-header" className="sticky top-0 z-30">
                                <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
                                    <th className="px-6 py-6 font-black w-8 border-b border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={tasks.length > 0 && tasks.filter(t => t.status === 'completed').length > 0 && tasks.filter(t => t.status === 'completed').every(t => selectedTaskIds.includes(t.id))}
                                            onChange={toggleSelectAll}
                                            className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer disabled:opacity-30"
                                            disabled={tasks.filter(t => t.status === 'completed').length === 0}
                                        />
                                    </th>
                                    <th className="px-4 py-6 font-black text-center border-b border-slate-100">下载</th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1">状态 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('id')}>
                                        <div className="flex items-center justify-center gap-1">任务ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('file_name')}>
                                        <div className="flex items-center justify-center gap-1">文件名 {sortConfig.key === 'file_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('type')}>
                                        <div className="flex items-center justify-center gap-1">类型 {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('user_name')}>
                                        <div className="flex items-center justify-center gap-1">提交人 {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center justify-center gap-1">提交时间 {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('completed_at')}>
                                        <div className="flex items-center justify-center gap-1">完成时间 {sortConfig.key === 'completed_at' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-4 py-6 font-black text-center cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('duration')}>
                                        <div className="flex items-center justify-center gap-1">耗时 {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th className="px-6 py-6 font-black text-center border-b border-slate-100">评价</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className={`hover:bg-slate-100/30 transition-all group ${selectedTaskIds.includes(task.id) ? 'bg-blue-50/50' : ''}`}
                                        onClick={(e) => toggleSelectTask(task, e)}
                                    >
                                        <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={(e) => toggleSelectTask(task, e)}
                                                disabled={task.status !== 'completed'}
                                                className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        <td className="px-4 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    id="guide-action-original"
                                                    onClick={() => handleDownloadOriginal(task)}
                                                    className="p-2 hover:bg-white hover:shadow-md text-slate-400 hover:text-blue-500 rounded-xl transition-all"
                                                    title="原始文件"
                                                >
                                                    <File className="w-4 h-4" />
                                                </button>
                                                <button
                                                    id="guide-action-extracted"
                                                    onClick={() => handleDownloadExtracted(task)}
                                                    disabled={!task.raw_content && task.status !== 'completed'}
                                                    className={`p-2 rounded-xl transition-all ${task.raw_content || task.status === 'completed' ? 'hover:bg-white hover:shadow-md text-amber-500' : 'text-slate-100 cursor-not-allowed'}`}
                                                    title="原生记录"
                                                >
                                                    <FileSpreadsheet className="w-4 h-4" />
                                                </button>
                                                <button
                                                    id="guide-action-result"
                                                    onClick={() => handleDownloadResult(task)}
                                                    disabled={task.status !== 'completed'}
                                                    className={`p-2 rounded-xl transition-all ${task.status === 'completed' ? 'hover:bg-white hover:shadow-md text-emerald-500' : 'text-slate-100 cursor-not-allowed'}`}
                                                    title="AI解析结果"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                {task.status === 'pending' ? (
                                                    <button
                                                        id="guide-action-more"
                                                        onClick={() => handleTerminate(task)}
                                                        disabled={String(task.user_id) !== String(user?.id) && user?.role !== 'admin'}
                                                        className={`p-2 rounded-xl transition-all ${String(task.user_id) === String(user?.id) || user?.role === 'admin' ? 'hover:bg-red-50 text-slate-300 hover:text-red-500' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
                                                        title={String(task.user_id) === String(user?.id) || user?.role === 'admin' ? "终止解析" : "仅创建者可终止"}
                                                    >
                                                        <CircleX className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        id="guide-action-more"
                                                        onClick={() => openShareModal(task)}
                                                        disabled={String(task.user_id) !== String(user?.id) && user?.role !== 'admin'}
                                                        className={`p-2 rounded-xl transition-all ${String(task.user_id) === String(user?.id) || user?.role === 'admin' ? 'hover:bg-white hover:shadow-md text-slate-400 hover:text-blue-500' : 'text-slate-100 cursor-not-allowed'}`}
                                                        title={String(task.user_id) === String(user?.id) || user?.role === 'admin' ? "分享" : "仅创建者可分享"}
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 min-w-[120px]">
                                            <div className="flex items-center justify-center">
                                                {task.status === 'completed' && <span className="text-emerald-500 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full text-[11px] font-black tracking-tight"><CheckCircle2 className="w-3.5 h-3.5" /> 已完成</span>}
                                                {task.status === 'pending' && (
                                                    <span className="text-amber-500 flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-[11px] font-black tracking-tight">
                                                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                                        {getProcessingTime(task)}s
                                                    </span>
                                                )}
                                                {task.status === 'failed' && <span className="text-red-500 flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full text-[11px] font-black tracking-tight" title={task.error_message}><CircleX className="w-3.5 h-3.5" /> 解析失败</span>}
                                                {task.status === 'terminated' && <span className="text-slate-500 flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-[11px] font-black tracking-tight"><CircleX className="w-3.5 h-3.5" /> 已终止</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/inquiry/${task.id}`); }}
                                                className="text-blue-500 font-mono font-black text-xs hover:underline decoration-2 underline-offset-4"
                                            >
                                                {task.id.slice(0, 8)}
                                            </button>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="font-bold text-slate-700 truncate max-w-[200px] mx-auto" title={task.file_name}>{task.file_name}</div>
                                                {task.comment && (
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-100 animate-in fade-in slide-in-from-top-1">
                                                        <MessageSquare className="w-2.5 h-2.5" />
                                                        <span className="truncate max-w-[150px]" title={task.comment}>有备注说明</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="p-2 bg-slate-50 rounded-xl shrink-0 border border-slate-100/50 shadow-sm">
                                                    {getFileType(task.file_name) === 'Excel' && <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                                                    {getFileType(task.file_name) === 'PDF' && <FileCode className="w-4 h-4 text-red-500" />}
                                                    {getFileType(task.file_name) === 'Word' && <FileText className="w-4 h-4 text-blue-500" />}
                                                    {getFileType(task.file_name) === 'Image' && <ImageIcon className="w-4 h-4 text-amber-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <span className="text-[11px] font-black text-slate-500 px-3 py-1 bg-slate-100/50 rounded-lg">{task.user_name || '系统'}</span>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <span className="text-slate-400 text-[10px] font-bold">{formatDate(task.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <span className="text-slate-400 text-[10px] font-bold">{formatDate(task.completed_at)}</span>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-slate-400 font-mono text-[11px] font-black">
                                                <Clock className="w-3.5 h-3.5 opacity-30" />
                                                {getProcessingTime(task)}s
                                            </div>
                                        </td>
                                        <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleRating(task, 1)}
                                                    disabled={task.rating !== null && task.rating !== undefined}
                                                    className={`p-2 rounded-xl transition-all ${task.rating === 1 ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'} ${task.rating !== null && task.rating !== undefined && task.rating !== 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                    title="解析准确"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRating(task, -1)}
                                                    disabled={task.rating !== null && task.rating !== undefined}
                                                    className={`p-2 rounded-xl transition-all ${task.rating === -1 ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50'} ${task.rating !== null && task.rating !== undefined && task.rating !== -1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                    title="解析有误"
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && filteredTasks.length > 0 && (
                    <div className="flex-none px-8 py-5 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[11px] text-slate-400 font-black tracking-widest uppercase">
                            显示第 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, filteredTasks.length)} 条记录 / 共 {filteredTasks.length} 条
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                上一页
                            </button>
                            <div className="flex items-center gap-1 px-2">
                                {(() => {
                                    const pages = [];
                                    // 智能分页逻辑：始终包含第一页、最后一页、和当前页附近的页码
                                    // 格式示例: 1 ... 4 5 6 ... 20

                                    // 场景 1: 总页数较少（小于等于 7 页），全部显示
                                    if (totalPages <= 7) {
                                        for (let i = 1; i <= totalPages; i++) {
                                            pages.push(i);
                                        }
                                    } else {
                                        // 始终添加第一页
                                        pages.push(1);

                                        if (currentPage > 4) {
                                            pages.push('...');
                                        }

                                        // 核心区间：当前页的前后各 1 页
                                        let start = Math.max(2, currentPage - 1);
                                        let end = Math.min(totalPages - 1, currentPage + 1);

                                        // 修正边缘情况：如果当前页接近开头或结尾，保持中间至少显示 3 个数字以保持美观
                                        if (currentPage < 4) {
                                            end = Math.max(end, 4); // 确保 1 ... 2 3 4 ... end
                                            start = 2;              // 虽然上面 Math.max 已经处理，显式一些
                                        }
                                        if (currentPage > totalPages - 3) {
                                            start = Math.min(start, totalPages - 3);
                                        }

                                        for (let i = start; i <= end; i++) {
                                            pages.push(i);
                                        }

                                        if (currentPage < totalPages - 3) {
                                            pages.push('...');
                                        }

                                        // 始终添加最后一页
                                        if (totalPages > 1) {
                                            pages.push(totalPages);
                                        }
                                    }

                                    return pages.map((page, index) => {
                                        if (page === '...') {
                                            return (
                                                <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-slate-300 font-bold">
                                                    ...
                                                </span>
                                            );
                                        }
                                        const pageNum = page as number;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === pageNum ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}

                <UploadDrawer
                    isOpen={uploadDrawerOpen}
                    onClose={() => setUploadDrawerOpen(false)}
                    onUploadComplete={(data) => {
                        setUploadDrawerOpen(false);
                        // 终极加固：支持批量增量更新，杜绝上传后的全量刷新
                        if (data && data.tasks && Array.isArray(data.tasks)) {
                            setTasks(prev => [...data.tasks, ...prev]);
                        } else if (data && data.task) {
                            setTasks(prev => [data.task, ...prev]);
                        } else {
                            // 兜底：仅在无数据时尝试刷新，但也受 fetchTasks 内的时间锁保护
                            fetchTasks();
                        }
                    }}
                />

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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">协作用户名 (登录账号，多个用逗号隔开)</label>
                                <input
                                    type="text"
                                    value={shareUserIds}
                                    onChange={(e) => setShareUserIds(e.target.value)}
                                    placeholder="例如: admin, zhangsan, lisi"
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
            </div>

            <GuideTour
                tourKey="inquiry_list"
                steps={guideSteps}
                onComplete={() => console.log('Guide completed')}
            />
        </div>
    );
};

export default InquiryList;
