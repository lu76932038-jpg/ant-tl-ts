import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Package, Truck, ShoppingCart, AlertTriangle,
    Bell, Settings, History, Truck as TruckIcon, CheckCircle,
    Loader2, RefreshCw, Download, Layers, Clock, Copy, Timer, Hourglass, Calendar, MoreHorizontal, ChevronDown
} from 'lucide-react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, Brush
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import MultiThumbSlider from '../../components/MultiThumbSlider';



// --- Interfaces ---
interface KPI {
    // ... unchanged
    inStock: number;
    inTransit: number;
    sales30Days: number;
    turnoverDays: number;
    stockoutRisk: string;
    inTransitBatches?: {
        id: string;
        arrival_date: string;
        quantity: number;
        isOverdue: boolean;
        overdueDays: number;
    }[];
}
interface ChartData {
    month: string;
    fullDate: string;
    type: string;
    actualQty?: number;
    actualAmount?: number;
    actualCustomerCount?: number;
    forecastQty?: number;
    forecastAmount?: number;
    forecastCustomerCount?: number;
    inbound?: number;
    outbound?: number;
    simStock: number;
    simRop: number;
    simSafety: number;
}

interface StrategyConfig {
    safety_stock_days: number;
    rop: number;
    eoq: number;
    start_year_month?: string; // e.g. "2025-01"
    forecast_year_month?: string; // e.g. "2026-12"
}

interface SupplierInfo {
    name: string;
    code: string;
    rating: number;
    price: number;
}

interface AuditLog {
    id: string | number;
    action_type: string;
    content: string;
    created_at: string;
    status: string;
}

interface ProductDetailData {
    basic: {
        sku: string;
        name: string;
        status: string;
    };
    kpi: KPI;
    charts: ChartData[];
}

// --- Component ---
const ProductDetail: React.FC = () => {
    // ... hooks logic unchanged
    const { sku } = useParams<{ sku: string }>();
    const [data, setData] = useState<ProductDetailData | null>(null);
    const [strategy, setStrategy] = useState<StrategyConfig | null>(null);
    const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI States
    const [activeTab, setActiveTab] = useState('overview'); // overview, logs
    const [editSafetyStock, setEditSafetyStock] = useState<number>(0.6);
    const [selectedStartMonth, setSelectedStartMonth] = useState<string>(''); // For Start Year-Month
    const [selectedForecastMonth, setSelectedForecastMonth] = useState<string>(''); // For Forecast Year-Month
    const [replenishmentMode, setReplenishmentMode] = useState<'fast' | 'economic'>('economic');
    const [isForecastTableOpen, setIsForecastTableOpen] = useState(false);

    // Tooltip States
    const [hoveredTurnover, setHoveredTurnover] = useState(false);
    const [hoveredTransit, setHoveredTransit] = useState(false);
    const [hoveredMom, setHoveredMom] = useState(false);
    const [isAIAnalyzing, setIsAIAnalyzing] = useState(false); // AI 状态
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);   // AI 弹窗
    const [aiReport, setAiReport] = useState<string>('');       // AI 报告内容

    // Supplier Editor State
    const [isEditingSupplier, setIsEditingSupplier] = useState(false);
    const [editSupplierInfo, setEditSupplierInfo] = useState<SupplierInfo | null>(null);
    const [isCreatingPO, setIsCreatingPO] = useState(false);

    // Helper to calculate date range
    const getForecastDateRange = (months: number) => {
        const start = new Date();
        const end = new Date();
        end.setMonth(end.getMonth() + months);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    };

    const currentLeadTime = replenishmentMode === 'fast' ? 7 : 30;

    // New States for Chart
    const [viewDimension, setViewDimension] = useState<'month' | 'year'>('month');
    const [visibleSeries, setVisibleSeries] = useState({
        qty: true,
        amount: true,
        customers: true
    });

    // Forecast Benchmark Config
    const [benchmarkType, setBenchmarkType] = useState<'mom' | 'yoy'>('mom');

    // MoM (Moving Average)
    const [momRange, setMomRange] = useState<3 | 6 | 12>(6);
    const [momTimeSliders, setMomTimeSliders] = useState<number[]>([33, 66]);
    const [momWeightSliders, setMomWeightSliders] = useState<number[]>([60, 90]);

    // YoY (Year-on-Year)
    const [yoyRange, setYoyRange] = useState<1 | 2 | 3>(3);
    const [yoyWeightSliders, setYoyWeightSliders] = useState<number[]>([33, 66]);

    // Forecast Adjustment
    const [forecastOverrides, setForecastOverrides] = useState<Record<string, number>>({});
    const [calculatedForecasts, setCalculatedForecasts] = useState<Record<string, number>>({});
    const [ratioAdjustment, setRatioAdjustment] = useState<number>(0);

    // Calculate forecast month options
    const currentYear = new Date().getFullYear();
    // Start Options: 3 Years Back
    const startOptions = [
        `${currentYear - 3}-01`,
        `${currentYear - 2}-01`,
        `${currentYear - 1}-01`
    ];
    // End Options: Dec of this year, next year, year after next
    const forecastOptions = [
        `${currentYear}-12`,
        `${currentYear + 1}-12`,
        `${currentYear + 2}-12`
    ];

    useEffect(() => {
        if (sku) {
            fetchProductDetail();
            fetchStrategy();
            fetchLogs();
        }
    }, [sku]);

    // ... fetch functions unchanged ...

    const fetchProductDetail = async () => {
        try {
            const response = await fetch(`/api/products/${sku}/detail`);
            if (!response.ok) throw new Error('Product not found');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Failed to fetch details', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStrategy = async () => {
        try {
            const response = await fetch(`/api/products/${sku}/strategy`);
            const result = await response.json();
            setStrategy(result.strategy);
            setSupplier(result.supplier);
            setEditSupplierInfo(result.supplier);
            setEditSafetyStock(result.strategy.safety_stock_days);

            // Populate Forecast States
            if (result.strategy.benchmark_type) setBenchmarkType(result.strategy.benchmark_type as any);
            if (result.strategy.mom_range) setMomRange(result.strategy.mom_range as any);
            if (result.strategy.mom_time_sliders) setMomTimeSliders(typeof result.strategy.mom_time_sliders === 'string' ? JSON.parse(result.strategy.mom_time_sliders) : result.strategy.mom_time_sliders);
            if (result.strategy.mom_weight_sliders) setMomWeightSliders(typeof result.strategy.mom_weight_sliders === 'string' ? JSON.parse(result.strategy.mom_weight_sliders) : result.strategy.mom_weight_sliders);
            if (result.strategy.yoy_range) setYoyRange(result.strategy.yoy_range as any);
            if (result.strategy.yoy_weight_sliders) setYoyWeightSliders(typeof result.strategy.yoy_weight_sliders === 'string' ? JSON.parse(result.strategy.yoy_weight_sliders) : result.strategy.yoy_weight_sliders);

            if (result.strategy.ratio_adjustment) setRatioAdjustment(Number(result.strategy.ratio_adjustment));
            if (result.strategy.forecast_overrides) setForecastOverrides(typeof result.strategy.forecast_overrides === 'string' ? JSON.parse(result.strategy.forecast_overrides) : result.strategy.forecast_overrides);
            if (result.strategy.calculated_forecasts) setCalculatedForecasts(typeof result.strategy.calculated_forecasts === 'string' ? JSON.parse(result.strategy.calculated_forecasts) : result.strategy.calculated_forecasts);

            const currentYear = new Date().getFullYear();
            // Default Start: Last Year Jan
            setSelectedStartMonth(result.strategy.start_year_month || `${currentYear - 1}-01`);
            // Default End: Current Year Dec
            setSelectedForecastMonth(result.strategy.forecast_year_month || `${currentYear}-12`);
        } catch (error) {
            console.error('Failed to fetch strategy', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await fetch(`/api/products/${sku}/logs`);
            const result = await response.json();
            setLogs(result);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    };

    const handleSaveStrategy = async () => {
        if (!strategy) return;
        setIsSaving(true);
        try {
            const response = await fetch(`/api/products/${sku}/strategy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...strategy,
                    start_year_month: selectedStartMonth,
                    forecast_year_month: selectedForecastMonth,
                    safety_stock_days: editSafetyStock,
                    benchmark_type: benchmarkType,
                    mom_range: momRange,
                    mom_time_sliders: momTimeSliders,
                    mom_weight_sliders: momWeightSliders,
                    yoy_range: yoyRange,
                    yoy_weight_sliders: yoyWeightSliders,
                    ratio_adjustment: ratioAdjustment,
                    forecast_overrides: forecastOverrides,
                    calculated_forecasts: calculatedForecasts,
                    supplier_info: editSupplierInfo,
                    log_content: `更新库存策略配置: 安全库存 ${editSafetyStock} 个月, 补货模式: ${replenishmentMode === 'fast' ? '快速补货' : '经济补货'}`
                })
            });
            const result = await response.json();
            if (response.ok) {
                // Refresh data
                setStrategy(result.strategy);
                fetchLogs(); // Refresh logs to show auto-approval
                alert('策略更新成功！(系统自动审批通过)');
            } else {
                alert('保存失败');
            }
        } catch (error) {
            console.error('Save failed', error);
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = () => {
        if (!displayData || displayData.length === 0) {
            alert('暂无数据可导出');
            return;
        }

        // 1. Prepare Month Data
        const monthSheetData = displayData.map(d => ({
            '年月': d.month,
            '实际数量': d.actualQty || 0,
            '预测数量': d.forecastQty || 0,
            '实际金额': d.actualAmount || 0,
            '预测金额': d.forecastAmount || 0,
            '实际客户数': d.actualCustomerCount || 0,
            '预测客户数': d.forecastCustomerCount || 0
        }));

        // 2. Prepare Day Data (Placeholder as specific daily data is not available in current aggregation)
        // User requested "Day" sheet, potentially implying daily breakdown if available.
        // Since we only have monthly data in this view, we create headers or an empty instruction.
        // Or if 'displayData' represents filtered days (if logic supported it), we'd use that.
        // Assuming current data is the best source:
        const daySheetData = [{ '提示': '当前视图仅包含月度汇总数据，每日明细请参考出库清单。' }];

        // 3. Create Workbook
        const replaceNull = (val: any) => val === undefined || val === null ? '' : val;
        const wb = XLSX.utils.book_new();

        const wsMonth = XLSX.utils.json_to_sheet(monthSheetData);
        XLSX.utils.book_append_sheet(wb, wsMonth, "月");

        const wsDay = XLSX.utils.json_to_sheet(daySheetData);
        XLSX.utils.book_append_sheet(wb, wsDay, "日");

        // 4. Save
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `销售预测_${sku}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (isLoading) return <div className="flex h-full items-center justify-center bg-[#f5f5f7] text-gray-500">加载中...</div>;
    if (!data) return <div className="flex h-full items-center justify-center bg-[#f5f5f7] text-gray-500">未找到产品数据</div>;

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

            // Filter Payload based on Context
            const filteredPayload = payload.filter((p: any) => {
                const name = p.name;
                if (timeContext === 'past') return name.includes('实际');
                if (timeContext === 'future') return name.includes('预测');
                return true; // Current: Show Both
            });

            if (filteredPayload.length === 0) return null;

            return (
                <div className="bg-white/95 backdrop-blur-2xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[200px]">
                    <p className="font-mono text-xs font-bold text-gray-400 mb-3 tracking-wider uppercase border-b border-gray-100 pb-2">{label}</p>
                    <div className="space-y-2">
                        {filteredPayload.map((p: any) => (
                            <div key={p.name} className="flex items-center gap-3 justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: p.color || p.fill }} />
                                    <span className="text-[11px] font-medium text-gray-500">{p.name}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-gray-700">
                                    {p.dataKey === 'forecastRemainder'
                                        ? (p.payload.forecastQty ? p.payload.forecastQty.toLocaleString() : 0)
                                        : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)
                                    }
                                    {p.name.includes('金额') && <span className="text-[9px] text-gray-400 ml-0.5">¥</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    // Data Aggregation Helper
    const getChartData = () => {
        if (!data) return [];

        // Calculate averages for fallback (Price & Customer Ratio)
        let totalQty = 0, totalAmount = 0, totalCustomers = 0;
        data.charts.forEach(c => {
            if (c.actualQty > 0) {
                totalQty += c.actualQty;
                totalAmount += (c.actualAmount || 0);
                totalCustomers += (c.actualCustomerCount || 0);
            }
        });
        const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0;
        const avgCustomerRatio = totalQty > 0 ? totalCustomers / totalQty : 0;

        // 1. Generate Complete Date Range List
        let allMonths: string[] = [];
        if (selectedStartMonth && selectedForecastMonth) {
            const [sY, sM] = selectedStartMonth.split('-').map(Number);
            const [eY, eM] = selectedForecastMonth.split('-').map(Number);
            let cur = new Date(sY, sM - 1, 1);
            const end = new Date(eY, eM - 1, 1);
            while (cur <= end) {
                const y = cur.getFullYear();
                const m = cur.getMonth() + 1;
                allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
                cur.setMonth(cur.getMonth() + 1);
            }
        } else {
            // Fallback to existing data's months if selection is invalid
            allMonths = data.charts.map(c => c.month);
        }

        // 2. Map Range to Data (Filling Gaps)
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let chartData = allMonths.map(monthKey => {
            // Find existing data
            let d = data.charts.find(c => c.month === monthKey);

            // If missing, create default structure
            if (!d) {
                const [y, m] = monthKey.split('-');
                d = {
                    month: monthKey,
                    fullDate: `${y}年${parseInt(m)}月`,
                    type: 'future', // Default to future for missing tail data
                    actualQty: 0, actualAmount: 0, actualCustomerCount: 0,
                    forecastQty: 0, forecastAmount: 0, forecastCustomerCount: 0,
                    inbound: 0, outbound: 0, simStock: 0, simRop: 0, simSafety: 0
                };
            }

            // Calculation Logic (Same as before)
            // Priority: Manual Override > Calculated > Backend Default
            const manual = forecastOverrides[d.month];
            const calc = calculatedForecasts[d.month];

            // Base forecast qty
            let baseForecast = d.forecastQty || 0;
            if (manual !== undefined && manual > 0) {
                baseForecast = manual;
            } else if (calc !== undefined && calc > 0) {
                baseForecast = calc;
            }

            // Apply Ratio Adjustment (14: Integer Result)
            if (ratioAdjustment !== 0 && (d.type === 'future' || (forecastOverrides[d.month] || calculatedForecasts[d.month]))) {
                baseForecast = Math.round(baseForecast * (1 + ratioAdjustment / 100));
            }

            // Price estimation with fallback
            let price = (baseForecast > 0 && d.forecastAmount)
                ? d.forecastAmount / baseForecast
                : (d.actualAmount && d.actualQty ? d.actualAmount / d.actualQty : avgPrice);
            if (price === 0) price = avgPrice;

            // Customer Ratio estimation with fallback
            let custRatio = (baseForecast > 0 && d.forecastCustomerCount)
                ? d.forecastCustomerCount / baseForecast
                : (d.actualCustomerCount && d.actualQty ? d.actualCustomerCount / d.actualQty : avgCustomerRatio);
            if (custRatio === 0) custRatio = avgCustomerRatio;

            // Logic: Display Forecast = Max(Actual, BaseForecast)
            // Implemented via Stacked Bars:
            // Bar 1 (Bottom): ActualQty
            // Bar 2 (Top): ForecastRemainder = Max(0, BaseForecast - ActualQty)
            const actual = d.actualQty || 0;
            const remainder = Math.max(0, baseForecast - actual);

            // Recalculate forecast amount
            const finalForecastQty = actual + remainder;
            const useOriginalAmount = d.forecastAmount && d.forecastAmount > 0 && baseForecast === d.forecastQty;
            const finalForecastAmount = useOriginalAmount
                ? d.forecastAmount
                : Math.round(finalForecastQty * price);

            // Recalculate forecast customers
            const useOriginalCust = d.forecastCustomerCount && d.forecastCustomerCount > 0 && baseForecast === d.forecastQty;
            const finalForecastCustomerCount = useOriginalCust
                ? d.forecastCustomerCount
                : Math.round(finalForecastQty * custRatio);

            // Determine if strictly future
            const isStrictlyFuture = monthKey > currentMonthKey;

            return {
                ...d,
                forecastQty: finalForecastQty, // Total height for reference
                forecastRemainder: remainder, // The part to stack on top of actual
                forecastAmount: finalForecastAmount,
                forecastCustomerCount: finalForecastCustomerCount,
                actualQty: actual,
                // If strictly future, force actuals to null so lines break instead of drop to 0
                actualAmount: isStrictlyFuture ? null : d.actualAmount,
                actualCustomerCount: isStrictlyFuture ? null : d.actualCustomerCount
            };
        });

        if (viewDimension === 'year') {
            const yearMap = new Map<string, any>();
            chartData.forEach(d => {
                const year = d.month.split('-')[0];
                if (!yearMap.has(year)) {
                    yearMap.set(year, {
                        month: year,
                        fullDate: year + '年',
                        type: d.type,
                        actualQty: 0, actualAmount: 0, actualCustomerCount: 0,
                        forecastQty: 0, forecastRemainder: 0, forecastAmount: 0, forecastCustomerCount: 0,
                        inbound: 0, simStock: 0, count: 0
                    });
                }
                const y = yearMap.get(year);
                y.actualQty += (d.actualQty || 0);
                y.actualAmount += (d.actualAmount || 0);
                y.actualCustomerCount += (d.actualCustomerCount || 0);
                y.forecastQty += (d.forecastQty || 0);
                y.forecastRemainder += (d.forecastRemainder || 0);
                y.forecastAmount += (d.forecastAmount || 0);
                y.forecastCustomerCount += (d.forecastCustomerCount || 0);
                y.inbound += (d.inbound || 0);
                y.simStock += d.simStock;
                y.count++;
            });
            return Array.from(yearMap.values()).map(y => ({
                ...y,
                simStock: Math.round(y.simStock / y.count),
                simRop: 0, simSafety: 0
            }));
        }
        return chartData;
    };

    const displayData = getChartData();
    const nowIndex = displayData.findIndex(c => c.type === 'future');
    const nowLabel = nowIndex !== -1 ? data.charts[nowIndex].fullDate : '';

    // Forecast Grid Helper
    const getForecastMonths = () => {
        if (!selectedForecastMonth) return {};
        const months: { year: number, month: number, key: string }[] = [];
        const now = new Date();
        let current = new Date(now.getFullYear(), now.getMonth(), 1);
        const [endY, endM] = selectedForecastMonth.split('-').map(Number);
        const end = new Date(endY, endM - 1, 1);

        while (current <= end) {
            months.push({
                year: current.getFullYear(),
                month: current.getMonth() + 1,
                key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
            });
            current.setMonth(current.getMonth() + 1);
        }

        // Group by year
        const grouped: Record<number, typeof months> = {};
        months.forEach(m => {
            if (!grouped[m.year]) grouped[m.year] = [];
            grouped[m.year].push(m);
        });
        return grouped;
    };
    const forecastGrid = getForecastMonths();

    // Calculation Logic
    const handleRunForecast = () => {
        if (!data) return;
        const newCalculated: Record<string, number> = {};
        const forecastMonthsList = getForecastMonths(); // Grouped by year
        const flatForecastMonths = Object.values(forecastMonthsList).flat();

        // Helper to get history value
        const getHistoryValue = (monthKey: string) => {
            const found = data.charts.find(c => c.month === monthKey);
            return found ? (found.actualQty || 0) : 0; // Using actual for history
        };

        flatForecastMonths.forEach(target => {
            let prediction = 0;
            const targetDate = new Date(target.year, target.month - 1, 1);

            if (benchmarkType === 'yoy') {
                // YoY Logic
                if (yoyRange === 1) {
                    const lastYear = new Date(targetDate);
                    lastYear.setFullYear(lastYear.getFullYear() - 1);
                    prediction = getHistoryValue(`${lastYear.getFullYear()}-${String(lastYear.getMonth() + 1).padStart(2, '0')}`);
                } else if (yoyRange === 2) {
                    const w1 = yoyWeightSliders[0] / 100;
                    const w2 = 1 - w1;
                    const y1 = new Date(targetDate); y1.setFullYear(y1.getFullYear() - 1);
                    const y2 = new Date(targetDate); y2.setFullYear(y2.getFullYear() - 2);
                    const v1 = getHistoryValue(`${y1.getFullYear()}-${String(y1.getMonth() + 1).padStart(2, '0')}`);
                    const v2 = getHistoryValue(`${y2.getFullYear()}-${String(y2.getMonth() + 1).padStart(2, '0')}`);
                    prediction = v1 * w1 + v2 * w2;
                } else {
                    const w1 = yoyWeightSliders[0] / 100;
                    const w2 = (yoyWeightSliders[1] - yoyWeightSliders[0]) / 100;
                    const w3 = (100 - yoyWeightSliders[1]) / 100;
                    const y1 = new Date(targetDate); y1.setFullYear(y1.getFullYear() - 1);
                    const y2 = new Date(targetDate); y2.setFullYear(y2.getFullYear() - 2);
                    const y3 = new Date(targetDate); y3.setFullYear(y3.getFullYear() - 3);
                    prediction = getHistoryValue(`${y1.getFullYear()}-${String(y1.getMonth() + 1).padStart(2, '0')}`) * w1 +
                        getHistoryValue(`${y2.getFullYear()}-${String(y2.getMonth() + 1).padStart(2, '0')}`) * w2 +
                        getHistoryValue(`${y3.getFullYear()}-${String(y3.getMonth() + 1).padStart(2, '0')}`) * w3;
                }
            } else {
                // MoM Logic
                const range = momRange;
                const split1 = Math.round(range * (momTimeSliders[0] / 100));
                const split2 = Math.round(range * (momTimeSliders[1] / 100));

                const weight1 = momWeightSliders[0] / 100;
                const weight2 = (momWeightSliders[1] - momWeightSliders[0]) / 100;
                const weight3 = (100 - momWeightSliders[1]) / 100;

                const historyValues: number[] = [];
                for (let i = 1; i <= range; i++) {
                    const d = new Date(nowIndex !== -1 ? new Date() : new Date());
                    d.setMonth(d.getMonth() - i);
                    historyValues.push(getHistoryValue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
                }

                const getAvg = (start: number, end: number) => {
                    const slice = historyValues.slice(start, end);
                    if (slice.length === 0) return 0;
                    return slice.reduce((a, b) => a + b, 0) / slice.length;
                };

                const avg1 = getAvg(0, split1);
                const avg2 = getAvg(split1, split2);
                const avg3 = getAvg(split2, range);

                let totalWeight = 0;
                let val = 0;
                if (split1 > 0) { val += avg1 * weight1; totalWeight += weight1; }
                if (split2 > split1) { val += avg2 * weight2; totalWeight += weight2; }
                if (range > split2) { val += avg3 * weight3; totalWeight += weight3; }

                prediction = totalWeight > 0 ? val / totalWeight : 0;
            }

            newCalculated[target.key] = Math.round(prediction);
        });

        // Save Configuration and Results to Backend
        // We use newCalculated directly to ensure we save the latest data
        setIsSaving(true);
        fetch(`/api/products/${sku}/strategy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...strategy,
                start_year_month: selectedStartMonth,
                forecast_year_month: selectedForecastMonth,
                safety_stock_days: editSafetyStock,
                benchmark_type: benchmarkType,
                mom_range: momRange,
                mom_time_sliders: momTimeSliders,
                mom_weight_sliders: momWeightSliders,
                yoy_range: yoyRange,
                yoy_weight_sliders: yoyWeightSliders,
                ratio_adjustment: ratioAdjustment,
                forecast_overrides: forecastOverrides, // Current overrides
                calculated_forecasts: newCalculated    // Newly calculated
            })
        }).then(async (res) => {
            if (res.ok) {
                const result = await res.json();
                setStrategy(result.strategy);
                fetchLogs();
            }
        }).finally(() => setIsSaving(false));

        setCalculatedForecasts(newCalculated);
    };

    const handleCreatePO = async () => {
        if (!data || !strategy) return;
        if (!confirm('确定要根据当期建议生成采购单吗？')) return;

        setIsCreatingPO(true);
        try {
            const qty = strategy.eoq || 0;
            const supplierName = editSupplierInfo?.name || '未知供应商';

            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: data.basic.sku,
                    product_name: data.basic.name,
                    quantity: qty,
                    order_date: new Date().toISOString().split('T')[0],
                    supplier_info: JSON.stringify(editSupplierInfo || {}),
                    status: 'DRAFT',
                    log_content: `生成采购单: 建议补货数量 ${qty.toLocaleString()} 件, 供应商: ${supplierName}`
                })
            });

            if (response.ok) {
                alert('采购单草稿生成成功！请前往采购管理查看。');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}`;
                alert(`采购单生成失败：${errorMsg}`);
            }
        } catch (e) {
            console.error(e);
            alert(`采购单生成错误：${e instanceof Error ? e.message : '网络连接失败，请检查网络后重试'}`);
        } finally {
            setIsCreatingPO(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7] print:h-auto print:overflow-visible">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; background: white !important; font-size: 10pt; }
                    .print\\:hidden, button, .recharts-brush { display: none !important; }
                    /* Reset layouts */
                    .grid, .grid-cols-4, .grid-cols-12 { 
                        display: flex !important; 
                        flex-direction: column !important; 
                        gap: 20px !important; 
                        grid-template-columns: none !important;
                    }
                    .col-span-4, .col-span-8 { width: 100% !important; margin: 0 !important; }
                    .max-w-[1440px] { max-width: 100% !important; padding: 0 !important; }
                    
                    /* Simplify styles for report look */
                    .bg-white, .bg-white\\/80, [class*="bg-gradient-to"] { 
                        background: white !important; 
                        border: 1px solid #eee !important;
                        box-shadow: none !important;
                        border-radius: 8px !important;
                    }
                    .shadow-[0_2px_8px_rgba(0,0,0,0.04)], .ring-1, .shadow-sm { 
                        box-shadow: none !important; 
                        ring: none !important;
                        border: 1px solid #eee !important;
                    }

                    /* Content visibility */
                    .max-h-0 { max-height: none !important; opacity: 1 !important; visibility: visible !important; margin-top: 10px !important; }
                    .recharts-responsive-container { width: 100% !important; height: 350px !important; min-height: 350px !important; }
                    
                    /* Typography & Tables */
                    h1 { font-size: 24pt !important; margin-bottom: 30px !important; text-align: center !important; }
                    h2 { font-size: 16pt !important; border-left: 4px solid #000; padding-left: 10px; margin-bottom: 15px !important; }
                    table { font-size: 9pt !important; border-collapse: collapse !important; width: 100% !important; margin-bottom: 20px !important; }
                    th, td { border: 1px solid #ddd !important; padding: 6px 4px !important; text-align: center !important; }
                    th { background-color: #f9fafb !important; }
                    .text-4xl { font-size: 20pt !important; font-weight: bold !important; }
                    
                    /* Specific blocks */
                    .recharts-responsive-container { page-break-inside: avoid !important; margin: 20px 0 !important; }
                    .page-break { page-break-before: always; }
                    
                    /* Clean up spacing */
                    .space-y-8 > * + * { margin-top: 2rem !important; }
                    .p-8, .p-6 { padding: 1.5rem !important; }
                    .mx-auto { margin-left: 0 !important; margin-right: 0 !important; width: 100% !important; }
                }
            `}</style>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shrink-0 print:relative print:border-none">
                {/* Header Content... */}
                <div className="max-w-[1440px] mx-auto px-8 h-[72px] flex items-center justify-between">
                    {/* ... Unchanged Header content but removed fixed positioning context issues ... */}
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">产品备货配置</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-900 font-bold">{data.basic.name}</span>
                            <span className="text-gray-500 font-mono tracking-wide">{data.basic.sku}</span>
                            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium 
                                    ${data.basic.status === '健康' || data.basic.status === '正常在售' ? 'bg-green-100 text-green-700' :
                                    data.basic.status === '急需补货' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full 
                                        ${data.basic.status === '健康' || data.basic.status === '正常在售' ? 'bg-green-500' :
                                        data.basic.status === '急需补货' ? 'bg-red-500' : 'bg-gray-500'}`} />
                                {data.basic.status}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-gray-200 print:hidden"></div>
                        <button
                            onClick={() => window.print()}
                            className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm active:scale-95 transform duration-100 print:hidden"
                        >
                            导出 PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible">
                <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-8">
                    {/* KPI Cards */}
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
                                            <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 shadow-2xl rounded-xl z-50 w-64 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ring-1 ring-black/5 origin-bottom-left">
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
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-0 bg-white border border-gray-200 shadow-xl rounded-xl z-50 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                            const next = data.kpi.inTransitBatches.sort((a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime())[0];
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

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-12 gap-10 items-start">

                        {/* Left Column: Configuration (4 cols) - Sticky */}
                        <div className="col-span-4 space-y-6 sticky top-[100px] self-start">

                            {/* 0. Sales Forecast Config */}
                            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                                        <MoreHorizontal className="text-gray-400 rotate-90" size={20} />
                                        销售预测配置
                                    </div>
                                    <button
                                        onClick={handleRunForecast}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                                        更新销售预测配置
                                    </button>
                                </div>

                                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Period Selection (Row Layout) */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-gray-400 px-1">
                                            <span>起始年月</span>
                                            <span>截至年月</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedStartMonth}
                                                onChange={e => setSelectedStartMonth(e.target.value)}
                                                className="flex-1 bg-gray-100 border-none rounded-lg text-sm font-semibold py-2 px-3 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                                            >
                                                {startOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <span className="text-gray-300">-</span>
                                            <select
                                                value={selectedForecastMonth}
                                                onChange={e => setSelectedForecastMonth(e.target.value)}
                                                className="flex-1 bg-gray-100 border-none rounded-lg text-sm font-semibold py-2 px-3 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                                            >
                                                {forecastOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-50">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-900">数据预测基准</label>
                                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => setBenchmarkType('mom')}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${benchmarkType === 'mom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                                    >环比</button>
                                                    <button
                                                        onClick={() => setBenchmarkType('yoy')}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${benchmarkType === 'yoy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                                    >同比</button>
                                                </div>
                                            </div>

                                            {/* Ratio Adjustment */}
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-gray-600">比率调整 (Ratio)</label>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={ratioAdjustment}
                                                        onChange={(e) => setRatioAdjustment(Math.round(Number(e.target.value)))}
                                                        className="w-16 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-right font-mono focus:border-blue-500 outline-none"
                                                        placeholder="0"
                                                    />
                                                    <span className="text-xs text-gray-400 font-bold">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {benchmarkType === 'mom' ? (
                                            /* MoM Config */
                                            <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Range Selector */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { val: 3, label: '近季', icon: Timer, desc: '3个月' },
                                                        { val: 6, label: '半年', icon: Hourglass, desc: '6个月' },
                                                        { val: 12, label: '全年', icon: Calendar, desc: '12个月' }
                                                    ].map(m => (
                                                        <button
                                                            key={m.val}
                                                            onClick={() => setMomRange(m.val as any)}
                                                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-200 group relative overflow-hidden
                                                                ${momRange === m.val
                                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <div className={`mb-1.5 p-1.5 rounded-lg transition-colors ${momRange === m.val ? 'bg-blue-200/50' : 'bg-slate-100 group-hover:bg-white'}`}>
                                                                <m.icon size={16} strokeWidth={2.5} className={momRange === m.val ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'} />
                                                            </div>
                                                            <span className="text-xs font-bold leading-none mb-0.5">{m.label}</span>
                                                            <span className={`text-[10px] scale-90 ${momRange === m.val ? 'text-blue-500/80' : 'text-slate-400'}`}>{m.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Time Segments Slider */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase px-1">
                                                        <span>时间分段 (Time)</span>
                                                        <span className="font-mono">{Math.round(momRange * (momTimeSliders[0] / 100))}个月 / {Math.round(momRange * (momTimeSliders[1] - momTimeSliders[0]) / 100)}个月 / {Math.round(momRange * (100 - momTimeSliders[1]) / 100)}个月</span>
                                                    </div>
                                                    <MultiThumbSlider
                                                        values={momTimeSliders}
                                                        onChange={setMomTimeSliders}
                                                        colors={['#DBEAFE', '#93C5FD', '#3B82F6']}
                                                    />
                                                    <div className="flex justify-between text-[10px] text-gray-400 px-1 pt-1">
                                                        <span>近期</span>
                                                        <span>远期</span>
                                                    </div>
                                                </div>

                                                {/* Weight Allocation Slider */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase px-1">
                                                        <span>权重分配 (Weight)</span>
                                                        <span className="font-mono text-gray-600">{momWeightSliders[0]}% / {momWeightSliders[1] - momWeightSliders[0]}% / {100 - momWeightSliders[1]}%</span>
                                                    </div>
                                                    <MultiThumbSlider
                                                        values={momWeightSliders}
                                                        onChange={setMomWeightSliders}
                                                        colors={['#DCFCE7', '#86EFAC', '#22C55E']}
                                                    // labels={[`${momWeightSliders[0]}%`, `${momWeightSliders[1] - momWeightSliders[0]}%`, `${100 - momWeightSliders[1]}%`]} 
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            /* YoY Config */
                                            <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Range Selector */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { val: 1, label: '去年', icon: Clock, desc: '回溯1年' },
                                                        { val: 2, label: '近两年', icon: Copy, desc: '同比2年' },
                                                        { val: 3, label: '近三年', icon: Layers, desc: '深度3年' }
                                                    ].map(y => (
                                                        <button
                                                            key={y.val}
                                                            onClick={() => setYoyRange(y.val as any)}
                                                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-200 group relative overflow-hidden
                                                                ${yoyRange === y.val
                                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <div className={`mb-1.5 p-1.5 rounded-lg transition-colors ${yoyRange === y.val ? 'bg-blue-200/50' : 'bg-slate-100 group-hover:bg-white'}`}>
                                                                <y.icon size={16} strokeWidth={2.5} className={yoyRange === y.val ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'} />
                                                            </div>
                                                            <span className="text-xs font-bold leading-none mb-0.5">{y.label}</span>
                                                            <span className={`text-[10px] scale-90 ${yoyRange === y.val ? 'text-blue-500/80' : 'text-slate-400'}`}>{y.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Weight Allocation Slider */}
                                                {yoyRange > 1 && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase px-1">
                                                            <span>历史年份权重</span>
                                                            <span className="font-mono text-gray-600">
                                                                {yoyRange === 2
                                                                    ? `${yoyWeightSliders[0]}% / ${100 - yoyWeightSliders[0]}%`
                                                                    : `${yoyWeightSliders[0]}% / ${yoyWeightSliders[1] - yoyWeightSliders[0]}% / ${100 - yoyWeightSliders[1]}%`
                                                                }
                                                            </span>
                                                        </div>
                                                        <MultiThumbSlider
                                                            values={yoyRange === 2 ? [yoyWeightSliders[0]] : yoyWeightSliders}
                                                            onChange={setYoyWeightSliders}
                                                            colors={['#FFEDD5', '#FDBA74', '#F97316']}
                                                        />
                                                        <div className="flex justify-between text-[10px] text-gray-500 px-1 pt-1 font-medium">
                                                            <span>{new Date().getFullYear() - 1}</span>
                                                            {yoyRange >= 2 && <span>{new Date().getFullYear() - 2}</span>}
                                                            {yoyRange >= 3 && <span>{new Date().getFullYear() - 3}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                                {yoyRange === 1 && (
                                                    <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                                                        仅参考 {new Date().getFullYear() - 1} 年同期 (100% 权重)
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 1. Inventory Strategy Config */}

                            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                                        <Settings className="text-gray-400" size={20} />
                                        库存策略配置
                                    </div>
                                    <button
                                        onClick={handleSaveStrategy}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                                        更新库存策略配置
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Safety Stock Selector (12 Blocks) */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-gray-600">安全库存月份</span>
                                            <span className="text-blue-600 font-bold">{editSafetyStock} 个月</span>
                                        </div>
                                        {/* 12-Grid Selector */}
                                        <div className="grid grid-cols-12 gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setEditSafetyStock(num)}
                                                    className={`h-10 rounded-lg text-xs font-bold transition-all relative group
                                                        ${editSafetyStock >= num
                                                            ? 'bg-blue-500 text-white shadow-sm'
                                                            : 'bg-white text-gray-300 hover:bg-gray-100'
                                                        }
                                                        ${editSafetyStock === num ? 'ring-2 ring-blue-200 z-10 scale-105' : ''}
                                                    `}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                                            <span>激进 (1个月)</span>
                                            <span>平衡 (6个月)</span>
                                            <span>保守 (12个月)</span>
                                        </div>
                                    </div>

                                    {/* Replenishment Mode */}
                                    <div className="space-y-3 pt-2">
                                        <span className="text-sm font-medium text-gray-600">补货方式</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setReplenishmentMode('fast')}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                                    ${replenishmentMode === 'fast'
                                                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200'
                                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${replenishmentMode === 'fast' ? 'bg-blue-200/50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    <TruckIcon size={18} />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold ${replenishmentMode === 'fast' ? 'text-blue-900' : 'text-gray-600'}`}>快速补货</div>
                                                    <div className="text-[10px] text-gray-400">货期 7 天 (最快)</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setReplenishmentMode('economic')}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                                    ${replenishmentMode === 'economic'
                                                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-200'
                                                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${replenishmentMode === 'economic' ? 'bg-emerald-200/50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold ${replenishmentMode === 'economic' ? 'text-emerald-900' : 'text-gray-600'}`}>经济补货</div>
                                                    <div className="text-[10px] text-gray-400">货期 30 天 (最优价)</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Calculated Metrics */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                        {/* Safety Stock Calc */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">目标安全库存</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {data ? Math.round(data.kpi.sales30Days * editSafetyStock).toLocaleString() : '-'} 件
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-100">
                                                <div className="flex justify-between mb-1">
                                                    <span>预测区间:</span>
                                                    <span className="font-mono text-gray-900">
                                                        {getForecastDateRange(editSafetyStock).start} ~ {getForecastDateRange(editSafetyStock).end}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>区间预计销售:</span>
                                                    <span className="font-bold text-gray-900">{data ? Math.round(data.kpi.sales30Days * editSafetyStock).toLocaleString() : '-'} 件</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-200 my-2"></div>

                                        {/* ROP Calc */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-orange-600">建议补货点 (ROP)</span>
                                                <span className="text-lg font-bold text-orange-600">
                                                    {data ? Math.round((data.kpi.sales30Days * editSafetyStock) + ((data.kpi.sales30Days / 30) * currentLeadTime) - data.kpi.inTransit).toLocaleString() : '-'} 件
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 grid grid-cols-1 gap-1">
                                                <div className="flex justify-between">
                                                    <span>安全库存:</span>
                                                    <span>{data ? Math.round(data.kpi.sales30Days * editSafetyStock) : 0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>+ 货期消耗 ({currentLeadTime}天):</span>
                                                    <span>{data ? Math.round((data.kpi.sales30Days / 30) * currentLeadTime) : 0}</span>
                                                </div>
                                                <div className="flex justify-between text-indigo-400">
                                                    <span>- 在途库存:</span>
                                                    <span>{data ? data.kpi.inTransit : 0}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-200 my-2"></div>

                                        {/* Suggested Restock Plan */}
                                        <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Bell size={14} className="text-blue-500" />
                                                <span className="text-xs font-bold text-blue-700">建议补货计划</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-gray-600">建议补货日期</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {(() => {
                                                        if (!data) return <span className="text-gray-900">-</span>;
                                                        const dailySales = data.kpi.sales30Days / 30;
                                                        const triggerPoint = (data.kpi.sales30Days * editSafetyStock) + (dailySales * currentLeadTime);
                                                        const totalAvailable = data.kpi.inStock + data.kpi.inTransit;
                                                        const daysLeft = (totalAvailable - triggerPoint) / dailySales;

                                                        if (daysLeft <= 0) {
                                                            return <span className="text-rose-600 animate-pulse font-extrabold flex items-center gap-1"><AlertTriangle size={12} />立即补货</span>;
                                                        }

                                                        const date = new Date();
                                                        date.setDate(date.getDate() + Math.ceil(daysLeft));
                                                        const dateString = date.toISOString().split('T')[0];

                                                        if (daysLeft <= 3) {
                                                            return <span className="text-orange-500">{dateString}</span>;
                                                        }
                                                        return <span className="text-gray-900 font-bold">{dateString}</span>;
                                                    })()}
                                                </span>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-600">建议补货数量</span>
                                                    <span className="text-sm font-bold text-blue-600">
                                                        {strategy?.eoq ? strategy.eoq.toLocaleString() : '-'} 件
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={handleCreatePO}
                                                    disabled={isCreatingPO}
                                                    className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 group"
                                                >
                                                    {isCreatingPO ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <ShoppingCart size={14} className="group-hover:translate-x-1 transition-transform" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Supplier Card (Refactored for Edit) */}
                                {editSupplierInfo && (
                                    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-base">备货供应商</h3>
                                                    {isEditingSupplier ? (
                                                        <div className="mt-1 space-y-2">
                                                            <input
                                                                className="block w-full text-sm font-medium border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                                                                value={editSupplierInfo.name}
                                                                onChange={e => setEditSupplierInfo({ ...editSupplierInfo, name: e.target.value })}
                                                            />
                                                            <input
                                                                className="block w-full text-[10px] font-mono text-blue-600 bg-blue-50 px-1 rounded border-none"
                                                                value={editSupplierInfo.code}
                                                                onChange={e => setEditSupplierInfo({ ...editSupplierInfo, code: e.target.value })}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-sm font-medium text-gray-700">{editSupplierInfo.name}</span>
                                                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">{editSupplierInfo.code}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isEditingSupplier ? (
                                                    <button
                                                        onClick={() => {
                                                            setIsEditingSupplier(false);
                                                            handleSaveStrategy(); // Auto save on exit edit
                                                        }}
                                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1"
                                                    >
                                                        <RefreshCw size={10} />
                                                        保存
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={handleSaveStrategy}
                                                            disabled={isSaving}
                                                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                                                        >
                                                            {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                                            更新供应商配置
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditingSupplier(true)}
                                                            className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors border border-blue-200"
                                                        >
                                                            编辑
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Editable Price & Lead Time */}
                                        <div className="bg-gray-50/80 rounded-xl p-4 space-y-4 border border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">阶梯价格 & 交期</span>
                                                {/* Removed duplicated edit button */}
                                            </div>

                                            <div className="space-y-3">
                                                {/* Tier 1 - Simplified to single input for demo interactions, ideally map array */}
                                                <div className="flex items-center justify-between text-sm group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-700 w-12 text-right">基础</span>
                                                        <div className="h-4 w-px bg-gray-300"></div>
                                                        <span className="text-xs text-gray-500">交期(天)</span>
                                                        <input
                                                            type="number"
                                                            disabled={!isEditingSupplier}
                                                            defaultValue={30}
                                                            className={`w-10 bg-transparent text-gray-700 text-xs text-center border-b ${isEditingSupplier ? 'border-gray-300' : 'border-transparent'} focus:border-blue-500 focus:outline-none`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400 text-xs">¥</span>
                                                        <input
                                                            type="number"
                                                            disabled={!isEditingSupplier}
                                                            value={editSupplierInfo.price}
                                                            onChange={e => setEditSupplierInfo({ ...editSupplierInfo, price: parseInt(e.target.value) })}
                                                            className={`w-16 bg-transparent font-bold text-gray-900 text-right border-b ${isEditingSupplier ? 'border-gray-300' : 'border-transparent'} focus:border-blue-500 focus:outline-none transition-colors`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Dead Stock Config */}
                                <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100">
                                    <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold text-lg">
                                        <AlertTriangle className="text-gray-400" size={20} />
                                        呆滞唤醒配置
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                                        <span className="text-gray-600">无动销 &gt;</span>
                                        <span className="font-bold text-gray-900">6 个月</span>
                                    </div>
                                    <div className="mt-4 text-xs text-gray-400 flex justify-between">
                                        <span>最后一次出库</span>
                                        <span>2023-10-15</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Visuals & Logs (8 cols) */}
                        <div className="col-span-8 space-y-6">

                            {/* 2. Forecast Data Adjustment (New) */}
                            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold text-gray-900">预测数量</h2>
                                        <p className="text-xs text-gray-400">系统根据配置自动计算，支持人工手动调整干预</p>
                                    </div>
                                    <button
                                        onClick={() => setIsForecastTableOpen(!isForecastTableOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-all border border-gray-100 shadow-sm active:scale-95"
                                    >
                                        {isForecastTableOpen ? '收起表格' : '查看详细预测数据'}
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isForecastTableOpen ? 'rotate-180' : 'rotate-0'}`} />
                                    </button>
                                </div>

                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isForecastTableOpen ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs tracking-wider">
                                            <tr className="border-b border-gray-100">
                                                <th className="py-3 pl-4 rounded-l-lg w-20">年份</th>
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <th key={i} className="py-3 text-center first:last:rounded-r-lg">{i + 1}月</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(forecastGrid).map(([year, months]) => (
                                                <tr key={year} className="group hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 pl-2 font-bold text-gray-900">{year}</td>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const monthData = months.find(m => m.month === i + 1);
                                                        if (!monthData) return <td key={i} className="py-2 text-center text-gray-300">-</td>;

                                                        const val = forecastOverrides[monthData.key] || 0;

                                                        return (
                                                            <td key={i} className="py-2 text-center p-1">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="text-[10px] text-gray-400 scale-90 origin-bottom h-3">
                                                                        {/* Calculated Value */}
                                                                        {calculatedForecasts[monthData.key] ? calculatedForecasts[monthData.key] : '-'}
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="0"
                                                                        className={`w-12 text-center py-1 rounded text-xs font-bold border ${val > 0 ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500'} focus:outline-none transition-all`}
                                                                        value={val > 0 ? val : ''}
                                                                        onChange={(e) => {
                                                                            const v = parseInt(e.target.value) || 0;
                                                                            setForecastOverrides(prev => ({ ...prev, [monthData.key]: v }));
                                                                        }}
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 1. Main Forecast & Inventory Simulation Chart - Nano Design Refactor */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 ring-1 ring-gray-100/50 p-8 flex flex-col h-[650px] transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                <div className="flex flex-col gap-6 mb-8">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">销售与预测分析</h2>
                                            </div>
                                            <p className="text-xs font-medium text-gray-400 max-w-md leading-relaxed">基于历史销售数据的智能预测分析与库存模拟</p>
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

                                            {/* Download Action */}
                                            <button
                                                onClick={handleExportExcel}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all active:scale-95"
                                                title="导出Excel"
                                            >
                                                <div className="flex items-center gap-1.5 px-1">
                                                    <Download size={14} />
                                                    <span className="text-xs font-bold">导出Excel</span>
                                                </div>
                                            </button>


                                        </div>
                                    </div>

                                    {/* Data Series Toggles - Refined Design */}
                                    <div className="flex items-center gap-6">
                                        <div
                                            onClick={() => setVisibleSeries({ ...visibleSeries, qty: !visibleSeries.qty })}
                                            className={`group flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-all duration-300 border ${visibleSeries.qty ? 'bg-blue-50/50 border-blue-100' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${visibleSeries.qty ? 'bg-blue-500 text-white shadow-blue-200 shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                <Package size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${visibleSeries.qty ? 'text-blue-600' : 'text-gray-400'}`}>数量</span>
                                                <span className={`text-xs font-bold ${visibleSeries.qty ? 'text-gray-900' : 'text-gray-400'}`}>出库数量</span>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setVisibleSeries({ ...visibleSeries, amount: !visibleSeries.amount })}
                                            className={`group flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-all duration-300 border ${visibleSeries.amount ? 'bg-emerald-50/50 border-emerald-100' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${visibleSeries.amount ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                <ShoppingCart size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${visibleSeries.amount ? 'text-emerald-600' : 'text-gray-400'}`}>金额</span>
                                                <span className={`text-xs font-bold ${visibleSeries.amount ? 'text-gray-900' : 'text-gray-400'}`}>销售金额</span>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setVisibleSeries({ ...visibleSeries, customers: !visibleSeries.customers })}
                                            className={`group flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-all duration-300 border ${visibleSeries.customers ? 'bg-orange-50/50 border-orange-100' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${visibleSeries.customers ? 'bg-orange-500 text-white shadow-orange-200 shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                <TruckIcon size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${visibleSeries.customers ? 'text-orange-600' : 'text-gray-400'}`}>成交</span>
                                                <span className={`text-xs font-bold ${visibleSeries.customers ? 'text-gray-900' : 'text-gray-400'}`}>客户数量</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 w-full min-h-0 relative">
                                    <ResponsiveContainer width="100%" height="100%">

                                        <ComposedChart data={displayData} margin={{ top: 30, right: 20, left: 15, bottom: 0 }}>
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
                                                content={<CustomTooltip />}
                                                cursor={{ fill: '#F8FAFC', opacity: 0.8 }}
                                            />

                                            {/* Minimalist Legend (Replaced by custom external legend, hiding default) */}
                                            <Legend content={() => null} />

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
                                            {visibleSeries.qty && (
                                                <>
                                                    {/* Actual Qty - Base */}
                                                    <Bar
                                                        stackId="qty"
                                                        yAxisId="left"
                                                        dataKey="actualQty"
                                                        name="实际出库数量"
                                                        fill="url(#qtyGradient)"
                                                        barSize={28}
                                                        radius={[4, 4, 4, 4]} // Rounded all around if mostly alone
                                                        animationDuration={1500}
                                                    />
                                                    {/* Forecast Remainder - Top Stack */}
                                                    <Bar
                                                        stackId="qty"
                                                        yAxisId="left"
                                                        dataKey="forecastRemainder"
                                                        name="预测出库数量"
                                                        fill="url(#forecastPattern)"
                                                        barSize={28}
                                                        radius={[4, 4, 0, 0]}
                                                        animationDuration={1500}
                                                    />
                                                </>
                                            )}

                                            {/* Series: Amount (Line) */}
                                            {visibleSeries.amount && (
                                                <>
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
                                                        opacity={0.6}
                                                    />
                                                </>
                                            )}

                                            {/* Series: Customers (Line/Scatter) */}
                                            {visibleSeries.customers && (
                                                <>
                                                    <Line
                                                        yAxisId="customers"
                                                        type="monotone"
                                                        dataKey="actualCustomerCount"
                                                        name="实际客户数量"
                                                        stroke="#F97316"
                                                        strokeWidth={2}
                                                        dot={(props: any) => {
                                                            const { cx, cy, payload } = props;
                                                            if (!payload.actualCustomerCount || payload.actualCustomerCount === 0) return <></>;
                                                            return (
                                                                <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#F97316" strokeWidth={2} />
                                                            );
                                                        }}
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
                                                        opacity={0.7}
                                                    />
                                                </>
                                            )}

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
                            </div>
                            {/* 3. Inventory Trend Simulation (Sawtooth) */}
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
                                            data={(() => {
                                                if (!data) return [];
                                                const days = 365;
                                                const result = [];
                                                const dailySales = data.kpi.sales30Days / 30;
                                                const safetyStock = Math.round(data.kpi.sales30Days * editSafetyStock);
                                                const rop = safetyStock + (dailySales * currentLeadTime) - data.kpi.inTransit;
                                                const eoq = strategy?.eoq || 500;

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
                                            })()}
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

                            {/* 4. Operation Logs */}
                            <div className="mt-8 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden print:hidden">
                                <div
                                    className="flex items-center justify-between p-6 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setActiveTab(activeTab === 'logs' ? 'overview' : 'logs')}
                                >
                                    <div className="flex items-center gap-3">
                                        <History size={20} className="text-gray-400" />
                                        <h3 className="text-lg font-bold text-gray-900">操作日志</h3>
                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">{logs.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ChevronLeft size={20} className={`text-gray-400 transition-transform duration-300 ${activeTab === 'logs' ? '-rotate-90' : 'rotate-0'}`} />
                                    </div>
                                </div>

                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activeTab === 'logs' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-6 pt-0">
                                        <div className="relative pl-4 border-l-2 border-gray-200 space-y-6 my-4">
                                            {logs.map((log) => {
                                                // 解析日志内容
                                                let parsedContent: { desc?: string; diff?: Record<string, any> } = {};
                                                try {
                                                    parsedContent = JSON.parse(log.content);
                                                } catch {
                                                    parsedContent = { desc: log.content };
                                                }

                                                // 字段名称映射（中文化）
                                                const fieldLabels: Record<string, string> = {
                                                    safety_stock_days: '安全库存月份',
                                                    benchmark_type: '预测基准类型',
                                                    mom_range: '环比参考范围',
                                                    yoy_range: '同比参考范围',
                                                    ratio_adjustment: '比率调整',
                                                    forecast_overrides: '手动预测覆盖',
                                                    calculated_forecasts: '系统计算预测',
                                                    supplier_info: '供应商信息',
                                                    start_year_month: '起始年月',
                                                    forecast_year_month: '预测截止年月',
                                                };

                                                // 格式化值显示
                                                const formatValue = (key: string, val: any): string => {
                                                    if (val === null || val === undefined) return '-';
                                                    if (key === 'benchmark_type') return val === 'mom' ? '环比' : '同比';
                                                    if (key === 'safety_stock_days') return `${val} 个月`;
                                                    if (key === 'ratio_adjustment') return `${val}%`;
                                                    if (typeof val === 'object') return `${Object.keys(val).length} 项数据`;
                                                    return String(val);
                                                };

                                                // 获取操作类型的友好名称
                                                const actionLabels: Record<string, { label: string; color: string }> = {
                                                    'UPDATE_STRATEGY': { label: '策略配置更新', color: 'bg-blue-100 text-blue-700' },
                                                    'CREATE_PO': { label: '生成采购单', color: 'bg-green-100 text-green-700' },
                                                    'UPDATE_FORECAST': { label: '预测数据更新', color: 'bg-purple-100 text-purple-700' },
                                                };
                                                const actionInfo = actionLabels[log.action_type] || { label: log.action_type, color: 'bg-gray-100 text-gray-700' };

                                                return (
                                                    <div key={log.id} className="relative group">
                                                        {/* 时间线圆点 */}
                                                        <div className="absolute -left-[23px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm z-10 group-hover:scale-110 transition-transform"></div>

                                                        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                                                            {/* 头部：时间 + 操作类型 */}
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${actionInfo.color}`}>
                                                                        {actionInfo.label}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">操作人: admin</span>
                                                                </div>
                                                                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                                    {log.created_at}
                                                                </span>
                                                            </div>

                                                            {/* 操作描述 */}
                                                            {parsedContent.desc && (
                                                                <p className="text-sm text-gray-700 font-medium mb-3">
                                                                    {parsedContent.desc}
                                                                </p>
                                                            )}

                                                            {/* 变更详情 */}
                                                            {parsedContent.diff && Object.keys(parsedContent.diff).length > 0 && (
                                                                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                                                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">变更详情</span>
                                                                    </div>
                                                                    <div className="divide-y divide-gray-50">
                                                                        {Object.entries(parsedContent.diff).slice(0, 6).map(([key, value]) => (
                                                                            <div key={key} className="flex items-center justify-between px-3 py-2 text-xs">
                                                                                <span className="text-gray-500">{fieldLabels[key] || key}</span>
                                                                                <span className="font-medium text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                                                                                    {formatValue(key, value)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {Object.keys(parsedContent.diff).length > 6 && (
                                                                            <div className="px-3 py-2 text-[10px] text-gray-400 text-center">
                                                                                ... 还有 {Object.keys(parsedContent.diff).length - 6} 项变更
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {logs.length === 0 && (
                                                <div className="text-center text-gray-400 py-8 text-sm">暂无操作日志</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
};
export default ProductDetail;