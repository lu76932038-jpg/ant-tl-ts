import React, { useState } from 'react';
import {
    BookOpen,
    Code,
    User,
    Workflow,
    TrendingUp,
    Calculator,
    Database,
    Binary,
    Search,
    LayoutGrid,
    Zap,
    ExternalLink,
    Terminal,
    Cpu,
    Activity,
    Server,
    FileJson,
    ArrowRight
} from 'lucide-react';

const StockHelpCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'user' | 'dev'>('user');

    // Premium Mac-style Browser Frame
    const BrowserFrame: React.FC<{ src: string; alt: string; label?: string }> = ({ src, alt, label }) => (
        <div className="group relative rounded-xl overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-500 hover:shadow-3xl hover:-translate-y-1">
            {/* Window Controls */}
            <div className="bg-gray-50/90 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 flex items-center justify-between z-10 relative">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-inner" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-inner" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-inner" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-md border border-gray-200/50 shadow-sm">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        {label || 'System Preview'}
                    </span>
                </div>
                <div className="w-12"></div> {/* Spacer */}
            </div>

            {/* Image Container */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-200/50 to-gray-50/50" />
                <img
                    src={src}
                    alt={alt}
                    className="relative w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );

    // Feature Card Component
    const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string }> = ({ icon, title, desc, color }) => (
        <div className="relative group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color.replace('from-', 'bg-').split(' ')[0].replace('to-', '')} bg-opacity-10 text-gray-800`}>
                    <div className={`text-${color.split('-')[1]}-600`}>{icon}</div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors">
                    {desc}
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Hero Header */}
            <div className="relative bg-white border-b border-gray-200/60 pb-12 pt-16 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent" />

                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in-up">
                        <BookOpen size={14} /> Documentation V3.0
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-6 max-w-4xl bg-gradient-to-b from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        备货助手核心使用指南
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed mb-10">
                        从智能预测算法到后端策略配置，全方位解析系统逻辑。<br className="hidden md:block" />
                        赋能供应链决策，让每一个 SKU 的流转都清晰可见。
                    </p>

                    {/* Glass Tab Switcher */}
                    <div className="inline-flex items-center p-1.5 bg-gray-100/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-inner">
                        <button
                            onClick={() => setActiveTab('user')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'user'
                                ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5 ring-1 ring-black/5 scale-100'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 scale-95'
                                }`}
                        >
                            <User size={18} className={activeTab === 'user' ? 'fill-blue-100/50' : ''} />
                            产品经理 / 运营
                        </button>
                        <button
                            onClick={() => setActiveTab('dev')}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'dev'
                                ? 'bg-gray-800 text-white shadow-lg shadow-gray-900/20 ring-1 ring-black/5 scale-100'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 scale-95'
                                }`}
                        >
                            <Code size={18} />
                            研发工程师
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">

                {activeTab === 'user' ? (
                    <div className="space-y-24 animate-fade-in">

                        {/* Section 1: Workflow */}
                        <section>
                            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Workflow size={24} />
                                        </div>
                                        核心运作闭环
                                    </h2>
                                    <p className="text-gray-500 max-w-xl">
                                        系统通过 "预测-策略-执行" 三位一体的自动化流程，实现库存管理的无人驾驶。
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <FeatureCard
                                    icon={<Search />}
                                    title="1. 智能预测 (Forecast)"
                                    desc="基于 MoM (环比) 与 YoY (同比) 双模型，结合 ARIMA 算法自动推演未来 12 个月的销量趋势。"
                                    color="from-blue-500 to-indigo-500"
                                />
                                <FeatureCard
                                    icon={<LayoutGrid />}
                                    title="2. 策略配置 (Strategy)"
                                    desc="自定义安全库存水位与补货模式。系统动态计算订货点 (ROP) 与经济订货量 (EOQ)。"
                                    color="from-violet-500 to-purple-500"
                                />
                                <FeatureCard
                                    icon={<Zap />}
                                    title="3. 自动执行 (Execution)"
                                    desc="实时监控库存水位，触及警戒线时自动匹配最优供应商，生成采购建议单。"
                                    color="from-amber-500 to-orange-500"
                                />
                            </div>

                            {/* Screenshot Visualization */}
                            <div className="mt-16 relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[2rem] blur-xl -z-10" />
                                <BrowserFrame
                                    src="/assets/stock_config_panel_screenshot.png"
                                    alt="Configuration Panel"
                                    label="Strategy Configuration Dashboard"
                                />
                            </div>
                        </section>

                        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                        {/* Section 2: KPI */}
                        <section>
                            <div className="mb-12 text-center md:text-left">
                                <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-3 md:justify-start justify-center">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <TrendingUp size={24} />
                                    </div>
                                    KPI 仪表盘解码
                                </h2>
                                <p className="text-gray-500">
                                    实时监控库存健康度，每一项指标都经过精确计算。
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                                {/* Left: Screenshot */}
                                <div className="lg:col-span-7">
                                    <BrowserFrame
                                        src="/assets/kpi_dashboard_screenshot.png"
                                        alt="KPI Dashboard"
                                        label="Real-time Metrics"
                                    />
                                </div>

                                {/* Right: Detailed List */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 divide-y divide-gray-50">
                                        {[
                                            { icon: <Activity className="text-orange-500" />, label: '周转天数', desc: '当前库存 ÷ 日均销量，核心健康指标', val: 'Turnover' },
                                            { icon: <ArrowRight className="text-red-500 -rotate-45" />, label: '缺货风险', desc: '当周转天数 < 供应商交期时触发预警', val: 'Risk Lvl' },
                                            { icon: <Database className="text-blue-500" />, label: '30天实绩', desc: '过去 30 个自然日的实际出库总量', val: 'Historical' },
                                            { icon: <TrendingUp className="text-purple-500" />, label: '30天预测', desc: '未来 30 天的需求预测总和', val: 'Forecast' },
                                            { icon: <Calculator className="text-emerald-500" />, label: '库存估值', desc: '在库数量 × 选中阶梯单价 (FIFO)', val: 'Value' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 group cursor-default">
                                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-200">
                                                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm mb-0.5">{item.label}</div>
                                                    <div className="text-xs text-gray-500">{item.desc}</div>
                                                </div>
                                                <div className="ml-auto text-[10px] font-mono text-gray-300 pt-1 tracking-wider">{item.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-600/5 border border-blue-500/10 text-blue-700 text-sm flex gap-3">
                                        <Zap size={18} className="shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                            <span className="font-bold block mb-1">Live Sync</span>
                                            所有数据每 15 分钟与 ERP 后端自动同步，确保决策基于最新实况。
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-12 animate-fade-in">

                        {/* Dev Intro */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 bg-blue-500/20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-white/10">
                                        <Terminal size={24} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">Core Algorithm</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                        库存核心计算逻辑基于 Typescript 强类型实现，确保运算精度。
                                    </p>

                                    <div className="bg-black/50 rounded-xl p-4 font-mono text-xs text-blue-300 border border-white/5 space-y-1">
                                        <div className="flex gap-2"><span className="text-purple-400">const</span> <span className="text-white">ROP</span> = </div>
                                        <div className="pl-4 text-gray-400">(forecastDaily * leadTime) + safetyStock;</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-emerald-100">
                                        <Server size={24} className="text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Database Architecture</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                        采用 MySQL 8.0 关系型数据库，完全规范化的表结构设计。
                                    </p>
                                    <div className="flex gap-3">
                                        <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">InnoDB</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">UTF8MB4</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Schema Table */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/40 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50 via-white to-white">
                                <Database className="text-slate-400" size={20} />
                                <span className="font-bold text-slate-800">Database Schema Reference</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500">
                                            <th className="px-8 py-4 font-semibold border-b border-gray-100">Table Name</th>
                                            <th className="px-8 py-4 font-semibold border-b border-gray-100">Description</th>
                                            <th className="px-8 py-4 font-semibold border-b border-gray-100">Primary Key</th>
                                            <th className="px-8 py-4 font-semibold border-b border-gray-100">Relations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {[
                                            { name: 'stock_strategy_configs', desc: '核心策略配置主表', pk: 'sku', rel: 'products.model' },
                                            { name: 'suppliers', desc: '全量供应商档案库', pk: 'id', rel: '-' },
                                            { name: 'product_supplier_strategies', desc: '一品一策映射关系', pk: 'id', rel: 'sku, supplier_code' },
                                            { name: 'supplier_price_tiers', desc: '阶梯价格明细 (1:N)', pk: 'id', rel: 'strategy_id' },
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-8 py-4 font-mono text-sm font-medium text-blue-600 group-hover:text-blue-700">{row.name}</td>
                                                <td className="px-8 py-4 text-sm text-gray-600">{row.desc}</td>
                                                <td className="px-8 py-4 font-mono text-xs text-orange-500 bg-orange-50/50 w-fit rounded px-2">{row.pk}</td>
                                                <td className="px-8 py-4 font-mono text-xs text-gray-400">{row.rel}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* API Reference */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 px-2 flex items-center gap-2">
                                <Cpu size={20} className="text-gray-400" />
                                API Endpoints
                            </h3>
                            <div className="grid gap-4">
                                {[
                                    { method: 'GET', path: '/api/products/:sku/detail', desc: 'Fetch product details, KPI metrics and chart datasets in one payload.', tag: 'Core' },
                                    { method: 'GET', path: '/api/products/:sku/strategy', desc: 'Retrieve current active strategy and supplier configurations.', tag: 'Config' },
                                    { method: 'POST', path: '/api/products/:sku/strategy', desc: 'Update strategy parameters. Triggers automatic audit log entry.', tag: 'Action' },
                                ].map((api, i) => (
                                    <div key={i} className="group bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-6">
                                        <div className={`w-16 py-1.5 rounded-lg text-center text-[10px] font-black tracking-wider uppercase border shadow-sm ${api.method === 'GET' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                            {api.method}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <code className="text-sm font-bold text-gray-800 font-mono group-hover:text-blue-600 transition-colors">{api.path}</code>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">{api.tag}</span>
                                            </div>
                                            <p className="text-sm text-gray-500">{api.desc}</p>
                                        </div>
                                        <div className="p-2 rounded-full hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors cursor-pointer">
                                            <FileJson size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* Footer */}
                <div className="mt-24 pt-12 border-t border-gray-200/60 text-center">
                    <p className="text-sm font-medium text-gray-400 flex items-center justify-center gap-2">
                        Ant Tools Design System
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        MIT Licensed
                    </p>
                </div>

            </div>
        </div>
    );
};

export default StockHelpCenter;
