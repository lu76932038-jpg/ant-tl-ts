import React, { useEffect, useState } from 'react';
import { AiChatLog } from '../../types/AiChatLog';
import { Calendar, Search, Activity, Code, Database, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { api } from '../../services/api';

const ChatLogs: React.FC = () => {
    const [logs, setLogs] = useState<AiChatLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AiChatLog | null>(null);

    useEffect(() => {
        fetchChatLogs();
    }, []);

    const fetchChatLogs = async () => {
        try {
            const data: any = await api.get('/rag/logs');
            if (data.success) {
                setLogs(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full bg-[#f8fafc]">
            {/* List Sidebar */}
            <div className="w-1/3 min-w-[320px] bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        RAG 审计日志
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">记录所有 AI 交互过程</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">加载中...</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {logs.map(log => (
                                <button
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedLog?.id === log.id ? 'bg-blue-50/60 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            #{log.id}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(log.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                                        </span>
                                    </div>
                                    <div className="font-medium text-slate-700 line-clamp-2 mb-1.5">
                                        {log.user_query}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        {log.sql_generated ? (
                                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                <Database className="w-3 h-3" /> SQL生成成功
                                            </span>
                                        ) : (
                                            <span className="text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">无 SQL</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">
                {selectedLog ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* User Query Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                    用户提问
                                </h3>
                                <span className="text-xs text-slate-400 font-mono">
                                    {format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                </span>
                            </div>
                            <div className="p-4 text-slate-800 text-lg">
                                {selectedLog.user_query}
                            </div>
                        </div>

                        {/* SQL Generated Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                                <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    生成的 SQL
                                </h3>
                            </div>
                            <div className="p-0 bg-[#0f172a]">
                                <pre className="p-4 text-emerald-400 font-mono text-sm overflow-x-auto">
                                    {selectedLog.sql_generated || "// 未生成 SQL"}
                                </pre>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
                                执行结果: {selectedLog.sql_execution_result}
                            </div>
                        </div>

                        {/* Prompt Used (Collapsed by default maybe, but let's show it) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-700 text-sm">Context & Debug Info</h3>
                            </div>
                            <div className="p-4 bg-slate-50 overflow-auto max-h-60 text-xs font-mono text-slate-600">
                                <pre>{selectedLog.prompt_used}</pre>
                            </div>
                        </div>

                        {/* Final Answer */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-blue-100">
                            <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100">
                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    最终回答
                                </h3>
                            </div>
                            <div className="p-6 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {selectedLog.final_answer}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Activity className="w-12 h-12 mb-4 opacity-20" />
                        <p>选择左侧日志查看详情</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLogs;
