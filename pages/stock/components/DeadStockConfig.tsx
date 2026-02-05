import React, { useState } from 'react';
import { Settings2, RefreshCw, Timer, Calendar, AlertTriangle, Loader2 } from 'lucide-react';

interface DeadStockConfigProps {
    deadStockDays: number;
    setDeadStockDays: (days: number) => void;
    lastOutboundDate?: string;
    isSaving: boolean;
    onSave: () => void;
    currentStock: number; // New Prop
}

const DeadStockConfig: React.FC<DeadStockConfigProps> = ({
    deadStockDays = 180,
    setDeadStockDays,
    lastOutboundDate,
    isSaving,
    onSave,
    currentStock
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempDays, setTempDays] = useState(deadStockDays);

    const handleStartEdit = () => {
        setTempDays(deadStockDays);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setTempDays(deadStockDays);
        setIsEditing(false);
    };

    const handleSave = () => {
        setDeadStockDays(tempDays);
        onSave();
        setIsEditing(false);
    };

    // Calculate status based on current config & stock
    const daysSinceOutbound = lastOutboundDate
        ? (new Date().getTime() - new Date(lastOutboundDate).getTime()) / (1000 * 3600 * 24)
        : 9999; // If never outbound, treat as very old

    // Logic: Dead Stock if Stock > 0 AND (No Move > Threshold)
    const isDeadStock = currentStock > 0 && daysSinceOutbound > deadStockDays;

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden group">

            {/* Header Area - Fixed Height 84px to match ForecastConfig */}
            <div className="px-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm h-[84px]">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isDeadStock ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                        {isDeadStock ? <AlertTriangle size={16} /> : <Timer size={16} />}
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 leading-none">
                        <span className="text-sm font-black text-slate-800">呆滞</span>
                        <span className="text-sm font-black text-slate-800">配置</span>
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
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-1"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartEdit}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1"
                        >
                            <Settings2 size={12} />
                            修改
                        </button>
                    )}
                </div>
            </div>

            <div className={`px-4 pt-3 pb-3 space-y-3 transition-opacity duration-200 ${isEditing ? 'opacity-100' : 'opacity-80'}`}>

                {/* 1. Threshold Config */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                            <Timer size={12} />
                            <span>呆滞阈值</span>
                        </span>
                        {!isEditing && <span className="text-slate-900">{deadStockDays} 天</span>}
                    </div>

                    {isEditing && (
                        <div className="flex items-center gap-2">
                            <div className="relative group/input flex items-center w-full">
                                <input
                                    type="number"
                                    min="30"
                                    max="720"
                                    step="30"
                                    value={tempDays}
                                    onChange={(e) => setTempDays(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all text-right pr-6"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 select-none">天</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Last Outbound Info */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <Calendar size={12} />
                        <span>最后出库</span>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-600">
                        {lastOutboundDate || '无记录'}
                    </span>
                </div>

                {/* 3. Status Indicator */}
                <div className={`mt-2 flex items-center justify-between py-2 px-3 rounded-lg border ${isDeadStock
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">呆滞状态</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`flex h-2 w-2 relative`}>
                            {isDeadStock && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isDeadStock ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        </span>
                        <span className="text-[10px] font-bold">
                            {isDeadStock ? '是 (YES)' : '否 (NO)'}
                        </span>
                    </div>
                </div>

                {/* Debug Info (Optional/Hidden or subtle) */}
                {/* <div className="text-[9px] text-slate-300 text-right">Stock: {currentStock}</div> */}

            </div>
        </div>
    );
};

export default DeadStockConfig;
