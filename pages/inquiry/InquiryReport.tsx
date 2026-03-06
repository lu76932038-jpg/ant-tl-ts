import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import {
    Activity, CheckCircle2, CircleX, Clock, FileText,
    Layers, TrendingUp, Users, FileBarChart, PieChart as PieIcon,
    ChevronRight, Calendar, Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { InquiryTask } from '../../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const InquiryReport: React.FC = () => {
    const [tasks, setTasks] = useState<InquiryTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, all

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inquiry?all=true') as unknown as InquiryTask[];
            setTasks(response);
        } catch (error) {
            console.error('Failed to fetch tasks for report', error);
        } finally {
            setLoading(false);
        }
    };

    // --- 数据处理逻辑 ---

    const filteredTasks = useMemo(() => {
        if (timeRange === 'all') return tasks;
        const now = new Date();
        const days = timeRange === '7d' ? 7 : 30;
        const cutoff = new Date(now.setDate(now.getDate() - days));
        return tasks.filter(t => new Date(t.created_at) >= cutoff);
    }, [tasks, timeRange]);

    const stats = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'completed').length;
        const failed = filteredTasks.filter(t => t.status === 'failed').length;
        const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

        // 计算平均耗时
        const completedWithTime = filteredTasks.filter(t => t.status === 'completed' && t.completed_at);
        const avgDuration = completedWithTime.length > 0
            ? Math.round(completedWithTime.reduce((acc, t) => {
                const duration = (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 1000;
                return acc + duration;
            }, 0) / completedWithTime.length)
            : 0;

        return { total, completed, failed, successRate, avgDuration };
    }, [filteredTasks]);

    // 趋势数据：7d/30d 按日，all 按月，避免日期格子不覆盖所有数据
    const trendData = useMemo(() => {
        if (timeRange === 'all') {
            // 按月聚合，覆盖所有历史数据
            const groups: Record<string, { date: string, count: number, success: number }> = {};
            filteredTasks.forEach(t => {
                const d = new Date(t.created_at);
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!groups[monthStr]) groups[monthStr] = { date: monthStr, count: 0, success: 0 };
                groups[monthStr].count += 1;
                if (t.status === 'completed') groups[monthStr].success += 1;
            });
            // 按时间升序排列
            return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
        }

        // 7d / 30d：按日初始化格子，确保日期连续
        const groups: Record<string, { date: string, count: number, success: number }> = {};
        const days = timeRange === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0].slice(5); // MM-DD
            groups[dateStr] = { date: dateStr, count: 0, success: 0 };
        }
        filteredTasks.forEach(t => {
            const dateStr = new Date(t.created_at).toISOString().split('T')[0].slice(5);
            if (groups[dateStr]) {
                groups[dateStr].count += 1;
                if (t.status === 'completed') groups[dateStr].success += 1;
            }
        });
        return Object.values(groups);
    }, [filteredTasks, timeRange]);

    // 趋势图合计（应与 stats.total 对齐，用于 UI 校验提示）
    const trendTotal = useMemo(
        () => trendData.reduce((sum, d) => sum + d.count, 0),
        [trendData]
    );

    // 文件类型分布
    const fileTypeData = useMemo(() => {
        const types: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const ext = t.file_name.split('.').pop()?.toLowerCase() || 'other';
            let label = 'Other';
            if (['xlsx', 'xls', 'csv'].includes(ext)) label = 'Excel';
            else if (['pdf'].includes(ext)) label = 'PDF';
            else if (['jpg', 'jpeg', 'png'].includes(ext)) label = 'Image';

            types[label] = (types[label] || 0) + 1;
        });

        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [filteredTasks]);

    // 满意度倾向
    const ratingData = useMemo(() => {
        const counts = { positive: 0, negative: 0, none: 0 };
        filteredTasks.forEach(t => {
            if (t.rating === 1) counts.positive++;
            else if (t.rating === -1) counts.negative++;
            else counts.none++;
        });
        return [
            { name: '满意', value: counts.positive },
            { name: '不满意', value: counts.negative },
            { name: '未评价', value: counts.none }
        ].filter(d => d.value > 0);
    }, [filteredTasks]);

    if (loading && tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-bold">正在生成分析报告...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto w-full gap-6">
            {/* 顶部标题与筛选 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">询价管理 / 询价报表</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">基于 AI 解析任务的深度业务洞察</p>
                </div>
                <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm self-start">
                    {[
                        { id: '7d', label: '近7天' },
                        { id: '30d', label: '近30天' },
                        { id: 'all', label: '全部' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setTimeRange(btn.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${timeRange === btn.id
                                ? 'bg-black text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 核心指标卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: '总解析量', value: stats.total, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: '解析成功率', value: `${stats.successRate}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: '平均解析耗时', value: `${stats.avgDuration}s`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: '解析失败量', value: stats.failed, icon: CircleX, color: 'text-red-500', bg: 'bg-red-50' },
                ].map((item, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
                        <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                            <p className="text-2xl font-black text-slate-800">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 图表主区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 趋势图 */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-violet-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">业务处理趋势</h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    {timeRange === 'all' ? '按月统计' : `按日统计（近${timeRange === '7d' ? 7 : 30}天）`}
                                    &nbsp;·&nbsp;图表合计&nbsp;
                                    <span className={`font-black ${trendTotal !== stats.total ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {trendTotal}
                                    </span>
                                    &nbsp;/&nbsp;总量&nbsp;
                                    <span className="font-black text-slate-600">{stats.total}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="总解析" />
                                <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={3} fillOpacity={0} name="成功解析" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 文件类型饼图 */}
                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <Layers className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800">文件类型分布</h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={fileTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {fileTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 评分饼图 */}
                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <PieIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800">用户反馈倾向</h2>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ratingData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {ratingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === '满意' ? '#10b981' : (entry.name === '不满意' ? '#ef4444' : '#94a3b8')} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 状态明细柱状图 */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <FileBarChart className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800">任务解析状态分布</h2>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={[
                                    { name: '解析成功', value: stats.completed, fill: '#10b981' },
                                    { name: '解析失败', value: stats.failed, fill: '#ef4444' },
                                    { name: '其他(终止/待处理)', value: stats.total - stats.completed - stats.failed, fill: '#94a3b8' }
                                ]}
                                margin={{ left: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                />
                                <Tooltip />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryReport;
