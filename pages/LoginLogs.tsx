import React, { useState, useEffect } from 'react';
import { History, Search, RotateCw, CheckCircle2, CircleX, User, Globe, Laptop, Clock, LayoutGrid, LoaderCircle } from 'lucide-react';
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
    const [statusFilter, setStatusFilter] = useState<'success' | 'failed' | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (searchTerm) query.append('username', searchTerm);
            // Note: The backend might not support startDate/endDate filtering yet, 
            // but we'll include the UI elements for it and filter client-side if needed for now,
            // or pass them if the backend supports it. 
            // Based on previous code, only username and status were passed.
            // We will filter by status on the client side if the backend query param behaves differently,
            // but usually passing 'status' works.
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
    }, [statusFilter]); // Re-fetch or re-filter when status changes

    // Filter logs based on date range and search term (client-side refinement)
    const filteredLogs = logs.filter(log => {
        if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (new Date(log.created_at) < sDate) return false;
        }
        if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (new Date(log.created_at) > eDate) return false;
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return (
                log.username.toLowerCase().includes(lowerTerm) ||
                (log.ip_address || '').includes(lowerTerm)
            );
        }
        return true;
    });

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
        <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto overflow-hidden w-full min-h-0">
            {/* Top Section (Header + Filters) */}
            <div className="flex-none space-y-4 pb-6 px-2">
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">系统管理 / 登录日志</h1>
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

                {/* Filter Bar */}
                <div className="bg-[#f0f0f0]/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Search Input */}
                        <div className="relative min-w-[240px] w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="搜索用户名或 IP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-5 pr-5 py-3 bg-white border border-slate-100 text-sm rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 shadow-sm transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Search className="w-4 h-4 text-slate-300" />
                            </div>
                        </div>

                        {/* Date Range Picker - Styled to match InquiryList */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center px-4 gap-3 h-12 hover:border-blue-200 transition-colors group w-full md:w-auto">
                                <Clock className="w-4 h-4 text-slate-300" />
                                <div className="flex items-center gap-2 font-mono text-[13px] font-black text-slate-700 flex-1 md:flex-none">
                                    <div className="relative flex items-center flex-1">
                                        <span className={startDate ? 'text-slate-700' : 'text-slate-300'}>
                                            {startDate || '开始日期'}
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
                                    <div className="relative flex items-center flex-1">
                                        <span className={endDate ? 'text-slate-700' : 'text-slate-300'}>
                                            {endDate || '结束日期'}
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

                        {/* Status Filters */}
                        <div className="flex items-center gap-2 ml-auto w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {[
                                { id: null, label: '全部', icon: LayoutGrid, color: 'slate', count: logs.length },
                                { id: 'success', label: '登录成功', icon: CheckCircle2, color: 'emerald', count: logs.filter(l => l.status === 'success').length },
                                { id: 'failed', label: '登录失败', icon: CircleX, color: 'red', count: logs.filter(l => l.status === 'failed').length }
                            ].map((btn) => (
                                <button
                                    key={btn.label}
                                    onClick={() => setStatusFilter(btn.id as any)}
                                    title={btn.label}
                                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all font-black text-sm group shrink-0 whitespace-nowrap
                                    ${statusFilter === btn.id
                                            ? 'bg-black text-white shadow-lg'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-50 shadow-sm'}`}
                                >
                                    <btn.icon className={`w-4 h-4 ${statusFilter === btn.id ? 'text-white' : `text-${btn.color}-500`}`} />
                                    <span>{btn.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] min-w-[20px] text-center ml-1
                                    ${statusFilter === btn.id ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                                        {btn.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
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
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <CircleX className="w-12 h-12 opacity-20" />
                                            <p className="font-bold">暂无相关登录记录</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-100/30 transition-colors group">
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
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-tight">
                                                    <CheckCircle2 className="w-3 h-3" /> 成功
                                                </span>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[11px] font-black uppercase tracking-tight w-fit">
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
                {!loading && filteredLogs.length > 0 && (
                    <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                        <span>仅显示最近 500 条记录</span>
                        <span>共 {filteredLogs.length} 条</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginLogs;
