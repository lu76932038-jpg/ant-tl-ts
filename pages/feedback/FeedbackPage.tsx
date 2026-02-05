import React, { useState, useEffect } from 'react';
import {
    MessageSquarePlus,
    Send,
    Loader2,
    Sparkles,
    CheckCircle2,
    Bug,
    Lightbulb,
    HelpCircle,
    History
} from 'lucide-react';
import { api } from '../../services/api';

interface FeedbackRecord {
    id: number;
    type: string;
    content: string;
    ai_reply: string;
    status: string;
    created_at: string;
}

const FeedbackPage: React.FC = () => {
    const [type, setType] = useState('FEATURE');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<FeedbackRecord[]>([]);
    const [lastReply, setLastReply] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/feedback');
            setHistory(res as any);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsSubmitting(true);
        setLastReply(null);
        try {
            // Artificial delay to simulate "Analysis"
            await new Promise(r => setTimeout(r, 1500));

            const res: any = await api.post('/feedback', { type, content });
            if (res.success) {
                setContent('');
                setLastReply(res.data.reply);
                fetchHistory();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'BUG': return <Bug size={14} className="text-red-500" />;
            case 'FEATURE': return <Lightbulb size={14} className="text-amber-500" />;
            default: return <MessageSquarePlus size={14} className="text-blue-500" />;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                    <Sparkles className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">使用建议与反馈</h1>
                    <p className="text-slate-500 text-sm font-medium">您的每一条建议，系统将即时进行可行性评估</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-16 translate-x-10 group-hover:bg-indigo-100 transition-colors" />

                        <div className="relative space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">反馈类型</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'FEATURE', label: '功能建议', icon: <Lightbulb size={14} /> },
                                        { id: 'BUG', label: '缺陷反馈', icon: <Bug size={14} /> },
                                        { id: 'IMPROVEMENT', label: '体验优化', icon: <Sparkles size={14} /> },
                                        { id: 'OTHER', label: '其他', icon: <HelpCircle size={14} /> }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setType(opt.id)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all duration-200 font-bold text-sm
                                                ${type === opt.id
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">建议内容</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="请详细描述您的建议或遇到的问题..."
                                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none text-slate-700 font-medium placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !content.trim()}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    提交评估
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Result Card */}
                    {lastReply && (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mt-0.5">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-emerald-900">系统评估完成</h3>
                                    <p className="text-emerald-800/80 leading-relaxed font-medium">
                                        {lastReply}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <History size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">历史记录</span>
                    </div>

                    <div className="space-y-3">
                        {history.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(item.type)}
                                        <span className="text-xs font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full 
                                        ${item.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}
                                    `}>
                                        {item.status === 'PENDING' ? '评估完成' : item.status}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-700 mb-3 line-clamp-2 leading-relaxed">
                                    {item.content}
                                </p>
                                {item.ai_reply && (
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                                        <span className="font-bold text-indigo-600 block mb-1">系统回复:</span>
                                        {item.ai_reply}
                                    </div>
                                )}
                            </div>
                        ))}

                        {history.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                暂无反馈记录
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackPage;
