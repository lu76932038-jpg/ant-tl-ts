import React, { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle, Clock, PlayCircle, XCircle, Edit3, Save, MessageSquare, ChevronRight, Activity, Terminal } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AiTask {
    id: number;
    source_link_id: number;
    title: string;
    description: string;
    plan_content: string;
    admin_comment?: string;
    status: 'PENDING_APPROVAL' | 'DEVELOPING' | 'COMPLETED' | 'REJECTED';
    created_at: string;
    updated_at: string;
}

const statusMap = {
    'PENDING_APPROVAL': { label: '待审批', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: <Clock className="w-4 h-4" /> },
    'DEVELOPING': { label: '开发中', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <PlayCircle className="w-4 h-4" /> },
    'COMPLETED': { label: '已上线', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle className="w-4 h-4" /> },
    'REJECTED': { label: '已驳回', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="w-4 h-4" /> },
};

export default function AiTaskApproval() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [tasks, setTasks] = useState<AiTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [adminComment, setAdminComment] = useState('');

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data: any = await api.get('/ai-tasks');
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const startEditing = (task: AiTask) => {
        setEditingId(task.id);
        setEditContent(task.plan_content);
        setAdminComment(task.admin_comment || '');
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        const actionLabel = statusMap[status as keyof typeof statusMap].label;
        if (!confirm(`确定要将任务标记为 [${actionLabel}] 吗？\n这将会同步更新社区原贴！`)) return;

        try {
            await api.put(`/ai-tasks/${id}/status`, {
                status,
                plan_content: editingId === id ? editContent : undefined,
                admin_comment: editingId === id ? adminComment : undefined
            });
            setEditingId(null);
            fetchTasks();
        } catch (error) {
            console.error('Update failed', error);
            alert('操作失败，请重试');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                            <Activity className="w-3 h-3" /> AI 研发自动化控制台
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                            <BrainCircuit className="w-10 h-10 text-indigo-600" />
                            AI 任务审批
                        </h1>
                        <p className="text-slate-500 max-w-2xl text-lg">
                            管理由 AI 智能捕捉并初步拆解的社区需求。您可以审核方案、添加点评，并一键开启自动化研发流程。
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 px-6">
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-medium">待处理任务</div>
                                <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'PENDING_APPROVAL').length}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-medium">活跃研发中</div>
                                <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'DEVELOPING').length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-32 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                        </div>
                        <div className="text-slate-400 font-medium tracking-medium animate-pulse">正在同步 AI 任务轨迹...</div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Terminal className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">暂无待办任务</h3>
                        <p className="text-slate-400">社区中目前没有新的研发型提案需要 AI 预审</p>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {tasks.map(task => (
                            <div key={task.id} className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/60 border border-white overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100/50">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="p-8">
                                    {/* Task Card Header */}
                                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{task.title}</h3>
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${statusMap[task.status].bg} ${statusMap[task.status].color} ${statusMap[task.status].border}`}>
                                                    {statusMap[task.status].icon}
                                                    {statusMap[task.status].label}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" /> 社区源 ID: #{task.source_link_id}</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span>捕捉时间: {new Date(task.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {isAdmin && task.status === 'PENDING_APPROVAL' && (
                                                <>
                                                    {editingId !== task.id ? (
                                                        <button onClick={() => startEditing(task)} className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm active:scale-95">
                                                            <Edit3 className="w-4 h-4" /> 方案修订
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all font-bold text-sm active:scale-95">
                                                            取消修改
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleUpdateStatus(task.id, 'DEVELOPING')} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-extrabold text-sm shadow-lg shadow-indigo-200 active:scale-95">
                                                        <PlayCircle className="w-4 h-4" /> 通过并启动研发
                                                    </button>
                                                    <button onClick={() => handleUpdateStatus(task.id, 'REJECTED')} className="flex items-center gap-2 px-6 py-2.5 bg-white text-red-600 border border-red-100 rounded-2xl hover:bg-red-50 transition-all font-extrabold text-sm active:scale-95">
                                                        驳回
                                                    </button>
                                                </>
                                            )}
                                            {isAdmin && task.status === 'DEVELOPING' && (
                                                <button onClick={() => handleUpdateStatus(task.id, 'COMPLETED')} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-extrabold text-sm shadow-lg shadow-emerald-200 active:scale-95">
                                                    <CheckCircle className="w-4 h-4" /> 确认上线发布
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Section: Dual Column or View Mode */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Left Side: Implementation Plan */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    落地实施方案评估
                                                </h4>
                                                {isAdmin && task.status === 'PENDING_APPROVAL' && editingId === task.id && (
                                                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded uppercase font-bold animate-pulse">
                                                        正在修订方案
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative group/edit">
                                                {isAdmin && editingId === task.id ? (
                                                    <textarea
                                                        className="w-full min-h-[300px] p-6 bg-slate-900 text-indigo-200 rounded-3xl font-mono text-sm leading-relaxed border-0 focus:ring-4 focus:ring-indigo-500/10 shadow-inner"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        spellCheck={false}
                                                    />
                                                ) : (
                                                    <div className="w-full min-h-[300px] p-8 bg-slate-50 rounded-3xl border border-slate-100 overflow-auto group-hover/edit:bg-white transition-colors">
                                                        <div
                                                            className="prose prose-slate prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-strong:text-indigo-600 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded"
                                                            dangerouslySetInnerHTML={{ __html: task.plan_content }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Side: Admin Feedback & Context */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                管理员点评与指令
                                            </h4>

                                            <div className="shadow-inner rounded-3xl bg-indigo-50/30 border border-indigo-100/50 p-8 flex flex-col h-full min-h-[300px]">
                                                {isAdmin && editingId === task.id ? (
                                                    <div className="flex flex-col h-full gap-4">
                                                        <div className="p-4 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl flex items-start gap-3">
                                                            <MessageSquare className="w-5 h-5 text-indigo-600 mt-1 shrink-0" />
                                                            <p className="text-sm text-indigo-700 leading-snug">
                                                                您在这里录入的内容将作为<b>官方终审意见</b>同步发表至社区帖子中。您可以在此指正 AI 的方案偏颇，或给予用户明确的排期承诺。
                                                            </p>
                                                        </div>
                                                        <textarea
                                                            placeholder="输入您的点评或对用户的回复建议..."
                                                            className="flex-1 w-full p-6 bg-white rounded-2xl border-2 border-indigo-200/50 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-700 text-sm leading-relaxed resize-none"
                                                            value={adminComment}
                                                            onChange={(e) => setAdminComment(e.target.value)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col h-full justify-center items-center text-center space-y-4">
                                                        {task.admin_comment ? (
                                                            <div className="w-full space-y-4 text-left">
                                                                <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                    已固化点评
                                                                </div>
                                                                <p className="text-slate-700 font-medium italic leading-relaxed text-lg">
                                                                    "{task.admin_comment}"
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                                                    <MessageSquare className="w-8 h-8 text-indigo-300" />
                                                                </div>
                                                                <p className="text-slate-400 text-sm px-10">
                                                                    {task.status === 'PENDING_APPROVAL'
                                                                        ? (isAdmin ? "点击『方案修订』来录入您的专业评审意见" : "管理员审批通过后将在此显示点评")
                                                                        : "该任务审批时未留下管理员点评"}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {task.status === 'DEVELOPING' && (
                                    <div className="px-8 py-4 bg-blue-50/50 border-t border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-blue-700">
                                            <div className="relative">
                                                <Activity className="w-4 h-4 animate-pulse" />
                                                <div className="absolute inset-0 bg-blue-400 animate-ping rounded-full opacity-20" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">
                                                实时状态：社区用户已收到“开发中”通告
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-medium text-blue-400">
                                            最后同步: {new Date(task.updated_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
