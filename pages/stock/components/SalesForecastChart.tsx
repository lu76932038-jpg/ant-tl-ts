import React, { useState, useEffect } from 'react';
import { Download, Package, ShoppingCart, Truck as TruckIcon, ChevronUp, ChevronDown } from 'lucide-react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import { ChartData } from '../types';

interface SalesForecastChartProps {
    displayData: ChartData[];
    viewDimension: 'month' | 'year';
    setViewDimension: (val: 'month' | 'year') => void;
    onExport: () => void;
    nowLabel: string;
}

// Internal Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentYear = String(now.getFullYear());

        // Determine Time Context
        let timeContext = 'current'; // 'past', 'future', 'current'
        if (label.length === 7) { // Monthly: YYYY-MM
            if (label < currentMonth) timeContext = 'past';
            else if (label > currentMonth) timeContext = 'future';
        } else if (label.length === 4) { // Yearly: YYYY
            if (label < currentYear) timeContext = 'past';
            else if (label > currentYear) timeContext = 'future';
        }

        // Show all payload items regardless of time context to allow comparison
        const filteredPayload = payload;

        if (filteredPayload.length === 0) return null;

        return (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-w-[220px]">
                <p className="font-mono text-[10px] font-black text-gray-400 mb-4 tracking-widest uppercase border-b border-gray-100 pb-3">{label}</p>
                <div className="space-y-3">
                    {filteredPayload.map((p: any) => (
                        <div key={p.name} className="flex items-center gap-4 justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.color || p.fill || p.stroke }} />
                                <span className="text-xs font-bold text-gray-500">{p.name}</span>
                            </div>
                            <span className="font-mono text-xs font-black text-gray-900">
                                {p.dataKey === 'forecastRemainder'
                                    ? (p.payload.forecastQty ? p.payload.forecastQty.toLocaleString() : 0)
                                    : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)
                                }
                                {p.name.includes('金额') && <span className="text-[10px] text-gray-400 ml-1">¥</span>}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const SalesForecastChart: React.FC<SalesForecastChartProps> = ({
    displayData,
    viewDimension,
    setViewDimension,
    onExport,
    nowLabel
}) => {
    const [visibleSeries, setVisibleSeries] = useState({
        qty: true,
        amount: true,
        customers: true
    });

    const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Helper to determine opacity
    const getOpacity = (name: string) => {
        if (!hoveredSeries) return 1;
        return hoveredSeries === name ? 1 : 0.2;
    };

    // ... (rest of component, updating Legend below)


    // Add mount check with delay to ensure flex container has size
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    // 预处理数据：未来日期的实际数据应清空，只保留预测数据
    const processedData = React.useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

        return displayData.map(item => {
            const label = item.month; // YYYY-MM 或 YYYY 格式
            let isFuture = false;

            if (label.length === 7) {
                // 月度格式: YYYY-MM
                isFuture = label > currentYearMonth;
            } else if (label.length === 4) {
                // 年度格式: YYYY
                isFuture = parseInt(label, 10) > currentYear;
            }

            if (isFuture) {
                // 清空未来日期的实际数据
                return {
                    ...item,
                    actualQty: undefined,
                    actualAmount: undefined,
                    actualCustomerCount: undefined
                };
            }

            return item;
        });
    }, [displayData]);


    return (
        <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 ring-1 ring-gray-100/50 p-8 flex flex-col transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${isCollapsed ? 'h-auto' : 'h-[650px]'}`}>
            <div className={`flex flex-col gap-6 ${isCollapsed ? '' : 'mb-8'}`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">销售与预测分析</h2>
                        </div>
                        {!isCollapsed && <p className="text-xs font-medium text-gray-400 max-w-md leading-relaxed">基于历史销售数据的智能预测分析与库存模拟</p>}
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/50">
                        {/* Dimension Toggle */}
                        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-100">
                            <button
                                onClick={() => setViewDimension('month')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${viewDimension === 'month' ? 'bg-gray-900 text-white shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                月度
                            </button>
                            <button
                                onClick={() => setViewDimension('year')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${viewDimension === 'year' ? 'bg-gray-900 text-white shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                年度
                            </button>
                        </div>

                        <div className="w-px h-4 bg-gray-200"></div>

                        {/* Collapse Button */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all active:scale-95 border border-transparent hover:border-gray-200 hover:shadow-sm"
                            title={isCollapsed ? "展开" : "折叠"}
                        >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>
                </div>

                {/* Data Series Toggles REMOVED per Task 50 request */}
            </div>

            {!isCollapsed && (
                <div className="flex-1 w-full min-h-0 relative animate-in fade-in zoom-in-95 duration-500">
                    {isMounted && (
                        <div className="absolute inset-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={processedData} margin={{ top: 40, right: 20, left: 40, bottom: 0 }}>
                                    <defs>
                                        {/* Actual Quantity Gradient */}
                                        <linearGradient id="qtyGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={1} />
                                        </linearGradient>
                                        {/* Forecast Quantity Pattern - Striped */}
                                        <pattern id="forecastPattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                            <rect width="4" height="8" transform="translate(0,0)" fill="#93C5FD" opacity="0.4" />
                                        </pattern>
                                        {/* Shadow for Amount Line */}
                                        <filter id="shadowAmount" height="200%">
                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.3" />
                                        </filter>
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />

                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                                        dy={15}
                                    />

                                    {/* Y Axis 1: Quantity (Left) */}
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        domain={[0, 'auto']}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94A3B8' }}
                                        tickFormatter={(val) => {
                                            if (val >= 10000) {
                                                const formatted = (val / 1000).toFixed(1).replace(/\.0$/, '');
                                                return `${formatted}k`;
                                            }
                                            return val.toLocaleString();
                                        }}
                                        width={60}
                                        tickMargin={5}
                                    />

                                    {/* Y Axis 2: Amount (Right) - Hidden line, just labels */}
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={[0, 'auto']}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#10B981' }}
                                        tickFormatter={(val) => {
                                            if (val >= 10000) {
                                                const formatted = (val / 10000).toFixed(1).replace(/\.0$/, '');
                                                return `${formatted}w`;
                                            }
                                            return val.toLocaleString();
                                        }}
                                        width={70}
                                        tickMargin={5}
                                    />

                                    {/* Y Axis 3: Customers (Hidden) */}
                                    <YAxis yAxisId="customers" orientation="left" hide domain={['auto', 'auto']} />

                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC', opacity: 0.8 }}
                                        content={<CustomTooltip />}
                                    />

                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            paddingBottom: '10px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                            const { dataKey } = e as any;
                                            // Mapping dataKey to series key
                                            let key: keyof typeof visibleSeries | null = null;
                                            if (dataKey === 'actualQty' || dataKey === 'forecastRemainder') key = 'qty';
                                            if (dataKey === 'actualAmount' || dataKey === 'forecastAmount') key = 'amount';
                                            if (dataKey === 'actualCustomerCount' || dataKey === 'forecastCustomerCount') key = 'customers';

                                            if (key) {
                                                setVisibleSeries(prev => ({ ...prev, [key!]: !prev[key!] }));
                                            }
                                        }}
                                        onMouseEnter={(e) => setHoveredSeries(e.value)}
                                        onMouseLeave={() => setHoveredSeries(null)}
                                    />

                                    {/* Brush for Zooming - Styled */}
                                    {viewDimension === 'month' && (
                                        <Brush
                                            dataKey="month"
                                            height={12}
                                            stroke="none"
                                            fill="#F1F5F9"
                                            travellerWidth={6}
                                            tickFormatter={() => ''}
                                            y={620}
                                        />
                                    )}

                                    {/* Series: Qty (Stacked Bar) */}
                                    <Bar
                                        stackId="qty"
                                        yAxisId="left"
                                        dataKey="actualQty"
                                        name="实际销售数量"
                                        fill="url(#qtyGradient)"
                                        barSize={28}
                                        radius={[4, 4, 4, 4]}
                                        animationDuration={1500}
                                        hide={!visibleSeries.qty}
                                        opacity={getOpacity('实际销售数量')}
                                    />
                                    <Bar
                                        stackId="qty"
                                        yAxisId="left"
                                        dataKey="forecastRemainder"
                                        name="预测销售数量"
                                        fill="url(#forecastPattern)"
                                        barSize={28}
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                        hide={!visibleSeries.qty}
                                        opacity={getOpacity('预测销售数量')}
                                    />

                                    {/* Series: Amount (Line) */}
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="actualAmount"
                                        name="实际销售金额"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
                                        filter="url(#shadowAmount)"
                                        hide={!visibleSeries.amount}
                                        strokeOpacity={getOpacity('实际销售金额')}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="forecastAmount"
                                        name="预测销售金额"
                                        stroke="#10B981"
                                        strokeDasharray="4 4"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }}
                                        hide={!visibleSeries.amount}
                                        strokeOpacity={0.6 * getOpacity('预测销售金额')}
                                    />

                                    {/* Series: Customers (Line/Scatter) */}
                                    <Line
                                        yAxisId="customers"
                                        type="monotone"
                                        dataKey="actualCustomerCount"
                                        name="实际客户数量"
                                        stroke="#F97316"
                                        strokeWidth={2}
                                        dot={(props: any) => {
                                            const { cx, cy, payload } = props;
                                            if (!payload.actualCustomerCount || payload.actualCustomerCount === 0) return null;
                                            return (
                                                <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#F97316" strokeWidth={2} opacity={getOpacity('实际客户数量')} />
                                            );
                                        }}
                                        hide={!visibleSeries.customers}
                                        strokeOpacity={getOpacity('实际客户数量')}
                                    />
                                    <Line
                                        yAxisId="customers"
                                        type="monotone"
                                        dataKey="forecastCustomerCount"
                                        name="预测客户数量"
                                        stroke="#F97316"
                                        strokeDasharray="3 3"
                                        strokeWidth={1.5}
                                        dot={false}
                                        hide={!visibleSeries.customers}
                                        strokeOpacity={0.7 * getOpacity('预测客户数量')}
                                    />

                                    {/* Reference Line for 'Now' */}
                                    {nowLabel && (
                                        <ReferenceLine
                                            yAxisId="left"
                                            x={nowLabel.slice(2)}
                                            stroke="#64748B"
                                            strokeDasharray="2 2"
                                            label={{
                                                position: 'top',
                                                value: '当前',
                                                fill: '#64748B',
                                                fontSize: 9,
                                                fontWeight: 'bold',
                                                className: 'tracking-widest'
                                            }}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SalesForecastChart;
