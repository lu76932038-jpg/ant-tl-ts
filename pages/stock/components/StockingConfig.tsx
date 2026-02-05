import React, { useState, useEffect } from 'react';
import {
    Archive,
    Settings,
    ToggleLeft,
    ToggleRight,
    Sparkles,
    ShieldCheck,
    AlertTriangle,
    Loader2,
    RefreshCw,
    Settings2,
    Info,
    ChevronRight,
    Telescope,
    HandIcon,
    Zap
} from 'lucide-react';
import { ProductDetailData } from '../types';

interface StockingConfigProps {
    data: ProductDetailData | null;
    isSaving: boolean;
    onSave: () => void;

    // Config Params
    stockingPeriod: number;
    setStockingPeriod: (val: number) => void;
    minOutboundFreq: number;
    setMinOutboundFreq: (val: number) => void;
    minCustomerCount: number;
    setMinCustomerCount: (val: number) => void;

    isStockingEnabled: boolean;
    setIsStockingEnabled: (val: boolean) => void;

    // Stats from Backend
    actualOutboundCount: number;
    actualDistinctCustomers: number;
}

const StockingConfig: React.FC<StockingConfigProps> = ({
    data,
    isSaving,
    onSave,
    stockingPeriod, setStockingPeriod,
    minOutboundFreq, setMinOutboundFreq,
    minCustomerCount, setMinCustomerCount,
    isStockingEnabled, setIsStockingEnabled,
    actualOutboundCount, actualDistinctCustomers
}) => {
    // Local Edit State
    const [isEditing, setIsEditing] = useState(false);

    // Backup State for Cancel
    const [originalValues, setOriginalValues] = useState<{
        period: number;
        freq: number;
        cust: number;
        enabled: boolean;
    } | null>(null);

    const handleStartEdit = () => {
        setOriginalValues({
            period: stockingPeriod,
            freq: minOutboundFreq,
            cust: minCustomerCount,
            enabled: isStockingEnabled
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
            setStockingPeriod(originalValues.period);
            setMinOutboundFreq(originalValues.freq);
            setMinCustomerCount(originalValues.cust);
            setIsStockingEnabled(originalValues.enabled);
        }
        setIsEditing(false);
        setOriginalValues(null);
    };

    // Calculate Recommendation
    // Use props from backend
    const outboundCount = actualOutboundCount;
    const customerCount = actualDistinctCustomers;
    const isRecommended = outboundCount >= minOutboundFreq && customerCount >= minCustomerCount;



    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden relative z-[45]">

            {/* Header Area - Aligned with ForecastConfig (84px) */}
            <div className="px-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm h-[84px]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <Archive size={16} />
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 leading-none">
                        <span className="text-sm font-black text-slate-800">备库</span>
                        <span className="text-sm font-black text-slate-800">策略</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div>
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700 font-bold bg-white border border-slate-200 rounded-md shadow-sm transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-1"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartEdit}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1"
                        >
                            <Settings size={12} />
                            修改
                        </button>
                    )}
                </div>
            </div>

            <div className={`transition-all duration-200 ${isEditing ? 'opacity-100' : 'opacity-80 grayscale-[0.3]'}`}>

                {/* 1. Recommendation Insight Section */}
                <div className="px-4 pt-3 pb-2">
                    <div className={`p-3 rounded-xl border relative overflow-hidden group/card ${isRecommended ? 'bg-emerald-50/40 border-emerald-100/60' : 'bg-orange-50/40 border-orange-100/60'}`}>
                        <div className="flex items-start gap-2.5 relative z-10">
                            <div className={`p-1.5 rounded-lg shadow-sm ${isRecommended ? 'bg-white text-emerald-600' : 'bg-white text-orange-600'}`}>
                                {isRecommended ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-[11px] font-black uppercase tracking-tight mb-1 ${isRecommended ? 'text-emerald-800' : 'text-orange-800'}`}>
                                    {isRecommended ? '备货建议：建议' : '备货建议：不建议'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium leading-normal">
                                    基于过去 <span className="font-bold text-slate-700">{stockingPeriod}</span> 个月数据:
                                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                        <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-mono font-bold ${outboundCount >= minOutboundFreq ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                            项次: {outboundCount} / {minOutboundFreq}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-mono font-bold ${customerCount >= minCustomerCount ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                            客户: {customerCount} / {minCustomerCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className={`absolute -right-2 -bottom-2 opacity-[0.05] group-hover/card:scale-110 transition-transform duration-500 ${isRecommended ? 'text-emerald-900' : 'text-orange-900'}`}>
                            <Telescope size={64} />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2. Parameters & Controls */}
                <div className="px-4 py-3 space-y-4">

                    {/* Master Switch */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">是否备货</label>
                            <div className={`flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                                <button
                                    onClick={() => isEditing && setIsStockingEnabled(true)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isStockingEnabled ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    是
                                </button>
                                <button
                                    onClick={() => isEditing && setIsStockingEnabled(false)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isStockingEnabled ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    否
                                </button>
                            </div>
                        </div>

                        {/* Consistency Warning */}
                        {isRecommended !== isStockingEnabled && (
                            <div className="flex items-start gap-1.5 bg-amber-50 rounded-md p-1.5 border border-amber-100/60">
                                <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-[10px] text-amber-600 font-medium leading-tight">
                                    当前设置与系统建议不一致（系统建议：{isRecommended ? '备货' : '不备货'}）
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Thresholds Input Grid */}
                    <div className="space-y-3 pt-1">
                        {/* 2.1 考核周期 (Period) */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center px-0.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">数据考核周期</label>
                                <div className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 select-none">
                                    {stockingPeriod} 月
                                </div>
                            </div>
                            <div className="relative pt-0.5">
                                <input
                                    type="range" min="1" max="24" step="1"
                                    value={stockingPeriod}
                                    onChange={e => setStockingPeriod(Number(e.target.value))}
                                    disabled={!isEditing}
                                    className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                                />
                                <div className="flex justify-between text-[8px] text-slate-400 mt-1.5 font-bold px-1 uppercase leading-none">
                                    <span>近1月</span>
                                    <span>近24月</span>
                                </div>
                            </div>
                        </div>

                        {/* 2.2 Freq & Cust Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-0.5">最小出库项次</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-[10px] font-mono font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
                                        value={minOutboundFreq}
                                        onChange={e => setMinOutboundFreq(Number(e.target.value))}
                                        disabled={!isEditing}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">次</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-0.5">最小客户数量</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-[10px] font-mono font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
                                        value={minCustomerCount}
                                        onChange={e => setMinCustomerCount(Number(e.target.value))}
                                        disabled={!isEditing}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">人</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Tips - Aligned with ForecastConfig style */}
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                    <div className="flex gap-2">
                        <div className="p-0.5 text-slate-400 mt-0.5">
                            <Info size={10} />
                        </div>
                        <div className="text-[9px] text-slate-400 leading-relaxed font-medium">
                            <p>备货核心准则：剔除偶发性订单，仅对具备持续消费能力的活跃SKU实施库存储备。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockingConfig;
