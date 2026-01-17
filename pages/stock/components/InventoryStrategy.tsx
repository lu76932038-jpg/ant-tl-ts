import React from 'react';
import { Settings, Loader2, RefreshCw, Truck as TruckIcon, Package, BarChart2, Activity, AlertTriangle, ShoppingCart } from 'lucide-react';
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
}

const InventoryStrategy: React.FC<InventoryStrategyProps> = ({
    data, strategy, isSaving, onSave,
    editSafetyStock, setEditSafetyStock,
    replenishmentMode, setReplenishmentMode,
    currentLeadTime,
    isCreatingPO, onCreatePO
}) => {
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
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    更新配置
                </button>
            </div>

            <div className="p-6 space-y-8">
                {/* Group 1: Core Replenishment Params */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">补货参数设置</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Group 2: Forecast Model */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">预测策略模型</h4>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-full shadow-sm text-purple-600">
                            <BarChart2 size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-purple-900 mb-0.5">当前使用: 混合加权预测 (Hybrid)</div>
                            <div className="text-[10px] text-purple-600">结合历史同比 (YoY) 与近期环比 (MoM) 趋势自动计算</div>
                        </div>
                        <div className="text-[10px] font-mono bg-white px-2 py-1 rounded text-gray-500 border border-purple-100">
                            Auto Mode
                        </div>
                    </div>
                </section>

                {/* Group 3: Calculation & Action */}
                <section className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                        <Activity size={100} />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Metrics */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="text-xs font-medium text-gray-500">目标安全库存</span>
                                <span className="font-bold text-gray-900">{data ? Math.round(data.kpi.sales30Days * editSafetyStock).toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="text-xs font-medium text-gray-500">建议补货点 (ROP)</span>
                                <span className="font-bold text-orange-600">{data ? Math.round((data.kpi.sales30Days * editSafetyStock) + ((data.kpi.sales30Days / 30) * currentLeadTime) - data.kpi.inTransit).toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-500">经济批量 (EOQ)</span>
                                <span className="font-bold text-blue-600">{strategy?.eoq ? strategy.eoq.toLocaleString() : '-'} <span className="text-[10px] text-gray-400 font-normal">件</span></span>
                            </div>
                        </div>

                        {/* Action Box */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center space-y-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">智能补货建议</div>
                            <div className="space-y-1">
                                {(() => {
                                    if (!data) return <span className="text-gray-900">-</span>;
                                    const dailySales = data.kpi.sales30Days / 30;
                                    const triggerPoint = (data.kpi.sales30Days * editSafetyStock) + (dailySales * currentLeadTime);
                                    const totalAvailable = data.kpi.inStock + data.kpi.inTransit;
                                    const daysLeft = (totalAvailable - triggerPoint) / dailySales;

                                    if (daysLeft <= 0) {
                                        return <div className="text-rose-600 font-extrabold text-lg flex items-center justify-center gap-1"><AlertTriangle size={16} /> 立即补货</div>;
                                    }
                                    const date = new Date();
                                    date.setDate(date.getDate() + Math.ceil(daysLeft));
                                    const dateString = date.toISOString().split('T')[0];

                                    return <div className={`text-lg font-bold ${daysLeft <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}>{dateString}</div>;
                                })()}
                                <div className="text-xs text-gray-400">建议日期</div>
                            </div>

                            <button
                                onClick={onCreatePO}
                                disabled={isCreatingPO}
                                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isCreatingPO ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        处理中...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={14} />
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
