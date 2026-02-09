import React, { useMemo, useState, useEffect } from 'react';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter
} from 'recharts';
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react';
import { ProductDetailData } from '../types';

interface InventorySimChartProps {
    data: ProductDetailData | null;
    editSafetyStock: number;
    editReplenishmentCycle: number;
    currentLeadTime: number;
    eoq: number;
    dayOfWeekFactors?: number[];
    forecastOverrides?: Record<string, number>;
    calculatedForecasts?: Record<string, number>;
    minOrderQty?: number;  // 最小起订量 (MOQ)
    orderUnitQty?: number; // 订货单位量
}

// Custom Tooltip Component defined outside main component to avoid recreation
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataMap = new Map();
    payload.forEach((p: any) => {
        dataMap.set(p.dataKey, p);
    });

    const stock = dataMap.get('stock')?.value;
    const backlog = dataMap.get('backlog')?.value;
    const outbound = dataMap.get('outbound')?.value;
    const rop = dataMap.get('rop')?.value;
    const safety = dataMap.get('safetyStock')?.value;
    const restock = dataMap.get('restock')?.value;
    const inbound = dataMap.get('inbound')?.value;
    const items = payload[0]?.payload;

    let statusColor = 'bg-blue-500';
    let statusText = '正常';

    if (stock < safety) {
        statusColor = 'bg-red-500';
        statusText = '缺货风险';
    } else if (stock < rop) {
        statusColor = 'bg-orange-500';
        statusText = '需补货';
    } else {
        statusColor = 'bg-emerald-500';
        statusText = '库存充足';
    }

    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-0 overflow-hidden min-w-[240px]">
            <div className={`px-4 py-2 border-b border-gray-100 flex items-center justify-between ${statusColor}/5`}>
                <span className="text-gray-600 font-medium text-sm">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor} text-white`}>
                    {statusText}
                </span>
            </div>

            <div className="p-4 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-xs text-gray-400 mb-1">预计库存</div>
                        <div className="text-2xl font-bold text-gray-800">
                            {stock?.toLocaleString()} <span className="text-xs font-normal text-gray-400">件</span>
                        </div>
                    </div>
                    {backlog > 0 && (
                        <div className="text-right">
                            <div className="text-xs text-red-400 mb-1 font-medium">积压欠单</div>
                            <div className="text-xl font-bold text-red-500">
                                {backlog?.toLocaleString()} <span className="text-xs font-normal text-red-300">件</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-50">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            补货点 (ROP)
                        </span>
                        <span className="font-medium text-gray-700">{rop?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            安全库存 (SS)
                        </span>
                        <span className="font-medium text-gray-700">{safety?.toLocaleString()}</span>
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-50 bg-gray-50/50 -mx-4 px-4 py-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">预测日销售</span>
                        <span className="font-medium text-gray-700">{items?.dailySales?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-blue-500 font-medium">预测出库 (实际)</span>
                        <span className="font-bold text-blue-600">-{outbound?.toLocaleString()}</span>
                    </div>

                    {items?.totalInTransit > 0 && (
                        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
                            <div className="flex justify-between items-center bg-blue-50/50 rounded-lg p-2.5">
                                <span className="text-xs text-blue-600/80 font-medium flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                    总在途数量
                                </span>
                                <span className="text-sm font-bold text-blue-700 font-mono tracking-tight">
                                    {Math.round(items.totalInTransit).toLocaleString()}
                                    <span className="text-[10px] text-blue-400 ml-1 font-normal">PCS</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {restock > 0 && (
                        <div className="flex justify-between items-center text-xs animate-pulse mt-2 pt-2 border-t border-purple-100">
                            <span className="text-purple-600 font-bold flex items-center gap-1">
                                ⚡ 今日触发补货
                            </span>
                            <span className="font-bold text-purple-600">+{restock.toLocaleString()}</span>
                        </div>
                    )}
                    {inbound > 0 && (
                        <div className="flex justify-between items-center text-xs mt-1">
                            <span className="text-blue-600 font-bold flex items-center gap-1">
                                🚚 今日到货入库
                            </span>
                            <span className="font-bold text-blue-600">+{inbound.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InventorySimChart = ({
    data,
    editSafetyStock,
    editReplenishmentCycle,
    currentLeadTime,
    eoq,
    dayOfWeekFactors = [],
    forecastOverrides = {},
    calculatedForecasts = {},
    minOrderQty = 1,
    orderUnitQty = 1
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const simData = useMemo(() => {
        if (!data) return [];

        const days = 365;
        const result = [];

        // 1. 获取基础预测数据
        const dailyForecastMap = new Map<string, number>();
        const monthlyForecastMap = new Map<string, number>();

        if (data.charts) {
            data.charts.filter(c => c.type === 'future').forEach(c => {
                const monthKey = c.month;
                monthlyForecastMap.set(monthKey, c.forecastQty || 0);
                if (c.daily_forecasts) {
                    c.daily_forecasts.forEach(d => {
                        dailyForecastMap.set(d.date, d.quantity);
                    });
                }
            });
        }

        const fallbackDailySales = data.kpi.sales30Days > 0
            ? data.kpi.sales30Days / 30
            : (data.kpi.inStock > 0 ? data.kpi.inStock / 60 : 10);

        // 构建在途批次到货日期Map
        const inTransitArrivals = new Map<string, number>();
        if (data.kpi.inTransitBatches) {
            data.kpi.inTransitBatches.forEach((batch: any) => {
                const arrivalDate = batch.arrival_date?.split('T')[0];
                if (arrivalDate) {
                    inTransitArrivals.set(arrivalDate, (inTransitArrivals.get(arrivalDate) || 0) + batch.quantity);
                }
            });
        }

        // --- 预处理：计算每日预测序列 (覆盖模拟天数 + 销售周期天数) ---
        const totalSimDays = days + Math.round(editSafetyStock * 31) + 10; // 额外缓冲
        const dayForecasts: number[] = [];
        for (let j = 0; j < totalSimDays; j++) {
            const d = new Date();
            d.setDate(d.getDate() + j);
            const dStr = d.toISOString().split('T')[0];
            const mStr = dStr.slice(0, 7);

            let ds = 0;
            const overrideVal = forecastOverrides[mStr];
            const calcVal = calculatedForecasts[mStr];

            if (overrideVal !== undefined || calcVal !== undefined) {
                const monthlyTotal = overrideVal !== undefined ? overrideVal : (calcVal ?? 0);
                const daysInMonthInner = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                if (dayOfWeekFactors && dayOfWeekFactors.length === 7) {
                    let totalWeights = 0;
                    for (let dd = 1; dd <= daysInMonthInner; dd++) {
                        const tempDate = new Date(d.getFullYear(), d.getMonth(), dd);
                        const factorIndex = tempDate.getDay() === 0 ? 6 : tempDate.getDay() - 1;
                        totalWeights += dayOfWeekFactors[factorIndex] || 1;
                    }
                    const factorIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    const factor = dayOfWeekFactors[factorIndex] || 1;
                    ds = Math.round(totalWeights > 0 ? (monthlyTotal * factor) / totalWeights : monthlyTotal / daysInMonthInner);
                } else {
                    ds = Math.round(monthlyTotal / daysInMonthInner);
                }
            } else {
                const backendDaily = dailyForecastMap.get(dStr);
                if (backendDaily !== undefined) {
                    ds = Math.round(backendDaily);
                } else {
                    const monthlyTotal = monthlyForecastMap.get(mStr);
                    if (monthlyTotal !== undefined) {
                        const daysInMonthInner = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                        if (dayOfWeekFactors && dayOfWeekFactors.length === 7) {
                            let totalWeights = 0;
                            for (let dd = 1; dd <= daysInMonthInner; dd++) {
                                const tempDate = new Date(d.getFullYear(), d.getMonth(), dd);
                                const factorIndex = tempDate.getDay() === 0 ? 6 : tempDate.getDay() - 1;
                                totalWeights += dayOfWeekFactors[factorIndex] || 1;
                            }
                            const factorIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
                            const factor = dayOfWeekFactors[factorIndex] || 1;
                            ds = Math.round(totalWeights > 0 ? (monthlyTotal * factor) / totalWeights : monthlyTotal / daysInMonthInner);
                        } else {
                            ds = Math.round(monthlyTotal / daysInMonthInner);
                        }
                    } else {
                        ds = Math.round(fallbackDailySales);
                    }
                }
            }
            // V3.0.1 Fix: Align with Strategy Logic for Today's Demand (Mix of Actual & Forecast)
            if (j === 0) {
                const todayActual = data.kpi.dailyActuals?.find(a => a.date === dStr)?.qty || 0;
                ds = Math.max(ds, todayActual);
            }
            dayForecasts.push(ds);
        }

        // 模拟状态
        let currentStock = data.kpi.inStock || 0;
        let currentBacklog = data.kpi.backlog_qty || 0; // Fix: Initialize with actual backlog
        let restockIndexCounter = 0;
        let lastRestockDateIdx = -100; // 上次补货触发的索引，用于冷却期控制
        const replenishmentInTransit = new Map<string, { qty: number, index: number }>();

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dailySales = dayForecasts[i];

            // 1. 计算当前所有在途
            let totalInTransit = 0;
            inTransitArrivals.forEach((qty, arrivalDate) => {
                if (arrivalDate > dateStr) totalInTransit += qty;
            });
            replenishmentInTransit.forEach((info, arrivalDate) => {
                if (arrivalDate > dateStr) totalInTransit += info.qty;
            });

            // 2. 累积当日需求
            currentBacklog += dailySales;

            // 3. 处理当日到货
            const historyArrival = inTransitArrivals.get(dateStr) || 0;
            const replenishmentArrival = replenishmentInTransit.get(dateStr);
            const simArrival = replenishmentArrival?.qty || 0;
            const inboundToday = historyArrival + simArrival;
            const inboundIndex = replenishmentArrival?.index;
            currentStock += inboundToday;

            // 4. 履行出库
            const fulfillment = Math.min(currentStock, currentBacklog);
            currentStock -= fulfillment;
            currentBacklog -= fulfillment;

            // --- 5. 核心：日级精确滚动对齐 (2/5 最终规范) ---

            // 1. 最小销售周期需求 (用于 SS 和 ROP 前段)
            const ropPart1EndObj = new Date(date);
            ropPart1EndObj.setMonth(ropPart1EndObj.getMonth() + editSafetyStock);
            const ropPart1Days = Math.max(1, Math.round((ropPart1EndObj.getTime() - date.getTime()) / 86400000));

            let ropPart1Demand = 0;
            for (let j = 0; j < ropPart1Days; j++) {
                ropPart1Demand += dayForecasts[i + j] || 0;
            }

            // 2. 货期需求 (用于 ROP 后段)
            let leadTimeDemand = 0;
            for (let j = 0; j < currentLeadTime; j++) {
                leadTimeDemand += dayForecasts[i + ropPart1Days + j] || 0;
            }

            // 3. 补货点 (触发线) = 最小销售周期需求 + 货期需求
            const targetThreshold = Math.round(ropPart1Demand + leadTimeDemand);
            const dynamicSafetyStock = Math.round(ropPart1Demand); // 安全库存 = 最小销售周期需求

            // 4. 补货销售周期需求 (目标水平)
            const targetEndObj = new Date(date);
            targetEndObj.setMonth(targetEndObj.getMonth() + editReplenishmentCycle);
            const targetDays = Math.max(1, Math.round((targetEndObj.getTime() - date.getTime()) / 86400000));

            let replenishmentCycleDemand = 0;
            for (let j = 0; j < targetDays; j++) {
                replenishmentCycleDemand += dayForecasts[i + j] || 0;
            }

            // 补货触发判断
            const triggerThreshold = targetThreshold + currentBacklog; // 补货点 + 欠单
            const effectiveStock = currentStock + totalInTransit; // 当前拥有 (在库 + 在途)

            let isRestock = false;
            let restockQty = 0;
            let currentRestockIndex: number | undefined;

            if (effectiveStock < triggerThreshold) {
                // 100% 还原推算真相：叠加式补货量 = (补货点 + 补货销售周期需求 + 积压欠单) - 有效库存
                const rawRestockQty = Math.max(0, (targetThreshold + replenishmentCycleDemand + currentBacklog) - effectiveStock);

                // 应用最小起订量和下单倍数
                let finalRestockQty = Math.max(rawRestockQty, minOrderQty);
                if (orderUnitQty > 1) {
                    finalRestockQty = Math.ceil(finalRestockQty / orderUnitQty) * orderUnitQty;
                }

                if (finalRestockQty > 0) {
                    isRestock = true;
                    currentRestockIndex = ++restockIndexCounter;
                    restockQty = finalRestockQty;

                    const arrivalDateObj = new Date(date);
                    arrivalDateObj.setDate(arrivalDateObj.getDate() + currentLeadTime);
                    const arrivalDateStr = arrivalDateObj.toISOString().split('T')[0];
                    replenishmentInTransit.set(arrivalDateStr, { qty: restockQty, index: currentRestockIndex });
                }
            }

            result.push({
                date: dateStr,
                stock: Math.round(currentStock),
                backlog: Math.round(currentBacklog),
                outbound: Math.round(fulfillment),
                rop: Math.round(targetThreshold),
                safetyStock: Math.round(dynamicSafetyStock), // 这里重新放回真正的安全库存
                totalInTransit: totalInTransit,
                historyInbound: historyArrival > 0 ? historyArrival : undefined,
                inbound: simArrival > 0 ? simArrival : undefined,
                inboundIndex: simArrival > 0 ? inboundIndex : undefined,
                restock: isRestock ? restockQty : undefined,
                restockIndex: isRestock ? currentRestockIndex : undefined,
                dailySales: Math.round(dailySales)
            });
        }
        return result;
    }, [data, editSafetyStock, editReplenishmentCycle, currentLeadTime, eoq, dayOfWeekFactors, forecastOverrides, calculatedForecasts, minOrderQty, orderUnitQty]);

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">库存趋势模拟</h2>
                        <p className="text-xs text-gray-400 mt-1">综合模拟基于未来预测的库存变化与智能补货点</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowTable(!showTable)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all text-xs font-bold"
                        >
                            <TableIcon size={14} />
                            {showTable ? '隐藏推算报表' : '查看推算报表'}
                            {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* --- 数据推算明细报表 --- */}
                {showTable && (
                    <div className="mt-6 border border-gray-100 rounded-xl overflow-hidden bg-slate-50/30 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="max-h-[400px] overflow-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-white shadow-sm z-20">
                                    <tr className="bg-slate-100/80">
                                        <th className="px-4 py-3 font-black text-slate-500 whitespace-nowrap">推算日期</th>
                                        <th className="px-4 py-3 font-black text-slate-500 text-right whitespace-nowrap">预测销量</th>
                                        <th className="px-4 py-3 font-black text-slate-500 text-right whitespace-nowrap">实物库存</th>
                                        <th className="px-4 py-3 font-black text-red-500 text-right whitespace-nowrap font-bold">积压/缺货</th>
                                        <th className="px-4 py-3 font-black text-blue-500 text-right whitespace-nowrap">在途总和</th>
                                        <th className="px-4 py-3 font-black text-orange-600 text-right whitespace-nowrap">有效触发点</th>
                                        <th className="px-4 py-3 font-black text-indigo-600 text-center whitespace-nowrap">补货/到货动作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {simData.map((row, idx) => {
                                        const isCritical = row.stock < row.safetyStock;
                                        const isWarning = row.stock < row.rop;
                                        return (
                                            <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.restock ? 'bg-red-50/50' : (row.inbound ? 'bg-emerald-50/50' : '')}`}>
                                                <td className="px-4 py-2 font-mono text-slate-400">{row.date}</td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-600">-{Math.round(row.dailySales)}</td>
                                                <td className={`px-4 py-2 text-right font-black ${isCritical ? 'text-red-600' : (isWarning ? 'text-orange-500' : 'text-slate-800')}`}>
                                                    {Math.round(row.stock).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold text-red-500">
                                                    {row.backlog > 0 ? `-${Math.round(row.backlog)}` : '0'}
                                                </td>
                                                <td className="px-4 py-2 text-right text-blue-500 font-bold">
                                                    {Math.round(row.totalInTransit).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-right text-orange-500 font-medium">
                                                    {Math.round(row.rop).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {row.restock && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 font-black text-[10px] ring-1 ring-red-200 uppercase">
                                                            补{row.restockIndex}: +{Math.round(row.restock)}
                                                        </span>
                                                    )}
                                                    {row.inbound && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-black text-[10px] ring-1 ring-emerald-200 uppercase ml-1">
                                                            入{row.inboundIndex}: +{Math.round(row.inbound)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 border-t border-gray-100 text-right">
                            * 数据基于当前 {editReplenishmentCycle} 个月销售周期计算出的日级补货点推演
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end mb-4 text-xs">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></div>
                        <span className="text-gray-600">预测实物库存</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                        <span className="text-gray-600">预测欠单</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-600">ROP</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">安全库存 (SS)线</span>
                    </div>
                </div>
            </div>

            <div className="h-[350px] w-full relative">
                {isMounted && (
                    <div className="absolute inset-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* ... ComposedChart 内容保持不变 ... */}
                            <ComposedChart
                                data={simData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="backlogGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />

                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.slice(5)}
                                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                                    minTickGap={20}
                                    interval="preserveStartEnd"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />

                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748B' }}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                />

                                <Tooltip content={<CustomTooltip />} />

                                <Area
                                    yAxisId="left"
                                    type="linear"
                                    dataKey="stock"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fill="url(#stockGradient)"
                                    activeDot={{ r: 4, fill: '#fff', stroke: '#3B82F6', strokeWidth: 2 }}
                                />

                                <Area
                                    yAxisId="left"
                                    type="linear"
                                    dataKey="backlog"
                                    stroke="#EF4444"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    fill="url(#backlogGradient)"
                                    activeDot={{ r: 3, fill: '#fff', stroke: '#EF4444', strokeWidth: 2 }}
                                />

                                <Line
                                    yAxisId="left"
                                    type="linear"
                                    dataKey="rop"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    activeDot={false}
                                />

                                <Line
                                    yAxisId="left"
                                    type="linear"
                                    dataKey="safetyStock"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    activeDot={false}
                                />

                                <Scatter
                                    yAxisId="left"
                                    dataKey="restock"
                                    fill="#EF4444"
                                    line={false}
                                    shape={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (!payload.restock) return null;
                                        const dateLabel = payload.date?.slice(5) || '';
                                        const qtyLabel = Math.round(payload.restock);
                                        return (
                                            <g>
                                                <circle cx={cx} cy={cy} r={24} fill="#EF4444" fillOpacity={0.15} stroke="#EF4444" strokeWidth={2} />
                                                <text x={cx} y={cy - 4} textAnchor="middle" fill="#000" fontSize={10} fontWeight="900">
                                                    补{payload.restockIndex}-{qtyLabel}
                                                </text>
                                                <text x={cx} y={cy + 10} textAnchor="middle" fill="#1F2937" fontSize={9} fontWeight="700">
                                                    {dateLabel}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                <Scatter
                                    yAxisId="left"
                                    dataKey="inbound"
                                    fill="#10B981"
                                    line={false}
                                    shape={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (!payload.inbound) return null;
                                        const dateLabel = payload.date?.slice(5) || '';
                                        const qtyLabel = Math.round(payload.inbound);
                                        return (
                                            <g>
                                                <circle cx={cx} cy={cy} r={24} fill="#10B981" fillOpacity={0.15} stroke="#10B981" strokeWidth={2} />
                                                <text x={cx} y={cy - 4} textAnchor="middle" fill="#7C3AED" fontSize={10} fontWeight="900">
                                                    入{payload.inboundIndex}-{qtyLabel}
                                                </text>
                                                <text x={cx} y={cy + 10} textAnchor="middle" fill="#6D28D9" fontSize={9} fontWeight="700">
                                                    {dateLabel}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventorySimChart;
