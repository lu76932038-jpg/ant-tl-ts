import React, { useState, useEffect } from 'react';
import { History, Search, RotateCw, CheckCircle2, CircleX, User, Globe, Laptop } from 'lucide-react';
import { api } from '../services/api';

interface LoginLog {
    id: number;
    user_id: number;
    username: string;
    ip_address: string;
    user_agent: string;
    status: 'success' | 'failed';
    error_message: string;
    created_at: string;
}

const LoginLogs: React.FC = () => {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (searchTerm) query.append('username', searchTerm);
            if (statusFilter) query.append('status', statusFilter);

            const response = await api.get(`/audit/login-logs?${query.toString()}`);
            setLogs(response as unknown as LoginLog[]);
        } catch (error) {
            console.error('Failed to fetch login logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="flex-1 flex flex-col p-8 max-w-[1200px] mx-auto w-full">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">登录日志</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">记录系统访问履历与安全状态</p>
                    </div>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm"
                    title="刷新数据"
                >
                    <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* 过滤器 */}
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="搜索用户名..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 bg-white/80 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all font-bold text-slate-600"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-6 py-3.5 bg-white/80 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all appearance-none cursor-pointer min-w-[160px]"
                >
                    <option value="">全部状态</option>
                    <option value="success">登录成功</option>
                    <option value="failed">登录失败</option>
                </select>
                <button
                    onClick={fetchLogs}
                    className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                    查询
                </button>
            </div>

            {/* 日志内容 */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">时间</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">用户</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">状态</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">IP 地址</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">设备/浏览器</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6">
                                            <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <CircleX className="w-12 h-12 opacity-20" />
                                            <p className="font-bold">暂无相关登录记录</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="text-xs font-mono font-bold text-slate-400">{formatDate(log.created_at)}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{log.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {log.status === 'success' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tight">
                                                    <CheckCircle2 className="w-3 h-3" /> 成功
                                                </span>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tight w-fit">
                                                        <CircleX className="w-3 h-3" /> 失败
                                                    </span>
                                                    {log.error_message && <span className="text-[9px] text-red-400 font-bold ml-1">{log.error_message}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
                                                <Globe className="w-3.5 h-3.5 text-slate-300" />
                                                {log.ip_address || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 max-w-[200px] truncate" title={log.user_agent}>
                                                <Laptop className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                                                {log.user_agent}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                    <span>仅显示最近 500 条记录</span>
                    <span>共 {logs.length} 条</span>
                </div>
            </div>
        </div>
    );
};

export default LoginLogs;
