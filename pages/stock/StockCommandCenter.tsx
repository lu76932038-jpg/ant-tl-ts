import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Settings2,
    LineChart,
    Truck,
    Save,
    RotateCcw,
    ChevronLeft,
    Calendar,
    Zap,
    ShieldCheck,
    Package,
    ArrowRight,
    TrendingUp,
    AlertTriangle,
    Activity,
    Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ----------------------------------------------------------------------
// 布局渲染器：Bento 风格卡片 (殸木浅色系版)
// ----------------------------------------------------------------------
const BentoCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    badge?: string;
    variant?: 'white' | 'ghost';
}> = ({ title, icon, children, className = "", badge, variant = 'white' }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative group rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${variant === 'white'
            ? 'bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50'
            : 'bg-gray-50/50 border border-dashed border-gray-200'
            } ${className}`}
    >
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-xl text-gray-900 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    {title}
                    {badge && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                            {badge}
                        </span>
                    )}
                </h3>
            </div>
        </div>

        <div className="p-6 flex-1 overflow-visible">
            {children}
        </div>
    </motion.div>
);

// ----------------------------------------------------------------------
// 主页面：备货指挥中心 (Ant Tools 风格落地版)
// ----------------------------------------------------------------------
const StockCommandCenter: React.FC = () => {
    const { sku } = useParams<{ sku: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-black/5 border-t-black rounded-full animate-spin" />
                    <p className="text-gray-400 font-medium text-xs tracking-widest uppercase">Initializing Command Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#f7f5f2] text-gray-900 flex flex-col font-sans overflow-hidden">
            {/* 顶部导航区域 - 增加固定容器和内边距 */}
            <header className="p-4 md:px-8 md:pt-8 md:pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="size-12 bg-white hover:bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center transition-all shadow-sm border border-gray-100 group active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">
                            <Activity className="w-3 h-3" />
                            Inventory Strategy Engine
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                            备货配置指挥舱
                            <span className="px-3 py-1 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-500 shadow-sm">
                                {sku}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-600 px-5 py-2.5 rounded-2xl font-bold transition-all border border-gray-200 active:scale-95">
                        <RotateCcw className="w-4 h-4" />
                        重置更改
                    </button>
                    <button className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-black/10 active:scale-95">
                        <Save className="w-4 h-4" />
                        应用并保存配置
                    </button>
                </div>
            </header>

            {/* 主工作区 - 三栏布局 - 增加左右内边距和底部间距 */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 px-4 md:px-8 pb-6 overflow-hidden">

                {/* 左栏：动态预测 (25%) */}
                <div className="lg:col-span-3 h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <BentoCard title="需求预测分布" icon={<TrendingUp className="w-4 h-4" />} badge="SCENARIO_A">
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">智能预测场景</div>
                                <div className="flex flex-col gap-2">
                                    <button className="w-full py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black transition-all">
                                        🔥 新品高速增长
                                    </button>
                                    <button className="w-full py-2.5 bg-transparent border border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-100 transition-all">
                                        常规平稳波动
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">环比 (MoM) 权重</span>
                                    <span className="font-bold">65%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} className="h-full bg-black" />
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">同比 (YoY) 权重</span>
                                    <span className="font-bold">35%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '35%' }} className="h-full bg-blue-500" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <div className="text-3xl font-black text-gray-900 tabular-nums">¥1,245,600</div>
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +12.5% 季度预估增长
                                </div>
                            </div>
                        </div>
                    </BentoCard>

                    <BentoCard title="实时仓库水位" icon={<Box className="w-4 h-4" />}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">在库总量</div>
                                    <div className="text-lg font-black tracking-tight">4,200</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">建议水位</div>
                                    <div className="text-lg font-black tracking-tight text-blue-600">3,500</div>
                                </div>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 bottom-0 left-[30%] right-[20%] bg-blue-50 border-x border-blue-200" title="安全区间" />
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '75%' }}
                                    className="h-full bg-black relative z-10"
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                当前库存处于 <span className="text-orange-600 font-bold">高位区间</span>。受近期大促影响，建议保持现有补货节奏。
                            </p>
                        </div>
                    </BentoCard>
                </div>

                {/* 中栏：决策配置区 (40%) */}
                <div className="lg:col-span-5 h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <BentoCard title="库存协同参数" icon={<Settings2 className="w-4 h-4" />} badge="DYNAMIC_MODE">
                        <div className="space-y-10">
                            {/* 安全库存周期 */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-gray-900">安全库存周期 (Safety Stock)</h4>
                                        <p className="text-xs text-gray-500 max-w-xs">该参数决定了系统自动补货时的“保底”周转月数。</p>
                                    </div>
                                    <div className="text-3xl font-black text-black">3.5 <span className="text-xs font-bold text-gray-400 uppercase">Months</span></div>
                                </div>

                                <div className="relative pt-6">
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="12"
                                        step="0.5"
                                        defaultValue="3.5"
                                        className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-black"
                                    />
                                    <div className="absolute top-0 left-[25%] flex flex-col items-center">
                                        <div className="w-0.5 h-3 bg-gray-200" />
                                        <span className="text-[9px] font-bold text-gray-400 mt-1">行业建议</span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-[11px] font-bold text-gray-400 font-mono">
                                    <span>0.5M</span>
                                    <span>6.0M</span>
                                    <span>12.0M</span>
                                </div>
                            </div>

                            {/* 补货路径选择 */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    补货交付路径
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="group relative flex flex-col gap-3 p-5 rounded-3xl border-2 border-black bg-white transition-all text-left shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="size-8 bg-black text-white rounded-xl flex items-center justify-center">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div className="size-4 rounded-full border-4 border-black" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-900">快速交付 (7 Days)</div>
                                            <div className="text-[10px] text-gray-500 mt-1 font-medium">适合波动频率高的产品</div>
                                        </div>
                                    </button>
                                    <button className="group relative flex flex-col gap-3 p-5 rounded-3xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-all text-left">
                                        <div className="flex items-center justify-between">
                                            <div className="size-8 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div className="size-4 rounded-full border-2 border-gray-200" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400">经济交付 (30 Days)</div>
                                            <div className="text-[10px] text-gray-400 mt-1 font-medium">适合批量平稳的长尾款</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* 联动配置卡片 */}
                            <div className="p-1 px-6 py-5 bg-blue-50/30 rounded-3xl border border-blue-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                        <LineChart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 tracking-tight">自动 EOQ 计算优化</div>
                                        <div className="text-[11px] text-blue-600/70 font-bold">已基于阶梯价自动匹配最优采购量</div>
                                    </div>
                                </div>
                                <div className="w-12 h-7 bg-blue-600 rounded-full flex items-center justify-end p-1 transition-all">
                                    <div className="size-5 bg-white rounded-full shadow-md" />
                                </div>
                            </div>
                        </div>
                    </BentoCard>
                </div>

                {/* 右栏：模拟反馈区 (35%) */}
                <div className="lg:col-span-4 h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <BentoCard
                        title="策略仿真分析"
                        icon={<Activity className="w-4 h-4" />}
                        className="flex-1"
                        badge="SIM_READY"
                    >
                        <div className="h-full flex flex-col gap-8">
                            {/* 仿真图表渲染区 */}
                            <div className="flex-1 min-h-[240px] bg-white rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

                                <AnimatePresence>
                                    <motion.div
                                        key="placeholder"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative text-center space-y-3 px-10"
                                    >
                                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
                                            <BarChart3 className="w-8 h-8" />
                                        </div>
                                        <div className="text-xs font-black text-gray-900 tracking-widest uppercase">Simulation Feedback</div>
                                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                            更改参数后，系统将在此处自动实时生成 90 天备货走势推演。
                                        </p>
                                    </motion.div>
                                </AnimatePresence>

                                <div className="absolute bottom-6 left-6 right-6 h-1 bg-gray-50 rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        className="w-1/3 h-full bg-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">核心评估指标</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-400">预计周转天数</span>
                                            <ArrowRight className="w-3 h-3 text-gray-300" />
                                        </div>
                                        <div className="text-2xl font-black tabular-nums">42 <span className="text-xs font-bold text-gray-400">Days</span></div>
                                        <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">-5.2%</div>
                                    </div>
                                    <div className="p-5 bg-blue-50/20 rounded-3xl border border-blue-50 space-y-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-blue-400">缺货覆盖率</span>
                                            <AlertTriangle className="w-3 h-3 text-blue-300" />
                                        </div>
                                        <div className="text-2xl font-black tabular-nums">99.8 <span className="text-xs font-bold text-gray-400">%</span></div>
                                        <div className="text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2 py-0.5 rounded-full w-fit mt-1">HIGH_SAFE</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BentoCard>
                </div>

            </main>

        </div>
    );
};

// ----------------------------------------------------------------------
// 封装后的导出组件
// ----------------------------------------------------------------------
const StockCommandCenterView = () => (
    <>
        <style dangerouslySetInnerHTML={{
            __html: `
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.02);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 24px;
        width: 24px;
        border-radius: 50%;
        background: #000;
        cursor: pointer;
        border: 4px solid #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transition: all 0.2s;
      }
      input[type=range]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      }
    `}} />
        <StockCommandCenter />
    </>
);

export default StockCommandCenterView;
