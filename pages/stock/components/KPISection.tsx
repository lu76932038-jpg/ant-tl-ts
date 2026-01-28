import React, { useState } from 'react';
import {
    Package,
    RefreshCw,
    Truck,
    ShoppingCart,
    AlertTriangle,
    CheckCircle,
    History,
    CircleDollarSign,
    Activity,
    TrendingUp,
    ChevronUp,
    ShieldAlert,
    Info,
    CalendarDays,
    ArrowRight
} from 'lucide-react';
import { ProductDetailData, SupplierInfo } from '../types';

interface KPISectionProps {
    data: ProductDetailData;
    supplier?: SupplierInfo | null;
}

const KPISection: React.FC<KPISectionProps> = ({ data, supplier }) => {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    // 计算衍生指标
    const unit = data.basic.unit || 'PCS';
    const avgDailySales = Math.round(data.kpi.sales30Days / 30);
    const selectedPrice = supplier?.priceTiers?.find(t => t.isSelected)?.price || supplier?.price || 0;
    const inventoryValue = Math.round(data.kpi.inStock * selectedPrice);

    const kpis = [
        {
            id: 1,
            label: '在库数量',
            value: data.kpi.inStock.toLocaleString(),
            unit: unit,
            icon: <Package size={20} />,
            color: 'blue',
            bgGradient: 'from-blue-50/80 to-white',
            borderColor: 'border-blue-100/50',
            accent: 'text-blue-600',
            detail: `周转 ${data.kpi.turnoverDays} 天`,
            trend: '+5%',
            trendDir: 'up',
            footerIcon: <Package size={140} />,
            tooltip: {
                title: '周转天数计算',
                formula: '当前库存 / (30天销量 / 30)',
                process: `${data.kpi.inStock} / (${data.kpi.sales30Days} / 30) ≈ ${data.kpi.turnoverDays} 天`
            }
        },
        {
            id: 2,
            label: '库存估值',
            value: (data.kpi.inventoryValue || 0).toLocaleString(),
            unit: '¥',
            icon: <CircleDollarSign size={20} />,
            color: 'amber',
            bgGradient: 'from-amber-50/80 to-white',
            borderColor: 'border-amber-100/50',
            accent: 'text-amber-600',
            detail: '基于FIFO成本核算',
            trend: 'Live',
            trendDir: 'neutral',
            footerIcon: <CircleDollarSign size={130} />,
            tooltip: {
                title: '库存资产估值 (FIFO)',
                formula: '∑(批次数量 × 入库单价)',
                process: (() => {
                    if (data.kpi.valuationDetails && data.kpi.valuationDetails.length > 0) {
                        return data.kpi.valuationDetails.map(d => {
                            const typeLabel = d.type === 'FALLBACK' ? ' (兜底/期初)' : '';
                            return `${d.date}: ${d.qty}${unit} × ¥${d.price}${typeLabel}`;
                        }).join('\n');
                    }
                    return `${data.kpi.inStock.toLocaleString()} PCS × ¥${selectedPrice.toFixed(2)} = ¥${(data.kpi.inStock * selectedPrice).toLocaleString()}`;
                })()
            }
        },
        {
            id: 3,
            label: '在途采购',
            value: data.kpi.inTransit.toLocaleString(),
            unit: unit,
            icon: <Truck size={20} />,
            color: 'indigo',
            bgGradient: 'from-indigo-50/80 to-white',
            borderColor: 'border-indigo-100/50',
            accent: 'text-indigo-600',
            detail: `${data.kpi.inTransitBatches?.length || 0} 个批次`,
            trend: 'In Transit',
            trendDir: 'neutral',
            footerIcon: <Truck size={140} />,
            tooltip: {
                title: '在途批次详情',
                formula: 'Σ(所有已下单但未入库数量)',
                process: data.kpi.inTransitBatches && data.kpi.inTransitBatches.length > 0
                    ? data.kpi.inTransitBatches.map(b => `${b.arrival_date}: ${b.quantity}pcs`).join(', ')
                    : '暂无在途批次'
            }
        },
        {
            id: 4,
            label: '30天出库实绩',
            value: data.kpi.sales30Days.toLocaleString(),
            unit: unit,
            icon: <ShoppingCart size={20} />,
            color: 'emerald',
            bgGradient: 'from-emerald-50/80 to-white',
            borderColor: 'border-emerald-100/50',
            accent: 'text-emerald-600',
            detail: '月度销售总量',
            trend: '-2.4%',
            trendDir: 'down',
            footerIcon: <ShoppingCart size={130} />,
            tooltip: {
                title: '销售总量统计',
                formula: '近30个自然日的累计出库实绩',
                process: `统计区间: ${new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]} 至 今日`
            }
        },
        {
            id: 5,
            label: '30天出库预测',
            value: (data.kpi.forecast30Days || 0).toLocaleString(),
            unit: unit,
            icon: <Activity size={20} />,
            color: 'purple',
            bgGradient: 'from-purple-50/80 to-white',
            borderColor: 'border-purple-100/50',
            accent: 'text-purple-600',
            detail: '未来30天需求',
            trend: 'Stable',
            trendDir: 'neutral',
            footerIcon: <Activity size={140} />,
            tooltip: {
                title: '智能预测 (Forecast 30D)',
                formula: '∑(未来30天日预测值)',
                process: (() => {
                    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                    return `算法: ARIMA趋势预测 + 季节性加权\n计算过程: 根据销售预测，计算至 ${futureDate} 总计销售预测数量`;
                })()
            }
        },
        {
            id: 6,
            label: '缺货风险',
            value: data.kpi.stockoutRisk,
            unit: 'LEVEL',
            icon: <ShieldAlert size={20} />,
            color: data.kpi.stockoutRisk === '高' ? 'rose' : 'orange',
            bgGradient: data.kpi.stockoutRisk === '高' ? 'from-rose-50/90 to-white' : 'from-orange-50/80 to-white',
            borderColor: data.kpi.stockoutRisk === '高' ? 'border-rose-100' : 'border-orange-100/50',
            accent: data.kpi.stockoutRisk === '高' ? 'text-rose-600' : 'text-orange-600',
            detail: `支撑 ${data.kpi.turnoverDays} 天`,
            trend: data.kpi.stockoutRisk === '高' ? 'CRITICAL' : 'MONITOR',
            trendDir: 'neutral',
            footerIcon: <ShieldAlert size={140} />,
            tooltip: {
                title: '风险等级判定',
                formula: '周转天数 < 供应商交期 ? 高风险 : ...',
                process: (() => {
                    // Derive Lead Time from selected tier
                    const selectedTier = supplier?.priceTiers?.find(t => t.isSelected);
                    const leadTime = selectedTier?.leadTime || 30; // Default to 30 if no tier selected

                    return `当前周转 ${data.kpi.turnoverDays} 天 vs 供应商交期 ${leadTime} 天 (基于${selectedTier ? '选中阶梯' : '默认'})`;
                })()
            }
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((kpi, index) => (
                <div
                    key={kpi.id}
                    onMouseEnter={() => setHoveredCard(kpi.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`relative overflow-visible bg-gradient-to-br ${kpi.bgGradient} p-4 rounded-xl border ${kpi.borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-help group
                        ${hoveredCard === kpi.id ? 'z-[60]' : 'z-10'}
                    `}
                >
                    {/* Compact Artistic Choice: Smaller background icon */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                        <div className={`absolute -right-3 -bottom-4 opacity-[0.08] group-hover:opacity-[0.15] group-hover:scale-110 transition-all duration-700 ${kpi.accent}`}>
                            {React.cloneElement(kpi.footerIcon as React.ReactElement, { size: 80 } as any)}
                        </div>
                    </div>

                    {/* Tooltip Popup (Keep Downwards) */}
                    {hoveredCard === kpi.id && kpi.tooltip && (
                        <div className={`absolute top-[calc(100%+8px)] w-64 bg-slate-900/95 backdrop-blur-xl text-white p-3 rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 cursor-text select-text pointer-events-auto
                            ${index < 3 ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}
                        `}>
                            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/10">
                                <Info size={12} className={kpi.accent} />
                                <span className="text-[10px] font-black uppercase tracking-wider">{kpi.tooltip.title}</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 text-left">计算公式</p>
                                    <code className="text-[9px] font-mono p-1 bg-white/5 rounded block border border-white/5 text-emerald-400 text-left">
                                        {kpi.tooltip.formula}
                                    </code>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 text-left">计算过程</p>
                                    <p className="text-[9px] font-mono leading-relaxed text-slate-200 text-left break-all whitespace-pre-wrap">
                                        {kpi.tooltip.process}
                                    </p>
                                </div>
                            </div>
                            {/* Arrow */}
                            <div className={`absolute -top-1 w-2 h-2 bg-slate-900/90 rotate-45 ${index < 3 ? 'left-4' : 'right-4'}`} />
                        </div>
                    )}

                    <div className="relative z-10 flex items-start justify-between h-full gap-2">
                        {/* Left: Main Data */}
                        <div className="flex flex-col justify-between h-full min-h-[60px]">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 text-left">{kpi.label}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black tracking-tight font-sans text-slate-900 leading-none">
                                        {kpi.value}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{kpi.unit}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 mt-auto">
                                <div className={`size-1.5 rounded-full bg-${kpi.color}-500 animate-pulse`} />
                                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[80px]">{kpi.detail}</span>
                            </div>
                        </div>

                        {/* Right: Icon & Trend */}
                        <div className="flex flex-col items-end gap-2">
                            <div className={`p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100 ${kpi.accent}`}>
                                {React.cloneElement(kpi.icon as React.ReactElement, { size: 16 } as any)}
                            </div>
                            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider
                                ${kpi.trendDir === 'up' ? 'bg-emerald-50 text-emerald-600' :
                                    kpi.trendDir === 'down' ? 'bg-rose-50 text-rose-600' :
                                        'bg-slate-50 text-slate-400'}
                            `}>
                                {kpi.trendDir === 'up' && <ChevronUp size={8} />}
                                {kpi.trend}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPISection;
