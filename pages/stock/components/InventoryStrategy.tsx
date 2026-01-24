import React from 'react';
import { Settings, Loader2, RefreshCw, Truck as TruckIcon, Package, BarChart2, Activity, AlertTriangle, ShoppingCart, Clock, Zap } from 'lucide-react';
import { ProductDetailData, StrategyConfig, SupplierInfo } from '../types';

interface InventoryStrategyProps {
    data: ProductDetailData | null;
    strategy: StrategyConfig | null;
    isSaving: boolean;
    onSave: () => void;

    editSafetyStock: number;
    setEditSafetyStock: (val: number) => void;

    replenishmentMode: 'fast' | 'economic';
    setReplenishmentMode: (val: 'fast' | 'economic') => void;
    currentLeadTime: number;

    isCreatingPO: boolean;
    onCreatePO: () => void;

    hasUnsavedChanges?: boolean;

    // V3.0.1 任务8: 供应商信息用于模式适配
    supplier?: SupplierInfo | null;

    // V3.0.1 任务11: 补货设置
    autoReplenishment: boolean;
    setAutoReplenishment: (val: boolean) => void;
    autoReplenishmentTime: string;
    setAutoReplenishmentTime: (val: string) => void;
}

const InventoryStrategy: React.FC<InventoryStrategyProps> = ({
    data, strategy, isSaving, onSave,
    editSafetyStock, setEditSafetyStock,
    replenishmentMode, setReplenishmentMode,
    currentLeadTime,
    isCreatingPO, onCreatePO,
    hasUnsavedChanges,
    supplier,
    autoReplenishment, setAutoReplenishment,
    autoReplenishmentTime, setAutoReplenishmentTime
}) => {
    // V3.0.1 任务8: 检查供应商支持的交付模式
    const availableModes = supplier?.deliveryModes || ['fast', 'economic'];
    const isSingleMode = availableModes.length === 1;
    const singleModeType = isSingleMode ? availableModes[0] : null;

    // 如果只有一种模式，自动设置
    React.useEffect(() => {
        if (singleModeType && replenishmentMode !== singleModeType) {
            setReplenishmentMode(singleModeType);
        }
    }, [singleModeType, replenishmentMode, setReplenishmentMode]);
    // Helper for calculation details
    const getSafeStockCalc = () => {
        if (!data) return { formula: '-', calc: '-' };
        const sales = Math.round(data.kpi.sales30Days);
        return {
            formula: '近30天销量 × 安全库存周期',
            calc: `${sales.toLocaleString()} × ${editSafetyStock} = ${(sales * editSafetyStock).toLocaleString()}`
        };
    };

    const getRopCalc = () => {
        if (!data) return { formula: '-', calc: '-' };
        const safeStock = Math.round(data.kpi.sales30Days * editSafetyStock);
        const daily = Math.round(data.kpi.sales30Days / 30);
        const leadTimeUsage = daily * currentLeadTime;
        const inTransit = data.kpi.inTransit;
        return {
            formula: '(安全库存 + 提前期消耗) - 在途库存',
            calc: `(${safeStock.toLocaleString()} + ${daily}×${currentLeadTime}) - ${inTransit} = ${Math.round(safeStock + leadTimeUsage - inTransit).toLocaleString()}`
        };
    };

    const Tooltip = ({ title, content }: { title: string, content: { formula: string, calc: string } }) => (
        <div className="absolute bottom-full left-0 mb-2 w-max max-w-[280px] bg-slate-800 text-white p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-auto cursor-text select-text">
            <div className="text-xs font-bold mb-2 border-b border-slate-600 pb-1 text-blue-200">{title}</div>
            <div className="space-y-2 text-[10px]">
                <div>
                    <span className="text-slate-400 block mb-0.5">计算公式:</span>
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-400 font-mono">{content.formula}</code>
                </div>
                <div>
                    <span className="text-slate-400 block mb-0.5">计算过程:</span>
                    <span className="font-mono text-slate-200">{content.calc}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Settings size={18} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">库存策略配置</h3>
                </div>
                <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-[10px] font-bold text-orange-600">未保存</span>
                        </div>
                    )}
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                        更新库存策略配置
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 1. 补货参数设置 (不再并排，改为垂直堆叠) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">补货参数设置</h4>
                    </div>

                    <div className="space-y-6">
                        {/* Safety Stock */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-medium text-gray-500">安全库存周期</span>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{editSafetyStock} 个月</span>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-12 gap-0.5">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setEditSafetyStock(num)}
                                            className={`h-8 rounded-md text-[10px] font-bold transition-all relative
                                                ${editSafetyStock >= num
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'bg-white text-gray-300 hover:bg-gray-100'
                                                }
                                                ${editSafetyStock === num ? 'ring-2 ring-blue-200 z-10' : ''}
                                            `}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[8px] text-gray-400 font-medium px-1 mt-1">
                                    <span>激进 (1)</span>
                                    <span>平衡 (6)</span>
                                    <span>保守 (12)</span>
                                </div>
                            </div>
                        </div>

                        {/* Replenishment Mode */}
                        <div className="space-y-3">
                            <span className="text-xs font-medium text-gray-500 block">补货模式选择</span>
                            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button
                                    onClick={() => setReplenishmentMode('fast')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${replenishmentMode === 'fast' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <TruckIcon size={14} />
                                    快速 (7天)
                                </button>
                                <button
                                    onClick={() => setReplenishmentMode('economic')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${replenishmentMode === 'economic' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Package size={14} />
                                    经济 (30天)
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-100"></div>

                {/* 2. 预测策略模型 */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">预测策略模型</h4>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full shadow-sm text-purple-600">
                            <BarChart2 size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-purple-900">当前使用: 混合加权预测</div>
                        </div>
                        <div className="text-[10px] font-mono bg-white px-2 py-1 rounded text-gray-500 border border-purple-100">
                            Auto Mode
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-100"></div>

                {/* 3. 核心指标 (从之前的 Action Box 分离出来，作为数据展示) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">关键库存指标</h4>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2 relative group cursor-help">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-500">目标安全库存</span>
                                <AlertTriangle size={12} className="text-gray-300" />
                                <Tooltip title="目标安全库存" content={getSafeStockCalc()} />
                            </div>
                            <span className="font-bold text-gray-900">{data ? Math.round(data.kpi.sales30Days * editSafetyStock).toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2 relative group cursor-help">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-500">建议补货点 (ROP)</span>
                                <AlertTriangle size={12} className="text-gray-300" />
                                <Tooltip title="建议补货点 (ROP)" content={getRopCalc()} />
                            </div>
                            <span className="font-bold text-orange-600">{data ? Math.round((data.kpi.sales30Days * editSafetyStock) + ((data.kpi.sales30Days / 30) * currentLeadTime) - data.kpi.inTransit).toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                        </div>
                        <div className="flex justify-between items-center relative group cursor-help">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-500">经济批量 (EOQ)</span>
                                <AlertTriangle size={12} className="text-gray-300" />
                                <div className="absolute bottom-full left-0 mb-2 w-max max-w-[320px] bg-slate-800 text-white p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-auto cursor-text select-text">
                                    <div className="text-xs font-bold mb-2 border-b border-slate-600 pb-1 text-blue-200">经济批量 (EOQ)</div>
                                    <div className="space-y-2 text-[10px]">
                                        <div>
                                            <span className="text-slate-400 block mb-0.5">定义:</span>
                                            <span className="text-slate-200">使订购成本和持有成本之和最小化的最优订货批量</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block mb-0.5">计算公式:</span>
                                            <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-400 font-mono">EOQ = √(2DS/H)</code>
                                        </div>
                                        <div className="text-slate-400 text-[9px] pt-1 border-t border-slate-700">
                                            D=年需求量, S=每次订货成本, H=单位持有成本
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <span className="font-bold text-blue-600">{strategy?.eoq ? strategy.eoq.toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-100"></div>

                {/* 4. 补货设置 (V3.0.1 任务11/12: 重构) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">补货设置</h4>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4 space-y-4">
                        {/* 手动/自动补货切换 */}
                        <div className="flex items-center justify-between gap-4 flex-nowrap">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm shrink-0">
                                    <Zap size={16} />
                                </div>
                                <div className="shrink-0">
                                    <div className="text-xs font-bold text-gray-800 whitespace-nowrap">补货方式</div>
                                    <div className="text-[10px] text-gray-500 whitespace-nowrap">选择手动或自动触发</div>
                                </div>
                            </div>
                            <div className="flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm shrink-0">
                                <button
                                    onClick={() => setAutoReplenishment(false)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${!autoReplenishment ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    手动
                                </button>
                                <button
                                    onClick={() => setAutoReplenishment(true)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${autoReplenishment ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    自动
                                </button>
                            </div>
                        </div>

                        {/* 自动补货时间配置 */}
                        {autoReplenishment && (
                            <div className="flex items-center justify-between bg-white/60 rounded-lg p-3 border border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-emerald-600" />
                                    <span className="text-xs font-medium text-gray-600">每日执行时间</span>
                                </div>
                                <input
                                    type="time"
                                    value={autoReplenishmentTime}
                                    onChange={(e) => setAutoReplenishmentTime(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-700 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        )}

                        <div className="h-px bg-emerald-200/50"></div>

                        {/* 系统建议和操作按钮 */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">系统建议操作</div>
                                    {(() => {
                                        if (!data) return <span className="text-gray-400 text-sm">数据加载中...</span>;
                                        const dailySales = data.kpi.sales30Days / 30;
                                        const triggerPoint = (data.kpi.sales30Days * editSafetyStock) + (dailySales * currentLeadTime);
                                        const totalAvailable = data.kpi.inStock + data.kpi.inTransit;
                                        const daysLeft = (totalAvailable - triggerPoint) / dailySales;

                                        if (daysLeft <= 0) {
                                            return <div className="text-rose-600 font-black text-base flex items-center gap-2 whitespace-nowrap">需立即补货 <span className="text-xs font-normal text-rose-400 bg-white px-1.5 py-0.5 rounded border border-rose-100">库存告急</span></div>;
                                        }
                                        const date = new Date();
                                        date.setDate(date.getDate() + Math.ceil(daysLeft));
                                        const dateString = date.toISOString().split('T')[0];

                                        return (
                                            <div className="flex flex-col">
                                                <div className={`font-black text-lg ${daysLeft <= 3 ? 'text-orange-600' : 'text-emerald-700'}`}>
                                                    {dateString}
                                                </div>
                                                <div className="text-[10px] text-gray-500">建议最晚补货日期</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <button
                                onClick={onCreatePO}
                                disabled={isCreatingPO}
                                className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isCreatingPO ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        生成采购草稿...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={16} />
                                        生成采购单
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default InventoryStrategy;
