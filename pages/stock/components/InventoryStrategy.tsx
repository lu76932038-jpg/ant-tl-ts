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
import { calculateInventoryKPIs } from '../logic/inventoryRules';

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
    dailyActuals?: { date: string, qty: number }[];
    dayOfWeekFactors?: number[];
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
    isStockingEnabled,
    dailyActuals = [],
    dayOfWeekFactors = []
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

    // Lookup Map for Daily Actuals
    const dailyActualsMap = React.useMemo(() => {
        const map = new Map<string, number>();
        dailyActuals.forEach(d => map.set(d.date, d.qty));
        return map;
    }, [dailyActuals]);

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

    const [showDebugModal, setShowDebugModal] = useState<false | 'SS' | 'ROP'>(false);
    const [debugDetails, setDebugDetails] = useState<any[]>([]);

    // --- 算法核心：日级精确滚动及补货量计算 (Refactored to logic/inventoryRules) ---
    const calculationResult = React.useMemo(() => {
        const selectedTierIndex = supplier?.priceTiers?.findIndex(t => t.isSelected) ?? -1;
        const leadTimeForCalc = selectedTierIndex !== -1 ? supplier!.priceTiers![selectedTierIndex].leadTime : currentLeadTime;

        return calculateInventoryKPIs(data, strategy, supplier, {
            safetyStockMonths: editSafetyStock,
            replenishmentCycleMonths: editReplenishmentCycle,
            leadTimeDays: leadTimeForCalc,
            dayOfWeekFactors,
            dailyActualsMap
        });
    }, [data, strategy, supplier, editSafetyStock, editReplenishmentCycle, currentLeadTime, dayOfWeekFactors, dailyActualsMap]);

    const {
        safetyStock: ssValue,
        rop: threshold,
        restockQty,
        restockCalc,
        formulaExplanation: adviceText,
        details,
        ssDateWindow: dateWindow,
        leadTimeDateWindow,
        leadTimeDemand,
        cycleDemand,
        replenishmentDateWindow,
        ropDateWindow
    } = calculationResult;


    const unitString = data?.basic.unit || 'PCS';
    const selectedTierIndex = supplier?.priceTiers?.findIndex(t => t.isSelected) ?? -1;

    // Update details state when calculation runs (careful with infinite loops, better use a ref or effect if needed, but here we can just pass it directly if we render it on demand)
    // Actually, calculateDynamicKPIs runs on every render. We can just use 'details' directly when opening modal.

    // Debug Modal
    const renderDebugModal = () => {
        if (!showDebugModal) return null;
        return (
            <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDebugModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg">
                            {showDebugModal === 'SS' ? '安全库存 (SS)' : '再订货点 (ROP)'} 计算明细
                        </h3>
                        <button onClick={() => setShowDebugModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        <div className="text-xs text-gray-500 mb-4 flex items-center gap-4">
                            <div>采样周期: <span className="font-black text-slate-800">{showDebugModal === 'SS' ? dateWindow : ropDateWindow}</span></div>
                            <div className="h-4 w-px bg-slate-200" />
                            <div>当前计算值: <span className="font-bold text-blue-600 text-lg">
                                {showDebugModal === 'SS' ? ssValue : threshold}
                            </span></div>
                        </div>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 font-bold text-gray-600 sticky top-0">
                                <tr>
                                    <th className="p-2 border-b">日期</th>
                                    <th className="p-2 border-b">分类标签</th>
                                    <th className="p-2 border-b">数据源</th>
                                    <th className="p-2 border-b text-right">消耗量</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.kpi?.backlog_qty && data.kpi.backlog_qty > 0 && showDebugModal !== 'SS' ? (
                                    <tr className="border-b border-rose-100 bg-rose-50">
                                        <td className="p-2 text-rose-600 font-black">积压欠单项</td>
                                        <td className="p-2">-</td>
                                        <td className="p-2">-</td>
                                        <td className="p-2 text-rose-600 text-right font-black">+{data.kpi.backlog_qty.toLocaleString()}</td>
                                    </tr>
                                ) : null}
                                {showDebugModal !== 'SS' && (
                                    <tr className="border-b border-slate-100 bg-indigo-50/50">
                                        <td className="p-2 text-slate-700 font-black">最终建议补货量</td>
                                        <td className="p-2">-</td>
                                        <td className="p-2">-</td>
                                        <td className="p-2 text-indigo-700 text-right font-black">{restockQty.toLocaleString()}</td>
                                    </tr>
                                )}
                                {details.filter(d => {
                                    if (showDebugModal === 'SS') return d.type.includes('最小销售周期');
                                    return d.type.includes('补货点');
                                }).map((d, i) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono">{d.date}</td>
                                        <td className="p-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${d.type.includes('周期') ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                                }`}>
                                                {d.type}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-1.5 py-0.5 rounded ${d.source === 'Actual' ? 'bg-green-100 text-green-700' : d.source === 'Mix' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {d.source}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold">{d.value.toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700"
                            onClick={() => {
                                const csvHeaders = 'Date,Type,Value,Source,MonthTotal,Weight,TotalWeights,DailyForecast,DailyActual';
                                const csvRows = details
                                    .filter(d => {
                                        if (showDebugModal === 'SS') return d.type === 'Safety Stock';
                                        return d.type === 'Lead Time' || d.type === 'Replenishment Cycle';
                                    })
                                    .map(d => `${d.date},${d.type},${d.value},${d.source},${d.monthTotal},${d.weight},${d.totalWeights},${d.dailyForecast},${d.dailyActual}`);
                                const csv = [csvHeaders, ...csvRows].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${showDebugModal}_debug_${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                            }}
                        >
                            导出详细 CSV
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <Clock size={12} />
                            <span>最小销售周期 (影响安全库存)</span>
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
                {/* 2.3. 安全库存配置 (Safety Stock) */}
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
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDebugModal('SS');
                            }}
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
                    <div className="text-2xl font-bold text-emerald-600">
                        {ssValue.toLocaleString()} <span className="text-sm font-normal text-gray-400 font-medium">{data?.basic.unit || 'PCS'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">安全库存指标</div>
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

                {/* 2.4. ROP 详情卡片 (建议补货点) */}
                <div className="bg-orange-50/40 p-2 rounded-lg border border-orange-100/50 flex flex-col gap-0.5 group relative cursor-help shadow-sm">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <div className="p-0.5 bg-white rounded shadow-sm text-orange-600">
                                <Activity size={10} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">建议补货点</span>
                        </div>
                        <div
                            className="opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-orange-100 rounded-full p-0.5"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDebugModal('ROP');
                            }}
                        >
                            <Info size={10} className="text-orange-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between group">
                        <div className="text-xl font-black text-orange-600 drop-shadow-sm group-hover:scale-105 transition-transform origin-left">
                            {threshold.toLocaleString()} <span className="text-[9px] font-bold opacity-70">{unitString}</span>
                        </div>
                        <Tooltip
                            title="补货点计算详情"
                            formula="最小周期需求 + 货期需求"
                            calc={`补货采样总区间: ${ropDateWindow}\n----------------\n1. 最小周期需求: ${ssValue.toLocaleString()}\n(覆盖窗口: ${dateWindow})\n\n2. 货期需求: ${leadTimeDemand.toLocaleString()}\n(覆盖窗口: ${leadTimeDateWindow})\n\n最终补货点 = ${ssValue.toLocaleString()} + ${leadTimeDemand.toLocaleString()} = ${threshold.toLocaleString()}\n\n说明: 当“当前拥有”低于此触发线（补货点 + 欠单）时，系统建议补货。`}
                        />
                    </div>
                </div>

                {/* 2.5. 补货周期滑块 (Replenishment Cycle) - 移动到 ROP 下方 */}
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

                <div className="h-px bg-slate-100 w-full" />

                {/* 2.6. 建议补货量摘要 - 提升位置到触发方式上方 */}
                <div className="bg-slate-50 rounded-lg border border-slate-100 p-2 flex flex-col gap-1 group relative cursor-help">
                    <div className="flex items-center justify-between">
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
                    </div>

                    {showRestockHint && (
                        <div className="absolute bottom-full right-0 mb-3 w-[240px] bg-[#1e293b] border border-white/10 text-white p-3.5 rounded-xl shadow-2xl z-[200] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 text-[11px] whitespace-pre-wrap leading-relaxed">
                            {restockCalc}
                        </div>
                    )}
                </div>

                {/* 2.7. 补货触发方式选择 */}
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

                {/* 2.8. 执行操作按钮 / 运行时间 */}
                <div className="pt-1">
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
                {renderDebugModal()}
            </div>
        </div>
    );
};

export default InventoryStrategy;
