import React, { useState } from 'react';
import { Package, RefreshCw, Truck, ShoppingCart, AlertTriangle, CheckCircle, History } from 'lucide-react';
import { ProductDetailData } from '../types';

interface KPISectionProps {
    data: ProductDetailData;
}

const KPISection: React.FC<KPISectionProps> = ({ data }) => {
    const [hoveredTurnover, setHoveredTurnover] = useState(false);
    const [hoveredMom, setHoveredMom] = useState(false);
    const [hoveredTransit, setHoveredTransit] = useState(false);

    return (
        <div className="grid grid-cols-4 gap-6">
            {/* Card 1: 在手库存 */}
            <div className="relative bg-gradient-to-br from-blue-50/80 to-white p-6 rounded-[20px] border border-blue-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] hover:-translate-y-1 hover:z-20 transition-all duration-300 group">
                {/* Decorative Background */}
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
                    <div className="absolute -right-6 -bottom-6 text-blue-100/50 group-hover:text-blue-100 transition-colors duration-500">
                        <Package size={120} strokeWidth={1} />
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-50 text-blue-600">
                            <Package size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 tracking-wide">在库量</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-sans">
                            {data.kpi.inStock.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative"
                            onMouseEnter={() => setHoveredTurnover(true)}
                            onMouseLeave={() => setHoveredTurnover(false)}
                        >
                            <span className="px-2.5 py-1 rounded-lg bg-blue-100/50 border border-blue-200/50 text-blue-700 text-xs font-bold flex items-center gap-1 cursor-help group-hover:bg-blue-100 transition-colors">
                                <RefreshCw size={10} />
                                周转 {data.kpi.turnoverDays} 天
                            </span>
                            {hoveredTurnover && (
                                <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 shadow-2xl rounded-xl z-50 w-64 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ring-1 ring-black/5">
                                    <div className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                                        <RefreshCw size={12} className="text-blue-600" />
                                        周转天数计算公式
                                    </div>
                                    <div className="text-gray-500 mb-2 leading-relaxed">
                                        当前库存 / (30天销量 / 30)<br />
                                        体现库存可支撑当前销售的天数
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono select-all cursor-text text-slate-700 flex flex-col gap-1">
                                        <div className="text-[10px] text-slate-400">点击下方数值可复制:</div>
                                        <div className="font-bold">{data.kpi.inStock} / ({data.kpi.sales30Days} / 30) ≈ {data.kpi.turnoverDays}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative group">
                            <span
                                className="text-xs font-bold text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 cursor-help transition-all hover:bg-slate-100 flex items-center gap-1"
                                onMouseEnter={() => setHoveredMom(true)}
                                onMouseLeave={() => setHoveredMom(false)}
                            >
                                环比 +5%
                            </span>
                            {hoveredMom && (
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 shadow-2xl rounded-xl z-50 w-64 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 origin-top-left">
                                    <div className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                                        <History size={12} className="text-slate-600" />
                                        环比增长计算公式
                                    </div>
                                    <div className="text-gray-500 mb-2 leading-relaxed text-left">
                                        ((本月销量 - 上月销量) / 上月销量) * 100%
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-700 text-left">
                                        ((1200 - 1140) / 1140) * 100% ≈ 5%
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: 在途采购 */}
            <div className="relative bg-gradient-to-br from-indigo-50/80 to-white p-6 rounded-[20px] border border-indigo-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.1)] hover:-translate-y-1 hover:z-20 transition-all duration-300 group">
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
                    <div className="absolute -right-6 -bottom-6 text-indigo-100/50 group-hover:text-indigo-100 transition-colors duration-500">
                        <Truck size={120} strokeWidth={1} />
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-50 text-indigo-600">
                            <Truck size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 tracking-wide">在途采购</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-sans">
                            {data.kpi.inTransit.toLocaleString()}
                        </span>
                        <div
                            className="relative"
                            onMouseEnter={() => setHoveredTransit(true)}
                            onMouseLeave={() => setHoveredTransit(false)}
                        >
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white shadow-sm shadow-indigo-200 cursor-help">
                                {data.kpi.inTransitBatches?.length || 0}批次
                            </span>
                            {hoveredTransit && data.kpi.inTransitBatches && data.kpi.inTransitBatches.length > 0 && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-0 bg-white border border-gray-200 shadow-xl rounded-xl z-50 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-700">在途批次详情</div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {data.kpi.inTransitBatches.map((batch, i) => (
                                            <div key={i} className={`px-3 py-2 border-b border-gray-50 text-xs flex justify-between items-center ${batch.isOverdue ? 'bg-red-50/50' : ''}`}>
                                                <div>
                                                    <div className="font-mono text-gray-500 text-[10px]">{batch.arrival_date} 预计到货</div>
                                                    <div className="font-bold text-gray-800">Qty: {batch.quantity}</div>
                                                </div>
                                                {batch.isOverdue ? (
                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">
                                                        逾期 {batch.overdueDays} 天
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-[10px] font-bold">
                                                        正常
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-100/50 border border-indigo-200/50 text-indigo-700 text-xs font-bold flex items-center gap-1">
                            <History size={10} />
                            预计到达: {data.kpi.inTransitBatches && data.kpi.inTransitBatches.length > 0 ? (() => {
                                const next = [...data.kpi.inTransitBatches].sort((a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime())[0];
                                const d = new Date(next.arrival_date);
                                return `${d.getMonth() + 1}月${d.getDate()}日` + (next.isOverdue ? ' (逾期)' : '');
                            })() : '无'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 3: 30天销量 (使用 Emerald 呼应"殸木"品牌色) */}
            <div className="relative bg-gradient-to-br from-emerald-50/80 to-white p-6 rounded-[20px] border border-emerald-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 hover:z-20 transition-all duration-300 group">
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
                    <div className="absolute -right-6 -bottom-6 text-emerald-100/50 group-hover:text-emerald-100 transition-colors duration-500">
                        <ShoppingCart size={110} strokeWidth={1} />
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-50 text-emerald-600">
                            <ShoppingCart size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 tracking-wide">30天销量</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-sans">
                            {data.kpi.sales30Days.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg">
                            <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            2.4%
                        </span>
                        <span className="text-xs font-medium text-slate-400">环比上月</span>
                    </div>
                </div>
            </div>

            {/* Card 4: 缺货风险 */}
            <div className={`relative p-6 rounded-[20px] border shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:z-20 transition-all duration-300 group
                ${data.kpi.stockoutRisk === '高'
                    ? 'bg-gradient-to-br from-rose-50/90 to-white border-rose-100 hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)] ring-1 ring-rose-200/50'
                    : 'bg-gradient-to-br from-orange-50/80 to-white border-orange-100 hover:shadow-[0_8px_30px_rgba(249,115,22,0.1)]'}
            `}>
                <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
                    <div className={`absolute -right-6 -bottom-6 transition-colors duration-500 ${data.kpi.stockoutRisk === '高' ? 'text-rose-100' : 'text-orange-100/50 group-hover:text-orange-100'}`}>
                        <AlertTriangle size={120} strokeWidth={1} />
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 bg-white rounded-xl shadow-sm border ${data.kpi.stockoutRisk === '高' ? 'border-rose-100 text-rose-600' : 'border-orange-50 text-orange-600'}`}>
                            <AlertTriangle size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 tracking-wide">缺货风险</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-4xl font-extrabold tracking-tight font-sans ${data.kpi.stockoutRisk === '高' ? 'text-rose-600' : 'text-slate-800'}`}>
                            {data.kpi.stockoutRisk}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1
                            ${data.kpi.stockoutRisk === '高' ? 'bg-rose-100/50 border-rose-200/50 text-rose-700' : 'bg-orange-100/50 border-orange-200/50 text-orange-700'}
                        `}>
                            <CheckCircle size={10} />
                            可售 {data.kpi.turnoverDays} 天
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPISection;
