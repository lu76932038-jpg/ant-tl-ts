import React from 'react';
import { Archive, Settings, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

interface StockingConfigProps {
    enabled?: boolean;
    setEnabled: (val: boolean) => void;
    isSaving: boolean;
    recommendation?: string; // 比如 "建议持续备货 (销量稳定)"
}

const StockingConfig: React.FC<StockingConfigProps> = ({
    enabled = true,
    setEnabled,
    isSaving,
    recommendation = "该产品销量稳定，建议保持备货"
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100 relative group overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold text-lg">
                <Archive className="text-blue-600" size={20} />
                备库配置
            </div>

            <div className="space-y-4">
                {/* Switch Control */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                        <div className="text-sm font-bold text-gray-900">启用备货</div>
                        <div className="text-xs text-gray-400 mt-0.5">控制是否允许生成补货单</div>
                    </div>
                    <button
                        onClick={() => !isSaving && setEnabled(!enabled)}
                        className={`transition-colors duration-200 ${enabled ? 'text-blue-600' : 'text-gray-300'}`}
                        disabled={isSaving}
                    >
                        {enabled ? <ToggleRight size={32} className="drop-shadow-sm" /> : <ToggleLeft size={32} />}
                    </button>
                </div>

                {/* Recommendation AI Insight */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 mb-1">
                        <Sparkles size={12} className="text-purple-600" />
                        智能建议
                    </div>
                    <div className="text-xs text-indigo-700/80 leading-relaxed">
                        {recommendation}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockingConfig;
