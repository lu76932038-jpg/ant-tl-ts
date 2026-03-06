import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    RefreshCw,
    Play,
    Calendar,
    Box,
    LineChart as LineChartIcon,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    Zap,
    History,
    Settings,
    Info,
    ArrowRight,
    MousePointer2,
    Clock,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line,
    ComposedChart,
    Bar
} from 'recharts';
import { api } from '../../services/api';

// --- Types ---
interface SimulationPoint {
    date: string;
    actualSales: number;
    simulatedSales: number;
    actualInventory: number;
    simulatedInventory: number;
    safetyStock: number;
}

interface BacktestingStats {
    wape: number;
    actualStockoutDays: number;
    simStockoutDays: number;
    turnoverError: number;
}

const ForecastBacktesting: React.FC = () => {
    const { sku } = useParams<{ sku: string }>();
    const navigate = useNavigate();

    // --- State ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [baseDate, setBaseDate] = useState('2025-01-01');
    const [initialInventory, setInitialInventory] = useState(150);
    const [strategyParams, setStrategyParams] = useState<any>(null);
    const [simData, setSimData] = useState<SimulationPoint[]>([]);
    const [backStats, setBackStats] = useState<BacktestingStats | null>(null);

    // --- 独立销售预测参数 State（参照 ProductDetail.tsx 模式，带安全默认值）---
    const [selectedStartMonth, setSelectedStartMonth] = useState<string>('');
    const [selectedForecastMonth, setSelectedForecastMonth] = useState<string>('');
    const [benchmarkType, setBenchmarkType] = useState<'mom' | 'yoy'>('yoy');
    const [momRange, setMomRange] = useState<number>(6);
    const [momTimeSliders, setMomTimeSliders] = useState<number[]>([33, 66]);
    const [momWeightSliders, setMomWeightSliders] = useState<number[]>([60, 90]);
    const [yoyRange, setYoyRange] = useState<number>(3);
    const [yoyWeightSliders, setYoyWeightSliders] = useState<number[]>([33, 66]);
    const [ratioAdjustment, setRatioAdjustment] = useState<number>(0);

    // --- Effects ---
    useEffect(() => {
        document.title = `回测模拟${sku ? ` - ${sku}` : ''}`;
        if (sku) {
            fetchInitialData();
        }
    }, [sku]);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const result: any = await api.get(`/products/${sku}/strategy`);
            const strat = result.strategy || {};

            // 保存原始 strategyParams（用于库存策略卡片）
            setStrategyParams(strat);

            // 安全解析各独立预测参数（与 ProductDetail.tsx 保持一致）
            if (strat.start_year_month) setSelectedStartMonth(strat.start_year_month);
            if (strat.forecast_year_month) setSelectedForecastMonth(strat.forecast_year_month);
            if (strat.benchmark_type) setBenchmarkType(strat.benchmark_type as 'mom' | 'yoy');
            if (strat.mom_range) setMomRange(strat.mom_range);
            if (strat.mom_time_sliders) setMomTimeSliders(
                typeof strat.mom_time_sliders === 'string' ? JSON.parse(strat.mom_time_sliders) : strat.mom_time_sliders
            );
            if (strat.mom_weight_sliders) setMomWeightSliders(
                typeof strat.mom_weight_sliders === 'string' ? JSON.parse(strat.mom_weight_sliders) : strat.mom_weight_sliders
            );
            if (strat.yoy_range) setYoyRange(strat.yoy_range);
            if (strat.yoy_weight_sliders) setYoyWeightSliders(
                typeof strat.yoy_weight_sliders === 'string' ? JSON.parse(strat.yoy_weight_sliders) : strat.yoy_weight_sliders
            );
            if (strat.ratio_adjustment !== undefined) setRatioAdjustment(Number(strat.ratio_adjustment));

            const detail: any = await api.get(`/products/${sku}/detail`);
            setInitialInventory(detail.inStock || 150);
        } catch (error) {
            console.error('Failed to sync data', error);
        } finally {
            setIsLoading(false);
        }
        // 数据加载完成后再启动回测，避免蒙层遮住图表
        await handleRunBacktest();
    };

    const handleRunBacktest = async () => {
        setIsSimulating(true);
        try {
            const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
            const mockPoints: SimulationPoint[] = months.map((m, index) => {
                const baseActual = 100 + Math.random() * 50;
                const baseSim = baseActual + (Math.random() - 0.5) * 40;
                return {
                    date: m,
                    actualSales: Math.round(baseActual),
                    simulatedSales: Math.round(baseSim),
                    actualInventory: Math.max(0, 300 - index * 20 + (Math.random() - 0.5) * 50),
                    simulatedInventory: Math.max(0, initialInventory - index * 15 + (index > 4 ? 200 : 0) + (Math.random() - 0.5) * 30),
                    safetyStock: 80
                };
            });
            setSimData(mockPoints);
            const totalActual = mockPoints.reduce((acc, p) => acc + p.actualSales, 0);
            const totalAbsDiff = mockPoints.reduce((acc, p) => acc + Math.abs(p.simulatedSales - p.actualSales), 0);
            setBackStats({
                wape: 1 - (totalAbsDiff / totalActual),
                actualStockoutDays: 0,
                simStockoutDays: 2,
                turnoverError: -1.5
            });
        } catch (error) {
            console.error('Backtest failed', error);
        } finally {
            // 等待 800ms 动画后关闭蒙层，确保 await handleRunBacktest() resolve 时状态已清除
            await new Promise(resolve => setTimeout(resolve, 800));
            setIsSimulating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#f8f9fa]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-10 h-10 text-black animate-spin" />
                    <p className="text-gray-500 font-medium">同步环境参数中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#f5f5f7] flex flex-col overflow-hidden">
            <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <History size={12} />
                            Simulation & Backtesting
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">回测模拟</h1>
                    </div>
                    <span className="ml-4 px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-mono font-bold">{sku}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchInitialData} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors">
                        <RefreshCw size={16} className={isSimulating ? 'animate-spin' : ''} />
                        同步最新参数
                    </button>
                    <button onClick={handleRunBacktest} disabled={isSimulating} className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
                        <Zap size={16} fill="white" />
                        启动时空回溯模拟
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-hidden flex gap-6">
                <div className="w-[360px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pb-10 pr-2">

                    {/* 销售预测参数面板 — 紧凑只读版 */}
                    <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">
                        {/* 标题栏 */}
                        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-br from-indigo-50/60 to-white border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 bg-white shadow-sm border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Activity size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">销售预测</h3>
                                    <p className="text-[10px] text-gray-400">Sales Forecasting Config</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/stock/${sku}`)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-gray-500 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                            >
                                <Settings size={12} />
                                修改
                            </button>
                        </div>

                        {/* 参数网格 */}
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {/* 预测模型 */}
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">预测模型</p>
                                <div className="flex p-0.5 bg-gray-100/60 rounded-xl border border-gray-100">
                                    <div className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all ${benchmarkType === 'mom' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-50' : 'text-gray-400'}`}>
                                        环比 MoM
                                    </div>
                                    <div className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all ${benchmarkType === 'yoy' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-50' : 'text-gray-400'}`}>
                                        同比 YoY
                                    </div>
                                </div>
                            </div>

                            {/* 预测周期 */}
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">预测周期</p>
                                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-xs font-black text-gray-700 font-mono">{selectedStartMonth || <span className="text-gray-300">未设置</span>}</span>
                                    <div className="flex items-center gap-1 text-gray-300">
                                        <div className="h-px w-4 bg-gray-200" />
                                        <ArrowRight size={10} />
                                    </div>
                                    <span className="text-xs font-black text-gray-700 font-mono">{selectedForecastMonth || <span className="text-gray-300">未设置</span>}</span>
                                </div>
                            </div>

                            {/* 回溯深度 */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">回溯深度</p>
                                <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                    <span className="text-sm font-black text-indigo-600">{benchmarkType === 'yoy' ? yoyRange : Math.round(momRange / 12) || momRange}</span>
                                    <span className="text-[10px] text-gray-400 ml-1">{benchmarkType === 'yoy' ? '年' : '月'}</span>
                                </div>
                            </div>

                            {/* 偏差修正 */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">偏差修正</p>
                                <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                    <span className={`text-sm font-black ${ratioAdjustment > 0 ? 'text-emerald-600' : ratioAdjustment < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                        {ratioAdjustment > 0 ? '+' : ''}{ratioAdjustment}%
                                    </span>
                                </div>
                            </div>

                            {/* 时序权重 */}
                            <div className="col-span-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">时序权重分配</p>
                                <div className="flex items-center gap-1.5">
                                    {benchmarkType === 'mom' ? (
                                        <>
                                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                                <div className="w-full h-1.5 bg-orange-200/50 rounded-full" style={{ opacity: 0.5 + (momWeightSliders[0] / 100) * 0.5 }} />
                                                <span className="text-[10px] font-black text-orange-500">{momWeightSliders[0]}%</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                                <div className="w-full h-1.5 bg-orange-400 rounded-full" style={{ opacity: 0.5 + ((momWeightSliders[1] - momWeightSliders[0]) / 100) * 0.5 }} />
                                                <span className="text-[10px] font-black text-orange-500">{momWeightSliders[1] - momWeightSliders[0]}%</span>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                                <div className="w-full h-1.5 bg-orange-200/50 rounded-full" style={{ opacity: 0.5 + ((100 - momWeightSliders[1]) / 100) * 0.5 }} />
                                                <span className="text-[10px] font-black text-orange-500">{100 - momWeightSliders[1]}%</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 flex flex-col items-center gap-0.5">
                                                <div className="w-full h-1.5 bg-indigo-300 rounded-full" />
                                                <span className="text-[10px] font-black text-indigo-500">{yoyWeightSliders[0]}%</span>
                                                <span className="text-[9px] text-gray-400">{new Date().getFullYear() - 1}年</span>
                                            </div>
                                            {yoyRange >= 2 && (
                                                <div className="flex-1 flex flex-col items-center gap-0.5">
                                                    <div className="w-full h-1.5 bg-indigo-500 rounded-full" />
                                                    <span className="text-[10px] font-black text-indigo-500">{yoyWeightSliders[1] - yoyWeightSliders[0]}%</span>
                                                    <span className="text-[9px] text-gray-400">{new Date().getFullYear() - 2}年</span>
                                                </div>
                                            )}
                                            {yoyRange >= 3 && (
                                                <div className="flex-1 flex flex-col items-center gap-0.5">
                                                    <div className="w-full h-1.5 bg-indigo-200/60 rounded-full" />
                                                    <span className="text-[10px] font-black text-indigo-500">{100 - yoyWeightSliders[1]}%</span>
                                                    <span className="text-[9px] text-gray-400">{new Date().getFullYear() - 3}年</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 提示 */}
                        <div className="px-4 pb-3">
                            <p className="text-[10px] text-gray-400 italic">* 修改配置请前往"产品备货配置"页面</p>
                        </div>
                    </div>


                    {/* 库存策略卡片 (复刻) */}
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 space-y-6 group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                    <Box size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 tracking-tight">库存策略</h3>
                                    <p className="text-[10px] font-medium text-gray-400">Inventory Policy</p>
                                </div>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
                                <Settings size={14} />
                                修改
                            </button>
                        </div>

                        {/* ── 销售预测参数（内嵌在库存策略卡顶部，无需滚动）── */}
                        <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={13} className="text-indigo-500" />
                                <span className="text-[11px] font-black text-indigo-700 tracking-widest uppercase">销售预测参数</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center">
                                {/* 预测模型 */}
                                <div className="bg-white rounded-xl p-2 border border-indigo-100">
                                    <p className="text-[9px] text-gray-400 font-bold mb-1">预测模型</p>
                                    <p className="text-xs font-black text-indigo-600">{benchmarkType === 'yoy' ? '同比 YoY' : '环比 MoM'}</p>
                                </div>
                                {/* 偏差修正 */}
                                <div className="bg-white rounded-xl p-2 border border-indigo-100">
                                    <p className="text-[9px] text-gray-400 font-bold mb-1">偏差修正</p>
                                    <p className={`text-xs font-black ${ratioAdjustment > 0 ? 'text-emerald-600' : ratioAdjustment < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                        {ratioAdjustment > 0 ? '+' : ''}{ratioAdjustment}%
                                    </p>
                                </div>
                                {/* 回溯深度 */}
                                <div className="bg-white rounded-xl p-2 border border-indigo-100">
                                    <p className="text-[9px] text-gray-400 font-bold mb-1">回溯深度</p>
                                    <p className="text-xs font-black text-indigo-600">
                                        {benchmarkType === 'yoy' ? `${yoyRange} 年` : `${momRange} 月`}
                                    </p>
                                </div>
                                {/* 时序权重 */}
                                <div className="bg-white rounded-xl p-2 border border-indigo-100">
                                    <p className="text-[9px] text-gray-400 font-bold mb-1">权重分配</p>
                                    <p className="text-[10px] font-black text-orange-500">
                                        {benchmarkType === 'mom'
                                            ? `${momWeightSliders[0]} · ${momWeightSliders[1] - momWeightSliders[0]} · ${100 - momWeightSliders[1]}`
                                            : yoyRange === 1
                                                ? '100%'
                                                : yoyRange === 2
                                                    ? `${yoyWeightSliders[0]} · ${100 - yoyWeightSliders[0]}`
                                                    : `${yoyWeightSliders[0]} · ${yoyWeightSliders[1] - yoyWeightSliders[0]} · ${100 - yoyWeightSliders[1]}`
                                        }
                                    </p>
                                </div>
                                {/* 预测周期 */}
                                <div className="col-span-2 bg-white rounded-xl p-2 border border-indigo-100">
                                    <p className="text-[9px] text-gray-400 font-bold mb-1">预测周期</p>
                                    <p className="text-xs font-black text-gray-700 font-mono">
                                        {selectedStartMonth
                                            ? <>{selectedStartMonth} <span className="text-gray-300 mx-1">→</span> {selectedForecastMonth}</>
                                            : <span className="text-gray-300">未设置（请前往产品备货配置）</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">

                                <div className="flex items-start gap-2">
                                    <Clock size={14} className="text-gray-400 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[11px] font-bold text-gray-600">最小销售周期 (影响安全库存)</p>
                                            <span className="text-sm font-black text-gray-900">{strategyParams?.safety_stock_days || 1} <span className="text-[10px] font-bold text-gray-400">个月</span></span>
                                        </div>
                                        <div className="mt-3 h-1.5 bg-gray-100 rounded-full relative">
                                            <div className="absolute inset-y-0 left-0 bg-gray-300 rounded-full" style={{ width: `${Math.min(100, (strategyParams?.safety_stock_days || 1) * 20)}%` }} />
                                            <div className="absolute top-1/2 -translate-y-1/2 size-4 bg-white border-4 border-gray-100 shadow-sm rounded-full" style={{ left: `${Math.min(100, (strategyParams?.safety_stock_days || 1) * 20)}%`, transform: 'translate(-50%, -50%)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/30 rounded-2xl border border-blue-50/50 p-4 relative group">
                                <div className="absolute top-4 right-4 text-blue-300">
                                    <Info size={14} />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">安全库存</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-emerald-600 tracking-tight">73</span>
                                    <span className="text-xs font-bold text-gray-400">PCS</span>
                                </div>
                                <p className="text-[10px] font-bold text-blue-400 mt-1">安全库存指标</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400">补货设置</label>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                                    <span className="text-xs font-bold text-gray-600">起订 ≥1 | ¥87.55 | 20天</span>
                                    <ChevronLeft size={14} className="-rotate-90 text-gray-300" />
                                </div>
                            </div>

                            <div className="bg-orange-50/30 rounded-2xl border border-orange-50/50 p-4 relative">
                                <div className="absolute top-4 right-4 text-orange-300 opacity-50">
                                    <Info size={14} />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp size={14} className="text-orange-500" />
                                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">建议补货点</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-orange-600 tracking-tight">120</span>
                                    <span className="text-xs font-bold text-gray-400">PCS</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCw size={14} className="text-blue-500" />
                                    <div className="flex-1 flex justify-between items-baseline">
                                        <p className="text-[11px] font-bold text-blue-600">补货销售周期</p>
                                        <span className="text-sm font-black text-blue-600">{strategyParams?.replenishment_sales_cycle || 4} <span className="text-[10px] font-bold text-blue-400">个月</span></span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-blue-50 rounded-full relative">
                                    <div className="absolute inset-y-0 left-0 bg-blue-200 rounded-full" style={{ width: `${Math.min(100, (strategyParams?.replenishment_sales_cycle || 4) * 10)}%` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 size-5 bg-white border-4 border-blue-100 shadow-md rounded-full" style={{ left: `${Math.min(100, (strategyParams?.replenishment_sales_cycle || 4) * 10)}%`, transform: 'translate(-50%, -50%)' }} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-400">补货触发方式</label>
                                <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                                    <button className="flex-1 py-1.5 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400">
                                        <MousePointer2 size={12} /> 手动
                                    </button>
                                    <button className="flex-1 py-1.5 flex items-center justify-center gap-2 bg-white shadow-sm rounded-lg text-[11px] font-black text-emerald-600 border border-emerald-50">
                                        <Zap size={12} fill="currentColor" /> 自动
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                                        <Clock size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-700">运行时间</span>
                                </div>
                                <div className="px-5 py-2 bg-white rounded-xl text-sm font-black text-gray-900 border border-gray-100 shadow-sm font-mono tracking-tight">
                                    08:00
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 模拟回溯设定 */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 font-mono">
                            <div className="p-1.5 bg-black rounded-lg text-white">
                                <Calendar size={14} />
                            </div>
                            模拟回溯设定
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">基准日锚定 (Base Date)</label>
                                <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none" />
                                <p className="text-[10px] text-gray-400 italic">屏蔽基准日之后销售实绩，拟合未来曲线。</p>
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">期初实物库存</label>
                                <div className="relative">
                                    <input type="number" value={initialInventory} onChange={(e) => setInitialInventory(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"><Box size={16} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    <div className="grid grid-cols-4 gap-6 shrink-0">
                        <StatCard title="预测准确度 (WAPE)" value={backStats ? `${(backStats.wape * 100).toFixed(1)}%` : '--'} icon={<Target className="text-blue-600" size={18} />} trend={2.4} isPositive={true} />
                        <StatCard title="断货风险偏离度" value={backStats ? `${backStats.simStockoutDays} 天` : '--'} icon={<AlertTriangle className="text-orange-500" size={18} />} trend={-1} isPositive={true} />
                        <StatCard title="周转效率偏差" value={backStats ? `${backStats.turnoverError} 天` : '--'} icon={<Activity className="text-emerald-500" size={18} />} trend={0.5} isPositive={false} />
                        <StatCard title="拟合置信度" value="高 (94.2%)" icon={<CheckCircle2 className="text-purple-600" size={18} />} />
                    </div>

                    <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col overflow-hidden relative">
                        <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                                    <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                    <span className="text-[11px] font-bold text-gray-600">虚：模拟轨迹</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                                    <div className="size-2 rounded-full bg-black"></div>
                                    <span className="text-[11px] font-bold text-gray-600">实：业务实绩</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Data range: {baseDate} to Current</div>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            <AnimatePresence mode="wait">
                                {isSimulating && (
                                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="size-12 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
                                            <div className="text-xs font-black text-gray-900 tracking-widest uppercase">Running Simulation...</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="h-full grid grid-rows-2 gap-4">
                                <div className="h-full relative px-2">
                                    <div className="absolute top-0 left-0 text-[10px] font-bold text-gray-400 uppercase">销售量对比 (Sales Comparison)</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={simData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="simulatedSales" stroke="none" fill="#3b82f6" fillOpacity={0.1} />
                                            <Line type="monotone" dataKey="simulatedSales" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={false} strokeLinecap="round" />
                                            <Line type="monotone" dataKey="actualSales" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 4, stroke: '#fff' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="h-full relative px-2 border-t border-gray-50 pt-4">
                                    <div className="absolute top-4 left-0 text-[10px] font-bold text-gray-400 uppercase">库存水位分析 (Inventory Dynamics)</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={simData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="safetyStock" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                            <Area type="stepAfter" dataKey="simulatedInventory" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.05} strokeDasharray="4 4" dot={false} />
                                            <Line type="stepAfter" dataKey="actualInventory" stroke="#000" strokeWidth={3} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, trend?: number, isPositive?: boolean }> = ({ title, value, icon, trend, isPositive }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2 group hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500">
        <div className="flex items-center justify-between">
            <div className="size-9 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
            {trend && (
                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</div>
            <div className="text-xl font-black text-gray-900 tracking-tight">{value}</div>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 min-w-[180px]">
                <div className="text-[11px] font-black text-gray-400 uppercase mb-3 border-b border-gray-50 pb-2">{label}</div>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase">{entry.name === 'actualSales' ? '真实销售' : entry.name === 'simulatedSales' ? '模拟预测' : entry.name === 'actualInventory' ? '真实库存' : '模拟库存'}</span>
                            </div>
                            <span className="text-sm font-black text-gray-900 tabular-nums">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default ForecastBacktesting;
