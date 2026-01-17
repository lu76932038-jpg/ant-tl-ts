import React from 'react';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ProductDetailData } from '../types';

interface InventorySimChartProps {
    data: ProductDetailData | null;
    editSafetyStock: number;
    currentLeadTime: number;
    eoq: number;
}

const InventorySimChart: React.FC<InventorySimChartProps> = ({
    data,
    editSafetyStock,
    currentLeadTime,
    eoq
}) => {
    // Inventory Curve Simulation Data Generator
    const getSimulationData = () => {
        if (!data) return [];
        const days = 365;
        const result = [];
        const dailySales = data.kpi.sales30Days / 30;
        const safetyStock = Math.round(data.kpi.sales30Days * editSafetyStock);
        const rop = safetyStock + (dailySales * currentLeadTime) - data.kpi.inTransit;

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

        let stock = data.kpi.inStock; // 只算在库，在途会在到货日加入

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // 检查是否有在途货物在今天到达
            const inboundToday = inTransitArrivals.get(dateStr) || 0;
            stock += inboundToday;

            // 消耗
            stock -= dailySales;
            let isRestock = false;

            // Trigger restocking
            // Simple simulation: if stock <= rop, an order is placed.
            // But this is "Arrival" simulation? The original code added EOQ immediately when stock <= rop?
            // "stock += eoq" implies instant replenishment? 
            // Or maybe it assumes perfect planning.
            // Let's stick to the original logic: "stock += eoq; isRestock = true;"
            // Wait, looking at original code (Line 1659): yes, "stock += eoq". 
            // This is a simplified simulation where lead time is effectively 0 for the "calculated" replenishment, 
            // OR it simulates "Projected Inventory" assuming orders arrive exactly when needed?
            // Actually, usually you simulate Order Placement at ROP, and Arrival at ROP + LeadTime.
            // But original code (Line 1660) added it immediately. I will preserve original logic for now 
            // as changing it might confuse the user if they were used to this behavior, or unless it's a bug fix.
            // BUT, if I add it immediately at ROP, it means 0 lead time. 
            // If I look closely at the "inTransitArrivals" logic, that handles REAL incoming.
            // The `stock += eoq` handles FUTURE theoretical incoming.

            if (stock <= rop) {
                stock += eoq;
                isRestock = true;
            }

            result.push({
                date: dateStr,
                stock: Math.max(0, Math.round(stock)),
                rop: Math.round(rop),
                safetyStock: safetyStock,
                isRestock,
                inbound: inboundToday > 0 ? inboundToday : undefined
            });
        }
        return result;
    };

    const simData = getSimulationData();

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">库存趋势模拟</h2>
                    <p className="text-xs text-gray-400 mt-1">综合模拟未来12个月库存变化与补货建议点</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">库存预测</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-600">ROP</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-emerald-500 rounded-full"></div>
                        <span className="text-gray-600">安全库存</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rotate-45"></div>
                        <span className="text-gray-600">在途到货</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={simData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => val.slice(5)} // MM-DD
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            minTickGap={30}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '8px' }}
                            formatter={(value: any, name: string) => {
                                const labels: Record<string, string> = {
                                    stock: '库存预测',
                                    rop: 'ROP',
                                    safetyStock: '安全库存',
                                    inbound: '在途到货'
                                };
                                return [value?.toLocaleString(), labels[name] || name];
                            }}
                        />
                        {/* ROP 参考线 (橙色虚线) */}
                        <ReferenceLine y={data?.kpi ? (data.kpi.sales30Days * editSafetyStock) + ((data.kpi.sales30Days / 30) * currentLeadTime) - data.kpi.inTransit : 0} stroke="#F97316" strokeDasharray="3 3" strokeWidth={1.5} />
                        {/* 安全库存参考线 (绿色虚线) */}
                        <ReferenceLine y={data?.kpi ? Math.round(data.kpi.sales30Days * editSafetyStock) : 0} stroke="#10B981" strokeDasharray="5 5" strokeWidth={1.5} />
                        {/* 库存曲线 */}
                        <Area
                            type="monotone"
                            dataKey="stock"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fill="url(#stockGradient)"
                            activeDot={{ r: 4, fill: '#fff', stroke: '#3B82F6', strokeWidth: 2 }}
                        />
                        {/* 在途到货点标记 */}
                        <Line
                            type="monotone"
                            dataKey="inbound"
                            stroke="none"
                            dot={({ cx, cy, payload }) => {
                                if (!payload?.inbound || payload.inbound === 0) return <></>;
                                return (
                                    <g key={payload.date}>
                                        <circle cx={cx} cy={20} r={6} fill="#6366F1" />
                                        <text x={cx} y={22} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
                                            +
                                        </text>
                                    </g>
                                );
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default InventorySimChart;
