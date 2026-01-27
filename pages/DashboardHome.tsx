import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    ClipboardList,
    Truck,
    ShoppingCart,
    ArrowUpRight,
    Zap,
    Calendar,
    LayoutGrid,
    ChevronRight,
    TrendingUp,
    Clock,
    UserCircle2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip as ChartTooltip } from 'recharts';

const DashboardHome: React.FC = () => {
    const navigate = useNavigate();

    // Mock Data for mini chart
    const trendData = useMemo(() => [
        { name: 'Mon', value: 300 },
        { name: 'Tue', value: 450 },
        { name: 'Wed', value: 380 },
        { name: 'Thu', value: 520 },
        { name: 'Fri', value: 610 },
        { name: 'Sat', value: 480 },
        { name: 'Sun', value: 500 },
    ], []);

    const stats = [
        { label: '活跃询价', value: '128', unit: '个', icon: <ClipboardList size={20} />, color: 'blue', path: '/inquiry-history' },
        { label: '库存周转额', value: '1.2M', unit: '¥', icon: <Package size={20} />, color: 'emerald', path: '/stock' },
        { label: '在途批次', value: '12', unit: '批', icon: <Truck size={20} />, color: 'orange', path: '/stock/entrylist' },
        { label: '待生成采购', value: '5', unit: '单', icon: <ShoppingCart size={20} />, color: 'purple', path: '/stock/purchase-orders' },
    ];

    const quickActions = [
        { title: '即时询价解析', desc: '上传PDF/Excel自动解析', icon: <Zap size={24} className="text-blue-500" />, path: '/' },
        { title: '智能备货建议', desc: '基于预测算法的补货提醒', icon: <TrendingUp size={24} className="text-emerald-500" />, path: '/stock' },
        { title: '采购草稿管理', desc: '快速合并多SKU采购单', icon: <LayoutGrid size={24} className="text-indigo-500" />, path: '/stock/purchase-orders' },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f7f5f2]">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">下午好, 殸木用户</h1>
                    <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm font-medium">
                        <Calendar size={14} />
                        <span>2026年1月24日 · 业务动态全景预览</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-2xl shadow-sm border border-slate-200/60 hidden md:flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <UserCircle2 size={24} />
                        </div>
                        <div className="pr-4">
                            <p className="text-xs font-bold text-slate-800">当前活跃账号</p>
                            <p className="text-[10px] text-slate-400">系统总管理员</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        onClick={() => navigate(stat.path)}
                        className="group relative bg-white p-6 rounded-[2rem] border border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                {stat.icon}
                            </div>
                            <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <ArrowUpRight size={16} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-3xl font-black text-slate-900">{stat.value}</span>
                            <span className="text-[10px] font-bold text-slate-400">{stat.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid (Bento style) */}
            <div className="grid grid-cols-12 gap-6 pb-8">

                {/* 1. Feature Highlight Card */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900">核心业务趋势</h2>
                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Inquiry & Sales Intelligence</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600">
                                <Clock size={12} />
                                滚动查看: 近7日
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" hide />
                                    <ChartTooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10B981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorVal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 2. Quick Actions Vertical Bento */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden h-full flex flex-col justify-between group">
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full translate-x-10 translate-y-10" />

                        <div className="relative z-10">
                            <h2 className="text-lg font-bold mb-2">快捷功能</h2>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed">一键触达核心业务工具，提升协同效率。</p>

                            <div className="space-y-4">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => navigate(action.path)}
                                        className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
                                    >
                                        <div className="size-12 rounded-2xl bg-white flex items-center justify-center shrink-0">
                                            {action.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{action.title}</h3>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{action.desc}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-700" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <span>系统状态</span>
                                <span className="flex items-center gap-1.5">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    正常运行中
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardHome;
