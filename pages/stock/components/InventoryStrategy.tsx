import React, { useState } from 'react';
import {
    Package,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Zap,
    Clock,
    Calculator,
    Activity,
    ChevronRight,
    HandIcon,
    Info,
    ArrowDownToLine,
    Layers,
    Settings,
    AlertTriangle
} from 'lucide-react';
import { ProductDetailData, StrategyConfig, SupplierInfo } from '../types';

interface InventoryStrategyProps {
    data: ProductDetailData | null;
    strategy: StrategyConfig | null;
    isSaving: boolean;
    onSave: () => void;

    editSafetyStock: number;
    setEditSafetyStock: (val: number) => void;
    editReplenishmentCycle: number;
    setEditReplenishmentCycle: (val: number) => void;

    replenishmentMode: 'fast' | 'economic';
    setReplenishmentMode: (val: 'fast' | 'economic') => void;
    currentLeadTime: number;

    isCreatingPO: boolean;
    onCreatePlan: (qty: number) => void;

    hasUnsavedChanges?: boolean;
    supplier?: SupplierInfo | null;
    onSelectTier?: (tierIndex: number) => void;

    autoReplenishment: boolean;
    setAutoReplenishment: (val: boolean) => void;
    autoReplenishmentTime: string;
    setAutoReplenishmentTime: (val: string) => void;

    editBufferDays: number;
    setEditBufferDays: (val: number) => void;

    isStockingEnabled: boolean;
}

const InventoryStrategy: React.FC<InventoryStrategyProps> = ({
    data, strategy, isSaving, onSave,
    editSafetyStock, setEditSafetyStock,
    editReplenishmentCycle, setEditReplenishmentCycle,
    replenishmentMode, setReplenishmentMode,
    currentLeadTime,
    isCreatingPO, onCreatePlan,
    supplier,
    onSelectTier,
    autoReplenishment, setAutoReplenishment,
    autoReplenishmentTime, setAutoReplenishmentTime,
    editBufferDays, setEditBufferDays,
    isStockingEnabled
}) => {
    // Local Edit State
    const [isEditing, setIsEditing] = useState(false);

    // Backup State for Cancel
    const [originalValues, setOriginalValues] = useState<{
        safetyStock: number;
        replenishmentCycle: number;
        bufferDays: number;
        auto: boolean;
        autoTime: string;
    } | null>(null);

    const [showSSHint, setShowSSHint] = useState(false);
    const [showRestockHint, setShowRestockHint] = useState(false);

    const handleStartEdit = () => {
        setOriginalValues({
            safetyStock: editSafetyStock,
            replenishmentCycle: editReplenishmentCycle,
            bufferDays: editBufferDays,
            auto: autoReplenishment,
            autoTime: autoReplenishmentTime,
        });
        setIsEditing(true);
    };

    const handleSave = () => {
        setIsEditing(false);
        setOriginalValues(null);
        onSave();
    };

    const handleCancel = () => {
        if (originalValues) {
            setEditSafetyStock(originalValues.safetyStock);
            setEditReplenishmentCycle(originalValues.replenishmentCycle);
            setEditBufferDays(originalValues.bufferDays);
            setAutoReplenishment(originalValues.auto);
            setAutoReplenishmentTime(originalValues.autoTime);
        }
        setIsEditing(false);
        setOriginalValues(null);
    };

    // --- 算法核心：日级精确滚动及补货量计算 ---
    const calculateDynamicKPIs = () => {
        if (!data) return { ss: 0, rop: 0, daily: 0, futureSum: 0, leadTimeSum: 0, dateWindow: '', ropWindow: '', leadTimeDays: 0, restockQty: 0, restockCalc: '', today: new Date(), ropEndDate: new Date(), replenishmentBaseSum: 0, leadTimeDateWindow: '' };

        const getDailyForecastForDate = (date: Date) => {
            const y = date.getFullYear();
            const m = date.getMonth();
            const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;

            const monthTotal = (
                strategy?.forecast_overrides?.[monthStr] ||
                strategy?.calculated_forecasts?.[monthStr] ||
                data.charts.find(c => c.month === monthStr && c.type === 'future')?.forecastQty ||
                0
            );

            const daysInThatMonth = new Date(y, m + 1, 0).getDate();
            return monthTotal / daysInThatMonth;
        };

        const today = new Date();
        const selectedTierIndex = supplier?.priceTiers?.findIndex(t => t.isSelected) ?? -1;
        const leadTimeForCalc = selectedTierIndex !== -1 ? supplier!.priceTiers![selectedTierIndex].leadTime : currentLeadTime;

        // 1. 安全库存窗口 (SS Window)
        const ssMonths = editSafetyStock;
        const ssEndDate = new Date(today.getFullYear(), today.getMonth() + ssMonths, today.getDate());
        let preciseFutureSum = 0;
        let iterDate = new Date(today);
        while (iterDate < ssEndDate) {
            preciseFutureSum += getDailyForecastForDate(iterDate);
            iterDate.setDate(iterDate.getDate() + 1);
        }

        // 2. 补货基准窗口 (Replenishment Window)
        const replenishmentMonths = editReplenishmentCycle;
        const replenishmentEndDate = new Date(today.getFullYear(), today.getMonth() + replenishmentMonths, today.getDate());
        let replenishmentBaseSum = 0;
        let repIterDate = new Date(today);
        while (repIterDate < replenishmentEndDate) {
            replenishmentBaseSum += getDailyForecastForDate(repIterDate);
            repIterDate.setDate(repIterDate.getDate() + 1);
        }

        // 3. 交期消耗窗口 (LeadTime Window)
        let leadTimeDemandSum = 0;
        let ltIterDate = new Date(ssEndDate);
        const ropEndDate = new Date(ssEndDate);
        ropEndDate.setDate(ropEndDate.getDate() + leadTimeForCalc);
        while (ltIterDate < ropEndDate) {
            leadTimeDemandSum += getDailyForecastForDate(ltIterDate);
            ltIterDate.setDate(ltIterDate.getDate() + 1);
        }

        const ss = Math.round(preciseFutureSum);
        const threshold = Math.round(preciseFutureSum + leadTimeDemandSum);
        const targetLevel = Math.round(preciseFutureSum + leadTimeDemandSum + replenishmentBaseSum);
        const currentTotal = (data.kpi.inStock || 0) + (data.kpi.inTransit || 0);
        let restockQty = 0;
        let restockCalc = "";

        if (currentTotal < threshold) {
            const moq = supplier?.minOrderQty || 1;
            const unit = supplier?.orderUnitQty || 1;
            const gap = targetLevel - currentTotal;
            restockQty = Math.max(gap, moq);
            if (unit > 1) {
                restockQty = Math.ceil(restockQty / unit) * unit;
            }
            restockCalc = `目标水位: ${targetLevel}\n有效库存: ${currentTotal}\n计算缺口: ${gap}\n`;
            if (gap < moq) restockCalc += `修正 (MOQ): ${moq}\n`;
            if (unit > 1) restockCalc += `单位对齐: ${unit} PCS`;
        } else {
            restockQty = 0;
            restockCalc = `供应充足 (${currentTotal}) >= 触发线 (${threshold})`;
        }

        return {
            ss,
            rop: threshold,
            futureSum: ss,
            replenishmentBaseSum,
            leadTimeSum: Math.round(leadTimeDemandSum),
            dateWindow: `${today.toISOString().split('T')[0]} 至 ${new Date(ssEndDate.getTime() - 86400000).toISOString().split('T')[0]}`,
            leadTimeDateWindow: `${ssEndDate.toISOString().split('T')[0]} 至 ${new Date(ropEndDate.getTime() - 86400000).toISOString().split('T')[0]}`,
            restockQty,
            restockCalc
        };
    };

    const { ss: ssValue, rop: threshold, dateWindow, leadTimeDateWindow, restockQty, restockCalc } = calculateDynamicKPIs();
    const unitString = data?.basic.unit || 'PCS';
    const selectedTierIndex = supplier?.priceTiers?.findIndex(t => t.isSelected) ?? -1;

    const Tooltip = ({ title, formula, calc }: { title: string, formula: string, calc: string }) => (
        <div className="absolute bottom-full right-0 mb-2 w-[240px] bg-slate-800 text-white p-2.5 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ring-1 ring-white/10 pointer-events-none">
            <div className="text-[10px] font-black mb-1.5 border-b border-white/10 pb-1 text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Calculator size={12} />
                {title}
            </div>
            <div className="space-y-1.5 text-[9px]">
                <div className="text-slate-400 leading-tight">计算公式: <code className="text-emerald-400 font-mono ml-1">{formula}</code></div>
                <div className="bg-slate-900/50 p-1.5 rounded border border-white/5 font-mono text-slate-200 whitespace-pre-wrap">{calc}</div>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-slate-100 relative z-[40]">
            {/* 1. Header Area - Restored Premium Style */}
            <div className="px-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm h-[84px]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <Package size={16} />
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 leading-none">
                        <span className="text-sm font-black text-slate-800">库存</span>
                        <span className="text-sm font-black text-slate-800">策略</span>
                    </div>
                </div>

                <div>
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <button onClick={handleCancel} className="px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700 font-bold bg-white border border-slate-200 rounded-md shadow-sm transition-all">取消</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1 bg-blue-600 text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-1">
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleStartEdit} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1">
                            <Settings size={12} />
                            修改
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Main Config Panel - Restored Layout */}
            <div className="px-4 pt-2 pb-2 space-y-4">
                {/* 2.1. 安全库存周期 (SS Slider) */}
                <div className="space-y-1 group relative">
                    <div className="flex justify-between items-center px-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <ShieldCheck size={12} className="text-blue-500" />
                            <span>最小销售周期</span>
                        </div>
                        <div className="text-xs font-black text-slate-700">{editSafetyStock} <span className="text-[10px] text-slate-400">个月</span></div>
                    </div>
                    <div className="relative pt-0.5 px-0.5">
                        <input
                            type="range" min="1" max="12" step="1"
                            value={editSafetyStock}
                            onChange={(e) => setEditSafetyStock(parseInt(e.target.value))}
                            disabled={!isEditing}
                            className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* 2.2. 安全库存卡片 */}
                <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 flex flex-col gap-0.5 group relative cursor-help">
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-2">
                            <div className="p-0.5 bg-white rounded shadow-sm text-blue-600">
                                <Package size={10} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">安全库存</span>
                        </div>
                        <div
                            className="relative"
                            onMouseEnter={() => setShowSSHint(true)}
                            onMouseLeave={() => setShowSSHint(false)}
                        >
                            <div className="p-1 hover:bg-blue-100 rounded-full transition-colors cursor-help">
                                <Info size={12} className="text-blue-500" />
                            </div>
                            {showSSHint && (
                                <div className="absolute bottom-full right-0 mb-4 w-[220px] bg-[#0f172a] border border-white/20 text-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[200] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                                        <Clock size={14} className="text-blue-400" />
                                        <span className="text-[11px] font-black text-blue-300 uppercase tracking-widest">预测采样周期</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-medium text-slate-400">基于设置的 {editSafetyStock} 个月滚动窗口：</p>
                                        <div className="text-[11px] font-mono font-bold text-white bg-white/10 px-2 py-1.5 rounded-lg border border-white/5 shadow-inner">
                                            {dateWindow}
                                        </div>
                                    </div>
                                    <div className="absolute top-[calc(100%-8px)] right-3 w-4 h-4 bg-[#0f172a] rotate-45 border-r border-b border-white/20" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-sm font-mono font-black text-blue-700 pl-0.5">
                        {ssValue.toLocaleString()} <span className="text-[9px] font-bold opacity-70">{unitString}</span>
                    </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2.3. 交期与阶梯选择 */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">补货设置</label>
                    <div className="relative">
                        <select
                            disabled={!isEditing}
                            value={selectedTierIndex}
                            onChange={(e) => isEditing && onSelectTier?.(parseInt(e.target.value))}
                            className="w-full bg-slate-100/80 border border-slate-200/50 rounded-md py-1 px-2 text-[10px] font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer disabled:opacity-60"
                        >
                            {supplier?.priceTiers?.map((tier, idx) => (
                                <option key={idx} value={idx}>
                                    起订 ≥{tier.minQty} | ¥{tier.price} | {tier.leadTime}天
                                </option>
                            ))}
                            {(!supplier?.priceTiers || supplier.priceTiers.length === 0) && (
                                <option value="-1">默认模式 | {currentLeadTime}天</option>
                            )}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={12} className="rotate-90" />
                        </div>
                    </div>
                </div>

                {/* 2.4. ROP 详情卡片 */}
                <div className="bg-orange-50/40 p-2 rounded-lg border border-orange-100/50 flex flex-col gap-0.5 group relative cursor-help shadow-sm">
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-2">
                            <div className="p-0.5 bg-white rounded shadow-sm text-orange-600">
                                <Activity size={10} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ROP 补货点</span>
                        </div>
                        <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                            <Info size={10} className="text-orange-400" />
                        </div>
                    </div>
                    <div className="text-sm font-mono font-black text-orange-700 pl-0.5">
                        {threshold.toLocaleString()} <span className="text-[9px] font-bold opacity-70">{unitString}</span>
                    </div>
                    <Tooltip
                        title="ROP 补货公式"
                        formula="(最小销售周期 + 货期) 销售预期"
                        calc={`安全库存(覆盖最小周期): ${ssValue.toLocaleString()}\n货期预测周期: ${leadTimeDateWindow}\n计算结果: ${threshold.toLocaleString()}`}
                    />
                </div>

                {/* 2.5. 补货周期滑块 (Replenishment Cycle) */}
                <div className="space-y-3 bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100/50">
                    <div className="flex justify-between items-center px-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                            <RefreshCw size={12} className={isEditing ? 'animate-spin-slow' : ''} />
                            <span>补货销售周期</span>
                        </div>
                        <div className="text-xs font-black text-indigo-700">{editReplenishmentCycle} <span className="text-[10px] text-indigo-400">个月</span></div>
                    </div>
                    <div className="relative pt-0.5 px-0.5">
                        <input
                            type="range" min="1" max="12" step="1"
                            value={editReplenishmentCycle}
                            onChange={(e) => isEditing && setEditReplenishmentCycle(parseInt(e.target.value))}
                            disabled={!isEditing}
                            className={`w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50`}
                        />
                    </div>
                </div>

                {/* 2.6. 补货触发方式选择 */}
                <div className="space-y-1 relative">
                    <div className="flex items-center justify-between ml-0.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">补货触发方式</label>
                        {!isStockingEnabled && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500 animate-pulse">
                                <AlertTriangle size={10} />
                                未开启备货
                            </div>
                        )}
                    </div>
                    <div className={`grid grid-cols-2 gap-1 bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/40`}>
                        <button
                            onClick={() => isEditing && setAutoReplenishment(false)}
                            className={`flex items-center justify-center gap-1 py-1 rounded transition-all duration-200 text-[10px] font-bold ${!autoReplenishment ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/40'}`}
                        >
                            <HandIcon size={10} /> 手动
                        </button>
                        <button
                            onClick={() => isEditing && isStockingEnabled && setAutoReplenishment(true)}
                            disabled={!isEditing || !isStockingEnabled}
                            className={`flex items-center justify-center gap-1 py-1 rounded transition-all duration-200 text-[10px] font-bold ${autoReplenishment ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/40'} disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={!isStockingEnabled ? "必须开启备货才能启用自动补货" : ""}
                        >
                            <Zap size={10} /> 自动
                        </button>
                    </div>
                </div>

                {/* 2.7. 补货摘要与执行按钮 */}
                <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg border border-slate-100 p-2 flex items-center justify-between group relative cursor-help">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-white rounded shadow-xs text-indigo-500">
                                <ArrowDownToLine size={12} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">建议补货量</span>
                                <span className={`text-xs font-black mt-0.5 ${restockQty > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {restockQty.toLocaleString()} <span className="text-[10px] font-bold opacity-70">{unitString}</span>
                                </span>
                            </div>
                        </div>
                        <div
                            onMouseEnter={() => setShowRestockHint(true)}
                            onMouseLeave={() => setShowRestockHint(false)}
                            className="p-1 hover:bg-indigo-50 rounded-full transition-colors"
                        >
                            <Info size={12} className="text-indigo-400" />
                        </div>
                        {showRestockHint && (
                            <div className="absolute bottom-full right-0 mb-3 w-[240px] bg-[#1e293b] border border-white/10 text-white p-3.5 rounded-xl shadow-2xl z-[200] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 text-[11px] whitespace-pre-wrap leading-relaxed">
                                {restockCalc}
                            </div>
                        )}
                    </div>

                    {autoReplenishment ? (
                        <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 p-1.5 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-emerald-600" />
                                <span className="text-[10px] font-bold text-emerald-900">运行时间</span>
                            </div>
                            <input
                                type="time" value={autoReplenishmentTime}
                                onChange={(e) => setAutoReplenishmentTime(e.target.value)}
                                disabled={!isEditing}
                                className="bg-white border-none px-1.5 py-0 rounded text-[10px] font-bold text-emerald-700 shadow-sm focus:ring-0 w-[80px] h-5 disabled:opacity-50"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => onCreatePlan(restockQty)}
                            disabled={isCreatingPO || restockQty <= 0}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg shadow-sm shadow-indigo-100 flex items-center justify-center gap-1.5 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isCreatingPO ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                            <span className="text-[10px] font-black tracking-tight uppercase">立即生成采购计划</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryStrategy;
