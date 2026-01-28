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
    ExternalLink
} from 'lucide-react';

const StockHelpCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'user' | 'dev'>('user');

    // Clean Browser Frame for Screenshots
    const BrowserFrame: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
            </div>
            <div className="aspect-video bg-gray-100 relative">
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7]">
            {/* Standard Header */}
            <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-gray-100 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">操作指引</h1>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        Help Center V2.2
                    </span>
                </div>

                {/* Tab Switcher - FilterButton Style */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('user')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'user'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <User size={14} />
                        用户手册
                    </button>
                    <button
                        onClick={() => setActiveTab('dev')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'dev'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Code size={14} />
                        开发者指南
                    </button>
                </div>
            </header>

            {/* Main Content Scrollable */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-[1200px] mx-auto space-y-8">

                    {/* Intro Section */}
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <div className="max-w-3xl">
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">备货助手使用指南</h2>
                            <p className="text-gray-500 leading-relaxed">
                                全方位了解智能备货系统的运作逻辑。从业务操作到底层算法，为您提供详尽的指引与技术支持。
                            </p>
                        </div>
                    </div>

                    {activeTab === 'user' ? (
                        <div className="space-y-8">

                            {/* Workflow Section */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Workflow className="text-gray-400" size={20} />
                                        核心运作流程
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            {
                                                title: '1. 智能预测',
                                                desc: '系统根据历史销量趋势 (MoM/YoY)，自动计算未来 12 个月的需求量。',
                                                icon: <Search size={16} />
                                            },
                                            {
                                                title: '2. 策略配置',
                                                desc: '设定安全库存天数与补货模式。系统自动生成订货点 (ROP)。',
                                                icon: <LayoutGrid size={16} />
                                            },
                                            {
                                                title: '3. 自动执行',
                                                desc: '触及警戒线时，自动匹配供应商生成采购建议单。',
                                                icon: <Zap size={16} />
                                            }
                                        ].map((step, idx) => (
                                            <div key={idx} className="p-4 rounded-lg bg-white border border-gray-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="text-gray-400">{step.icon}</div>
                                                    <span className="font-semibold text-gray-900">{step.title}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="lg:col-span-2">
                                    <BrowserFrame
                                        src="/assets/stock_config_panel_screenshot.png"
                                        alt="Configuration Panel"
                                    />
                                    <p className="mt-2 text-center text-xs text-gray-400">图示：备货策略配置面板</p>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* KPI Section */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 order-2 lg:order-1">
                                    <BrowserFrame
                                        src="/assets/kpi_dashboard_screenshot.png"
                                        alt="KPI Dashboard"
                                    />
                                    <p className="mt-2 text-center text-xs text-gray-400">图示：核心 KPI 仪表盘</p>
                                </div>

                                <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <TrendingUp className="text-gray-400" size={20} />
                                        读懂 KPI 仪表盘
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: '周转天数', desc: '当前库存能维持销售的天数' },
                                            { label: '缺货风险', desc: '对比周转天数与供应商交期' },
                                            { label: '30天出库实绩', desc: '月度历史实际销售总量' },
                                            { label: '30天出库预测', desc: '基于 ARIMA 算法预测的下月需求' },
                                            { label: '库存估值', desc: '库存数量 × 选中阶梯单价' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200">
                                                <span className="font-medium text-gray-700">{item.label}</span>
                                                <span className="text-xs text-gray-400">{item.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-sm">
                                        <div className="font-bold flex items-center gap-2 mb-1">
                                            <Zap size={14} />
                                            Update Frequency
                                        </div>
                                        所有数据每 15 分钟自动更新一次。
                                    </div>
                                </div>
                            </section>

                        </div>
                    ) : (
                        <div className="space-y-8">

                            {/* Algorithm Section */}
                            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="text-gray-400" size={20} />
                                        <h3 className="font-bold text-gray-900">核心算法模型 (Core Logic)</h3>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">TypeScript / Math</span>
                                </div>
                                <div className="p-6 grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm font-bold text-gray-700">1. Inventory Turnover Days</div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-gray-600 leading-relaxed">
                                            const turnoverDays = <br />
                                            &nbsp;&nbsp;currentStock / (salesLast30Days / 30);
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm font-bold text-gray-700">2. Reorder Point (ROP)</div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-gray-600 leading-relaxed">
                                            const ROP = <br />
                                            &nbsp;&nbsp;(forecastDailySales * leadTime) + safetyStock;
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Database Schema */}
                            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                    <Database className="text-gray-400" size={20} />
                                    <h3 className="font-bold text-gray-900">数据模型 (Schema)</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                                                <th className="px-6 py-3 font-medium w-48">Table Name</th>
                                                <th className="px-6 py-3 font-medium">Description</th>
                                                <th className="px-6 py-3 font-medium font-mono text-xs w-64">Primary Keys</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {[
                                                { name: 'stock_strategy_configs', desc: '备货策略配置主表', keys: 'sku' },
                                                { name: 'suppliers', desc: '供应商档案库', keys: 'supplier_code' },
                                                { name: 'product_supplier_strategies', desc: '一品一策配置', keys: 'sku + supplier_code' },
                                                { name: 'supplier_price_tiers', desc: '阶梯价格明细', keys: 'id' },
                                            ].map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-3 font-mono text-blue-600">{row.name}</td>
                                                    <td className="px-6 py-3 text-gray-600">{row.desc}</td>
                                                    <td className="px-6 py-3 font-mono text-xs text-gray-400">{row.keys}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* API Reference */}
                            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                    <Binary className="text-gray-400" size={20} />
                                    <h3 className="font-bold text-gray-900">API 接口概览</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {[
                                        { method: 'GET', path: '/api/products/:sku/detail', desc: '获取产品详情、KPI 及图表数据' },
                                        { method: 'GET', path: '/api/products/:sku/strategy', desc: '获取当前生效的备货与供应商策略' },
                                        { method: 'POST', path: '/api/products/:sku/strategy', desc: '保存策略配置 (触发自动审批日志)' },
                                    ].map((api, i) => (
                                        <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-12 text-center border ${api.method === 'GET' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                {api.method}
                                            </span>
                                            <code className="font-mono text-xs text-gray-700 w-64">{api.path}</code>
                                            <span className="text-sm text-gray-500">{api.desc}</span>
                                            <div className="ml-auto">
                                                <ExternalLink size={14} className="text-gray-300" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-8 text-center">
                        <p className="text-xs text-gray-400">© 2024 Ant Tools System. Documentation V2.2</p>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default StockHelpCenter;
