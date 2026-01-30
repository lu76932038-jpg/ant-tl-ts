import React, { useState } from 'react';
import { AlertTriangle, Settings, Loader2, RefreshCw, Calendar } from 'lucide-react';

interface DeadStockConfigProps {
    deadStockDays: number;
    setDeadStockDays: (days: number) => void;
    lastOutboundDate?: string;
    isSaving: boolean;
    onSave: () => void;
}

const DeadStockConfig: React.FC<DeadStockConfigProps> = ({
    deadStockDays = 180,
    setDeadStockDays,
    lastOutboundDate,
    isSaving,
    onSave
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

    // Calculate status based on current config (Demo Logic)
    // In reality, this status check might happen in the parent or backend
    const isDeadStock = lastOutboundDate
        ? (new Date().getTime() - new Date(lastOutboundDate).getTime()) / (1000 * 3600 * 24) > deadStockDays
        : false; // If never outbound, might be dead stock depending on creation date, but assume false for simplify

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100 relative group overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                    <AlertTriangle className={isDeadStock ? "text-red-500" : "text-gray-400"} size={20} />
                    呆滞唤醒配置
                </div>
                <div>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancel}
                                className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded transition"
                            >取消</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition flex items-center gap-1"
                            >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartEdit}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                            <Settings size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Config Body */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
                <span className="text-gray-600 font-medium">无动销判定 &gt;</span>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="30"
                            max="720" // 2 years
                            step="30"
                            value={tempDays}
                            onChange={(e) => setTempDays(Number(e.target.value))}
                            className="w-16 px-1 py-0.5 text-right font-bold text-gray-900 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-gray-500">天</span>
                    </div>
                ) : (
                    <span className="font-bold text-gray-900">{deadStockDays} 天</span>
                )}
            </div>

            {/* Info Footer */}
            <div className="mt-4 text-xs text-gray-400 flex justify-between items-center">
                <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    最后出库
                </span>
                <span className="font-mono">{lastOutboundDate || '无记录'}</span>
            </div>

            {/* Status Indicator */}
            {isDeadStock && !isEditing && (
                <div className="absolute top-0 right-0 p-2">
                    <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default DeadStockConfig;
