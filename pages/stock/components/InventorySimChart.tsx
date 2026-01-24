import React, { useMemo } from 'react';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { ProductDetailData } from '../types';

interface InventorySimChartProps {
    data: ProductDetailData | null;
    editSafetyStock: number;
    currentLeadTime: number;
    eoq: number;
    dayOfWeekFactors?: number[];
    forecastOverrides?: Record<string, number>;
    calculatedForecasts?: Record<string, number>;
}

// Custom Tooltip Component defined outside main component to avoid recreation
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // Remove duplicates based on dataKey (since dual axes might duplicate points)
    // Create a map to ensure unique metrics
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
    const items = payload[0]?.payload; // Get full data object

    // Determine status color
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
            {/* Header */}
            <div className={`px-4 py-2 border-b border-gray-100 flex items-center justify-between ${statusColor}/5`}>
                <span className="text-gray-600 font-medium text-sm">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor} text-white`}>
                    {statusText}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Main Metric: Stock */}
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

                {/* Strategy Metrics */}
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
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            安全库存
                        </span>
                        <span className="font-medium text-gray-700">{safety?.toLocaleString()}</span>
                    </div>
                </div>

                {/* Dynamic Metrics */}
                <div className="space-y-2 pt-2 border-t border-gray-50 bg-gray-50/50 -mx-4 px-4 py-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">预测销售 (需求)</span>
                        <span className="font-medium text-gray-700">{items?.dailySales?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-blue-500 font-medium">预测出库 (实际)</span>
                        <span className="font-bold text-blue-600">-{outbound?.toLocaleString()}</span>
                    </div>

                    {/* 在途详情 */}
                    {items?.totalInTransit > 0 && (
                        <div className="pt-2 mt-2 border-t border-gray-200/50">
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-gray-500">总在途数量</span>
                                <span className="font-medium text-blue-600">{items.totalInTransit.toLocaleString()}</span>
                            </div>
                            {items.nextArrivalDate && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 flex items-center gap-1">
                                        🕒 下批预计 ({items.nextArrivalDate.slice(5)})
                                    </span>
                                    <span className="font-medium text-blue-600">+{items.nextArrivalQty?.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 当日触发补货 */}
                    {restock > 0 && (
                        <div className="flex justify-between items-center text-xs animate-pulse mt-2 pt-2 border-t border-purple-100">
                            <span className="text-purple-600 font-bold flex items-center gap-1">
                                ⚡ 今日触发补货
                            </span>
                            <span className="font-bold text-purple-600">+{restock.toLocaleString()}</span>
                        </div>
                    )}
                    {/* 当日到货 */}
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

const InventorySimChart: React.FC<InventorySimChartProps> = ({
    data,
    editSafetyStock,
    currentLeadTime,
    eoq,
    dayOfWeekFactors = [],
    forecastOverrides = {},
    calculatedForecasts = {}
}) => {
    // Add mount check with delay to ensure flex container has size
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const simData = useMemo(() => {
        if (!data) return [];

        const days = 365;
        const result = [];

        // 1. 获取基础预测数据 (优先使用 charts 中的 forecastQty)
        // 支持日级别精确预测 (Backend 每日预测) 或月级别平滑降级
        const dailyForecastMap = new Map<string, number>();
        const monthlyForecastMap = new Map<string, number>();

        if (data.charts) {
            data.charts.filter(c => c.type === 'future').forEach(c => {
                // Store TOTAL monthly forecast for accurate distribution
                // (Backend usually sends forecastQty as the monthly total)
                const monthKey = c.month;
                monthlyForecastMap.set(monthKey, c.forecastQty || 0);

                // Daily Precise (if available) - overrides calculated distribution
                if (c.daily_forecasts) {
                    c.daily_forecasts.forEach(d => {
                        dailyForecastMap.set(d.date, d.quantity);
                    });
                }
            });
        }

        // 备用：如果没有预测数据，使用历史平均
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

        // 模拟状态
        let currentStock = data.kpi.inStock || 0;
        let currentBacklog = 0; // 新增：积压欠单量（需求未满足累积）

        // 记录补货在途：Key=到货日期, Value=数量
        const replenishmentInTransit = new Map<string, number>();

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const monthStr = dateStr.slice(0, 7); // YYYY-MM

            // 1. 获取当日预测销量 (核心逻辑更新)
            let dailySales;

            // A. Check for Frontend Override (Higher Priority)
            const overrideVal = forecastOverrides[monthStr];
            const calcVal = calculatedForecasts[monthStr];

            // 只要有 override 或 calculated，就视为有前端干预，忽略后端 dailyForecastMap
            if (overrideVal !== undefined || calcVal !== undefined) {
                // Determine monthly total from props
                const monthlyTotal = overrideVal !== undefined ? overrideVal : (calcVal ?? 0);

                // Distribute monthly total
                const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

                if (dayOfWeekFactors && dayOfWeekFactors.length === 7) {
                    // Weighted Distribution
                    let totalWeights = 0;
                    for (let d = 1; d <= daysInMonth; d++) {
                        const tempDate = new Date(date.getFullYear(), date.getMonth(), d);
                        const factorIndex = tempDate.getDay() === 0 ? 6 : tempDate.getDay() - 1;
                        totalWeights += dayOfWeekFactors[factorIndex] || 1;
                    }
                    const factorIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                    const factor = dayOfWeekFactors[factorIndex] || 1;

                    dailySales = totalWeights > 0 ? (monthlyTotal * factor) / totalWeights : monthlyTotal / daysInMonth;
                } else {
                    dailySales = monthlyTotal / daysInMonth;
                }
            } else {
                // B. No Frontend Override - Use Backend Data
                const backendDaily = dailyForecastMap.get(dateStr);

                if (backendDaily !== undefined) {
                    dailySales = backendDaily;
                } else {
                    // Fallback to backend monthly distribution
                    const monthlyTotal = monthlyForecastMap.get(monthStr);
                    if (monthlyTotal !== undefined) {
                        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

                        if (dayOfWeekFactors && dayOfWeekFactors.length === 7) {
                            // Weighted Distribution
                            let totalWeights = 0;
                            for (let d = 1; d <= daysInMonth; d++) {
                                const tempDate = new Date(date.getFullYear(), date.getMonth(), d);
                                const factorIndex = tempDate.getDay() === 0 ? 6 : tempDate.getDay() - 1;
                                totalWeights += dayOfWeekFactors[factorIndex] || 1;
                            }
                            const factorIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                            const factor = dayOfWeekFactors[factorIndex] || 1;

                            dailySales = totalWeights > 0 ? (monthlyTotal * factor) / totalWeights : monthlyTotal / daysInMonth;
                        } else {
                            dailySales = monthlyTotal / daysInMonth;
                        }
                    } else {
                        dailySales = fallbackDailySales;
                    }
                }
            }

            // 2. 累加当日需求到欠单池 (需求持久化)
            currentBacklog += dailySales;

            // 3. 动态 ROP/安全库存计算
            const dynamicSafetyStock = Math.round(dailySales * 30 * editSafetyStock);
            const leadTimeConsumption = dailySales * currentLeadTime;
            const targetRopLevel = dynamicSafetyStock + leadTimeConsumption;

            // 计算当前所有在途
            let totalInTransit = 0;
            inTransitArrivals.forEach((qty, arrivalDate) => {
                if (arrivalDate > dateStr) totalInTransit += qty;
            });
            replenishmentInTransit.forEach((qty, arrivalDate) => {
                if (arrivalDate > dateStr) totalInTransit += qty;
            });

            // 4. 处理当日到货
            const arrival1 = inTransitArrivals.get(dateStr) || 0;
            const arrival2 = replenishmentInTransit.get(dateStr) || 0;
            const inboundToday = arrival1 + arrival2;
            currentStock += inboundToday;

            // 5. 履行欠单 (优先从库存中扣抵之前的积压需求)
            const fulfillment = Math.min(currentStock, currentBacklog);
            currentStock -= fulfillment;
            currentBacklog -= fulfillment;

            // 6. 触发补货判断
            // 有效库存 = 实物库存 + 在途量 - (欠单/积压需求)
            const effectiveStock = currentStock + totalInTransit - currentBacklog;

            let isRestock = false;
            let restockQty = 0;

            if (effectiveStock < targetRopLevel) {
                isRestock = true;

                // --- 逻辑优化：目标水位确保 ---
                // 目标水位：补货点 (ROP) + 30天的预计出库消耗量 (确保能撑到下一个周期)
                // 或者 ROP 的 2 倍，取较大值。
                const targetLevel = Math.max(targetRopLevel * 2, targetRopLevel + (dailySales * 30));

                // 计算需要补多少：目标水位 - 当前有效库存 (实物+在途-欠单)
                let needed = targetLevel - effectiveStock;

                // 最终补货量取 max(所需量, 经济订货量 EOQ)，并向上取整到 100
                restockQty = Math.max(needed, eoq);
                restockQty = Math.ceil(restockQty / 100) * 100;

                const arrivalDateObj = new Date(date);
                arrivalDateObj.setDate(arrivalDateObj.getDate() + currentLeadTime);
                const arrivalDateStr = arrivalDateObj.toISOString().split('T')[0];

                replenishmentInTransit.set(arrivalDateStr, (replenishmentInTransit.get(arrivalDateStr) || 0) + restockQty);
            }

            result.push({
                date: dateStr,
                stock: Math.round(currentStock),
                backlog: Math.round(currentBacklog),
                outbound: Math.round(fulfillment), // 新增：预测出库
                rop: Math.round(targetRopLevel),
                safetyStock: Math.round(dynamicSafetyStock),
                inbound: inboundToday > 0 ? inboundToday : undefined,
                restock: isRestock ? restockQty : undefined,
                dailySales: Math.round(dailySales) // 对应：预测销售
            });
        }
        return result;
    }, [data, editSafetyStock, currentLeadTime, eoq, dayOfWeekFactors, forecastOverrides, calculatedForecasts]);

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">库存趋势模拟</h2>
                    <p className="text-xs text-gray-400 mt-1">综合模拟基于未来预测的库存变化与智能补货点</p>
                </div>
                <div className="flex items-center gap-6 text-xs">
                    {/* Legend */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></div>
                        <span className="text-gray-600">预测实物库存 (左轴)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                        <span className="text-gray-600">预测欠单 (左轴)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-600">ROP (右轴)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-emerald-500 rounded-full"></div>
                        <span className="text-gray-600">安全库存 (右轴)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-gray-600">触发补货</span>
                    </div>
                </div>
            </div>

            <div className="h-[350px] w-full relative">
                {isMounted && (
                    <div className="absolute inset-0">
                        <ResponsiveContainer width="100%" height="100%">
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

                                {/* X轴 */}
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.slice(5)} // MM-DD
                                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                                    minTickGap={40}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />

                                {/* 左Y轴：库存 */}
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#3B82F6' }}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                    label={{ value: '库存数量', angle: -90, position: 'insideLeft', style: { fill: '#94A3B8', fontSize: 10 } }}
                                />

                                {/* 右Y轴：ROP/安全库存 */}
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#F97316' }}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                    label={{ value: '安全库存/ROP', angle: 90, position: 'insideRight', style: { fill: '#94A3B8', fontSize: 10 } }}
                                />

                                <Tooltip content={<CustomTooltip />} />

                                {/* 1. 库存Area (左轴) 改为 linear 以清晰展示每日斜率变化 */}
                                <Area
                                    yAxisId="left"
                                    type="linear"
                                    dataKey="stock"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fill="url(#stockGradient)"
                                    activeDot={{ r: 4, fill: '#fff', stroke: '#3B82F6', strokeWidth: 2 }}
                                />

                                {/* 1.1 欠单Area (左轴) */}
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

                                {/* 2. ROP Line (右轴) */}
                                <Line
                                    yAxisId="right"
                                    type="linear"
                                    dataKey="rop"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    activeDot={false}
                                />

                                {/* 3. 安全库存 Line (右轴) */}
                                <Line
                                    yAxisId="right"
                                    type="linear"
                                    dataKey="safetyStock"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    activeDot={false}
                                />

                                {/* 4. 补货触发点 (Scatter) */}
                                <Scatter
                                    yAxisId="right"
                                    dataKey="restock"
                                    fill="#8B5CF6"
                                    line={false}
                                    shape={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (!payload.restock) return null;
                                        return (
                                            <g>
                                                <circle cx={cx} cy={cy} r={5} fill="#8B5CF6" fillOpacity={0.8} />
                                                <text x={cx} y={cy - 8} textAnchor="middle" fill="#8B5CF6" fontSize={8} fontWeight="bold">
                                                    补
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                {/* 5. 到货点 (Scatter) */}
                                <Scatter
                                    yAxisId="left"
                                    dataKey="inbound"
                                    fill="#6366F1"
                                    line={false}
                                    shape={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (!payload.inbound) return null;
                                        return (
                                            <g>
                                                <circle cx={cx} cy={cy} r={4} fill="#6366F1" stroke="#fff" strokeWidth={1} />
                                                <text x={cx} y={cy - 6} textAnchor="middle" fill="#6366F1" fontSize={8} fontWeight="bold">
                                                    +
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
