import React, { useState, useEffect } from 'react';
import {
    History,
    Search,
    Eye,
    FileText,
    ShieldCheck,
    AlertCircle,
    Clock,
    User as UserIcon,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { config } from '../config';

interface AuditLog {
    id: number;
    username: string;
    action: string;
    file_name: string;
    raw_content_preview: string;
    masked_content_preview: string;
    ai_model: string;
    status: 'success' | 'failed' | 'blocked';
    error_message: string;
    created_at: string;
}

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        try {
            const apiBaseUrl = config.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/audit`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error('获取日志失败');
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 min-h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-light text-slate-800 tracking-[0.1em] flex items-center gap-3">
                        <History className="text-gray-600" />
                        系统审计日志
                    </h2>
                    <p className="text-sm text-slate-400 font-medium">查看全量解析记录与安全脱敏审计</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索文件名或用户名..."
                        className="pl-10 pr-4 py-2.5 bg-white border border-white/40 rounded-2xl text-sm focus:ring-4 focus:ring-gray-400/10 focus:border-gray-400 outline-none w-64 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">时间</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">操作员</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">文件名</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">模型</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">状态</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">正在加载数据...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">没有找到相关日志记录</td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className={`hover:bg-slate-50 transition-colors ${expandedId === log.id ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-slate-800">{log.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-600 max-w-[200px] truncate block">{log.file_name || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-wider">{log.ai_model}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                log.status === 'blocked' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {log.status === 'success' ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                {log.status === 'success' ? '解析成功' : log.status === 'blocked' ? '安全截断' : '解析失败'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                className="p-2 hover:bg-[#2c2c2c] rounded-xl border border-transparent hover:border-gray-200 transition-all text-slate-400 hover:text-white shadow-sm hover:shadow-md"
                                            >
                                                {expandedId === log.id ? <ChevronUp className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === log.id && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={6} className="px-8 py-6">
                                                <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                                            <FileText className="w-4 h-4" /> 原始内容预览 (原始)
                                                        </div>
                                                        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs font-medium text-slate-600 line-clamp-10 whitespace-pre-wrap max-h-[300px] overflow-auto shadow-inner">
                                                            {log.raw_content_preview || '无内容'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-widest">
                                                            <ShieldCheck className="w-4 h-4" /> 脱敏后内容 (脱敏)
                                                        </div>
                                                        <div className="p-4 bg-white rounded-2xl border border-blue-100 text-xs font-medium text-slate-600 line-clamp-10 whitespace-pre-wrap max-h-[300px] overflow-auto shadow-inner">
                                                            {log.masked_content_preview || '无内容'}
                                                        </div>
                                                    </div>
                                                    {log.error_message && (
                                                        <div className="col-span-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            错误详情: {log.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
