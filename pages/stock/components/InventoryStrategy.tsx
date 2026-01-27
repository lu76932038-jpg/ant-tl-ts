import React, { useState, useEffect } from 'react';
import {
    Settings,
    Loader2,
    RefreshCw,
    Truck as TruckIcon,
    Package,
    ShoppingCart,
    ShieldCheck,
    Zap,
    Clock,
    AlertTriangle,
    Info,
    Calculator,
    Activity,
    ChevronRight,
    HandIcon,
    Send
} from 'lucide-react';
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
    supplier?: SupplierInfo | null;
    onSelectTier?: (tierIndex: number) => void; // 新增：选中阶梯回调

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
    onSelectTier,
    autoReplenishment, setAutoReplenishment,
    autoReplenishmentTime, setAutoReplenishmentTime
}) => {
    // Local Edit State
    const [isEditing, setIsEditing] = useState(false);

    // Backup State for Cancel
    const [originalValues, setOriginalValues] = useState<{
        safetyStock: number;
        auto: boolean;
        autoTime: string;
    } | null>(null);

    const handleStartEdit = () => {
        setOriginalValues({
            safetyStock: editSafetyStock,
            auto: autoReplenishment,
            autoTime: autoReplenishmentTime
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
            setAutoReplenishment(originalValues.auto);
            setAutoReplenishmentTime(originalValues.autoTime);
        }
        setIsEditing(false);
        setOriginalValues(null);
    };

    // Calculation Logic
    const ssValue = data ? Math.round(data.kpi.sales30Days * editSafetyStock) : 0;
    const daily = data ? Math.round(data.kpi.sales30Days / 30) : 0;

    // 获取当前选中的阶梯或默认阶梯
    const selectedTierIndex = supplier?.priceTiers?.findIndex(t => t.isSelected) ?? -1;
    const leadTimeForCalc = selectedTierIndex !== -1 ? supplier!.priceTiers![selectedTierIndex].leadTime : currentLeadTime;

    const ropValue = data ? Math.round(ssValue + (daily * leadTimeForCalc) - data.kpi.inTransit) : 0;

    const Tooltip = ({ title, formula, calc }: { title: string, formula: string, calc: string }) => (
        <div className="absolute bottom-full right-0 mb-2 w-[240px] bg-slate-800 text-white p-2.5 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ring-1 ring-white/10 pointer-events-none">
            <div className="text-[10px] font-black mb-1.5 border-b border-white/10 pb-1 text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Calculator size={12} />
                {title}
            </div>
            <div className="space-y-1.5 text-[9px]">
                <div className="text-slate-400 leading-tight">计算公式: <code className="text-emerald-400 font-mono ml-1">{formula}</code></div>
                <div className="bg-slate-900/50 p-1.5 rounded border border-white/5 font-mono text-slate-200">{calc}</div>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden">
            {/* 1. Header Area */}
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

            {/* 2. Main Config Panel */}
            <div className={`px-4 pt-2 pb-2 space-y-2.5 transition-opacity duration-200 ${isEditing ? 'opacity-100' : 'opacity-80 pointer-events-none grayscale-[0.3]'}`}>

                {/* 2.1. 销售周期 (Safety Stock Period) */}
                <div className="space-y-1 group relative">
                    <div className="flex justify-between items-center px-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <ShieldCheck size={12} className="text-blue-500" />
                            <span>销售周期</span>
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

                {/* 2.2. 安全库存 (Safety Stock Quantity) */}
                <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 flex flex-col gap-0.5 group relative cursor-help">
                    <div className="flex items-center gap-2">
                        <div className="p-0.5 bg-white rounded shadow-sm text-blue-600">
                            <Package size={10} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">安全库存</span>
                    </div>
                    <div className="text-sm font-mono font-black text-blue-700 pl-0.5">
                        {ssValue.toLocaleString()} <span className="text-[9px] font-bold opacity-70">PCS</span>
                    </div>
                    <Tooltip
                        title="安全库存计算"
                        formula="近30天销量 × 周期"
                        calc={`${Math.round(data?.kpi.sales30Days || 0).toLocaleString()} × ${editSafetyStock} = ${ssValue.toLocaleString()}`}
                    />
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2.3. 补货设置 (Replenishment Mode / Price Tier) */}
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

                {/* 2.4. 订货点 (ROP) */}
                <div className="p-2 bg-orange-50/30 rounded-lg border border-orange-100/50 flex flex-col gap-0.5 group relative cursor-help">
                    <div className="flex items-center gap-2">
                        <div className="p-0.5 bg-white rounded shadow-sm text-orange-600">
                            <Activity size={10} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">订货点（ROP）</span>
                    </div>
                    <div className="text-sm font-mono font-black text-orange-700 pl-0.5">
                        {ropValue.toLocaleString()} <span className="text-[9px] font-bold opacity-70">PCS</span>
                    </div>
                    <Tooltip
                        title="ROP 计算逻辑"
                        formula="(安全库存 + 提前期消耗) - 在途库存"
                        calc={`(${ssValue.toLocaleString()} + ${daily}×${leadTimeForCalc}) - ${data?.kpi.inTransit || 0} = ${ropValue.toLocaleString()}`}
                    />
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2.5. 补货触发方式 (Manual / Auto) */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">补货触发方式</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/40">
                        <button
                            onClick={() => isEditing && setAutoReplenishment(false)}
                            className={`flex items-center justify-center gap-1 py-1 rounded transition-all duration-200 text-[10px] font-bold ${!autoReplenishment ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/40'}`}
                        >
                            <HandIcon size={10} />
                            手动
                        </button>
                        <button
                            onClick={() => isEditing && setAutoReplenishment(true)}
                            className={`flex items-center justify-center gap-1 py-1 rounded transition-all duration-200 text-[10px] font-bold ${autoReplenishment ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/40'}`}
                        >
                            <Zap size={10} />
                            自动
                        </button>
                    </div>
                </div>

                {/* 2.6. 动态展示: 时间选择 or 补货按钮 */}
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
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
                                className="bg-white border-none px-1.5 py-0 rounded text-[10px] font-bold text-emerald-700 shadow-sm focus:ring-0 w-[80px] h-5"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={onCreatePO}
                            disabled={isCreatingPO}
                            className="w-full py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm shadow-indigo-100 flex items-center justify-center gap-1.5 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isCreatingPO ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            <span className="text-[10px] font-black tracking-tight uppercase">立即生成补货单</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryStrategy;
