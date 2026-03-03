import React from 'react';
import { 
    RefreshCw, 
    Zap, 
    Mail, 
    History, 
    Database, 
    ShieldCheck, 
    AlertTriangle, 
    ExternalLink,
    Search,
    ChevronDown,
    Plus,
    X,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';

const CreditSync: React.FC = () => {
    return (
        <div className="p-10 space-y-10 bg-[#f8fafc] min-h-full">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" />
                        设置 &gt; 数据集成与监控
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">数据集成与监控设置</h1>
                    <p className="text-slate-500 font-medium">配置外部征信接口同步策略，设定风险预警阈值并监控系统运行日志。</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm">取消</button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                        <ShieldCheck className="w-4 h-4" />
                        保存更改
                    </button>
                </div>
            </div>

            {/* Top Config Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Sync Strategy */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">常规同步策略</h2>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tight italic">配置与外部征信机构的数据同步频率</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">同步频率</label>
                        <div className="relative group">
                            <select className="w-full pl-6 pr-12 py-5 bg-slate-50 border-none rounded-[20px] font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer">
                                <option>每日 (午夜 UTC)</option>
                                <option>每 6 小时</option>
                                <option>实时触发</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors pointer-events-none" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 italic pl-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            对于高交易量客户，建议开通实时触发策略。
                        </p>
                    </div>
                </div>

                {/* 2. Circuit Breaker */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">事件驱动熔断机制</h2>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tight italic">自动化风险缓解与紧急处理策略</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px]">
                            <div>
                                <h4 className="font-black text-slate-900">监测到重大法律风险自动冻结</h4>
                                <p className="text-xs font-medium text-slate-500 mt-1">若检测到重大法律诉讼，系统将自动暂停授信额度更新。</p>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px]">
                            <div>
                                <h4 className="font-black text-slate-900">可疑活动暂停</h4>
                                <p className="text-xs font-medium text-slate-500 mt-1">若数据解析错误率超过 5%，自动暂停同步任务。</p>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Routing */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">通知路由设置</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">风险专员邮箱分配</label>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-[300px] bg-slate-50 border border-slate-100 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                                <Mail className="w-5 h-5 text-slate-300" />
                                <input type="email" placeholder="officer@enterprise.com" className="bg-transparent border-none flex-1 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0" />
                            </div>
                            <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
                                <Plus className="w-4 h-4" />
                                添加接收人
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        {['risk-team@ent.com', 'cto-office@enterprise.com', 'legal-review@ent.com'].map((email, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs ring-1 ring-indigo-100 group cursor-default hover:bg-indigo-600 hover:text-white transition-all">
                                {email}
                                <button className="p-0.5 hover:bg-white/20 rounded-md transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Run Logs Table */}
            <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <History className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">运行日志监控</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight italic">近期数据同步任务及执行结果分析</p>
                        </div>
                    </div>
                    <button className="text-sm font-black text-indigo-600 hover:underline">查看全部日志</button>
                </div>
                
                <div className="p-2">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-6">任务 ID</th>
                                <th className="px-8 py-6">执行时间</th>
                                <th className="px-8 py-6">执行状态</th>
                                <th className="px-8 py-6">持续时长</th>
                                <th className="px-8 py-6">错误码 / 详述</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { id: '#SYNC-9281', time: '2023-10-24 14:00', status: 'Success', duration: '1.2s', error: '-' },
                                { id: '#SYNC-9280', time: '2023-10-24 13:00', status: 'Success', duration: '1.4s', error: '-' },
                                { id: '#SYNC-9279', time: '2023-10-24 12:00', status: 'Failed', duration: '4.8s', error: 'ERR_TIMEOUT' },
                                { id: '#SYNC-9278', time: '2023-10-24 11:00', status: 'Success', duration: '1.1s', error: '-' },
                            ].map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="px-8 py-6 font-black text-slate-900">{log.id}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                            <Clock className="w-4 h-4 text-slate-300" />
                                            {log.time}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                            log.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {log.status === 'Success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {log.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-bold text-slate-700">{log.duration}</td>
                                    <td className="px-8 py-6 font-black text-[11px] text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <span className={log.error !== '-' ? 'text-rose-600' : ''}>{log.error}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreditSync;
