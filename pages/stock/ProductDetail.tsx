import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, Package, AlertTriangle,
    Bell, Settings, History, CheckCircle,
    Loader2, RefreshCw, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { api } from '../../services/api';




// --- Interfaces ---
import { KPI, ChartData, StrategyConfig, SupplierInfo, AuditLog, ProductDetailData } from './types';
import KPISection from './components/KPISection';
import OperationLogs from './components/OperationLogs';
import ForecastConfig from './components/ForecastConfig';
import InventoryStrategy from './components/InventoryStrategy';
import SupplierCard from './components/SupplierCard';
import DeadStockConfig from './components/DeadStockConfig';
import ForecastDataGrid from './components/ForecastDataGrid';
import SalesForecastChart from './components/SalesForecastChart';
import InventorySimChart from './components/InventorySimChart';

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
    const [editSafetyStock, setEditSafetyStock] = useState<number>(3);
    const [selectedStartMonth, setSelectedStartMonth] = useState<string>(''); // For Start Year-Month
    const [selectedForecastMonth, setSelectedForecastMonth] = useState<string>(''); // For Forecast Year-Month
    const [replenishmentMode, setReplenishmentMode] = useState<'fast' | 'economic'>('economic');
    const [isForecastTableOpen, setIsForecastTableOpen] = useState(false);

    // Tooltip States
    // Tooltip States
    // const [hoveredTurnover, setHoveredTurnover] = useState(false);  <-- Moved to KPISection
    // const [hoveredTransit, setHoveredTransit] = useState(false);    <-- Moved to KPISection
    // const [hoveredMom, setHoveredMom] = useState(false);            <-- Moved to KPISection
    const [isAIAnalyzing, setIsAIAnalyzing] = useState(false); // AI 状态
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);   // AI 弹窗
    const [aiReport, setAiReport] = useState<string>('');       // AI 报告内容

    // Supplier Editor State
    const [isEditingSupplier, setIsEditingSupplier] = useState(false);
    const [editSupplierInfo, setEditSupplierInfo] = useState<SupplierInfo | null>(null);
    const [isCreatingPO, setIsCreatingPO] = useState(false);

    // V3.0.1 任务11: 补货设置状态
    const [autoReplenishment, setAutoReplenishment] = useState(false);
    const [autoReplenishmentTime, setAutoReplenishmentTime] = useState('08:00');
    // Daily Seasonality
    const [dayOfWeekFactors, setDayOfWeekFactors] = useState<number[]>([]);

    // 已保存的策略参数值（用于检测未保存变更）
    const [savedStrategyValues, setSavedStrategyValues] = useState<{
        safetyStock: number;
        replenishmentMode: 'fast' | 'economic';
    } | null>(null);

    // 计算是否有未保存的变更
    const hasUnsavedChanges = savedStrategyValues !== null && (
        savedStrategyValues.safetyStock !== editSafetyStock ||
        savedStrategyValues.replenishmentMode !== replenishmentMode
    );

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
            const result: any = await api.get(`/products/${sku}/detail`);
            setData(result);
            if (result.kpi?.weekWeights) {
                setDayOfWeekFactors(result.kpi.weekWeights);
            }
        } catch (error) {
            console.error('Failed to fetch details', error);
        } finally {
            setIsLoading(false);
        }
    };


    const fetchStrategy = async () => {
        try {
            const result: any = await api.get(`/products/${sku}/strategy`);
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

            // Replenishment Mode
            if (result.strategy.replenishment_mode) setReplenishmentMode(result.strategy.replenishment_mode as any);

            // V3.0.1 任务11: 加载补货设置
            if (result.strategy.auto_replenishment !== undefined) setAutoReplenishment(result.strategy.auto_replenishment);
            if (result.strategy.auto_replenishment_time) setAutoReplenishmentTime(result.strategy.auto_replenishment_time);

            // 保存初始值用于检测变更
            setSavedStrategyValues({
                safetyStock: result.strategy.safety_stock_days || 3,
                replenishmentMode: result.strategy.replenishment_mode || 'economic'
            });

            const currentYear = new Date().getFullYear();
            // Default Start: Last Year Jan
            setSelectedStartMonth(result.strategy.start_year_month || `${currentYear - 1}-01`);
            // Default End: Current Year Dec
            setSelectedForecastMonth(result.strategy.forecast_year_month || `${currentYear}-12`);

            // Ensure supplier info has a default object if null so the card shows up
            if (!result.supplier) {
                const emptySupplier = { name: '未设置', code: 'N/A', price: 0, leadTime: 0 };
                setSupplier(emptySupplier as any);
                setEditSupplierInfo(emptySupplier as any);
            }

        } catch (error) {
            console.error('Failed to fetch strategy', error);
        }
    };


    const fetchLogs = async () => {
        try {
            const result: any = await api.get(`/products/${sku}/logs`);
            setLogs(result);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    };


    const handleSaveStrategy = async (supplierOverride?: SupplierInfo) => {
        if (!strategy) return;
        setIsSaving(true);
        try {
            const supplierToSave = supplierOverride || editSupplierInfo;
            const result: any = await api.post(`/products/${sku}/strategy`, {
                ...strategy,
                start_year_month: selectedStartMonth,
                forecast_year_month: selectedForecastMonth,
                safety_stock_days: editSafetyStock,
                replenishment_mode: replenishmentMode, // Save replenishment mode
                benchmark_type: benchmarkType,
                mom_range: momRange,
                mom_time_sliders: momTimeSliders,
                mom_weight_sliders: momWeightSliders,
                yoy_range: yoyRange,
                yoy_weight_sliders: yoyWeightSliders,
                ratio_adjustment: ratioAdjustment,
                forecast_overrides: forecastOverrides,
                calculated_forecasts: calculatedForecasts,
                supplier_info: supplierToSave,
                // V3.0.1 任务11: 补货设置
                auto_replenishment: autoReplenishment,
                auto_replenishment_time: autoReplenishmentTime,
                // V3.0.1 任务11: 详细日志记录
                log_content: `更新库存策略配置: 安全库存 ${editSafetyStock} 个月, 补货模式: ${replenishmentMode === 'fast' ? '快速补货(7天)' : '经济补货(30天)'}, 补货方式: ${autoReplenishment ? '自动(' + autoReplenishmentTime + ')' : '手动'}`
            });
            // Refresh data
            setStrategy(result.strategy);
            fetchLogs(); // Refresh logs to show auto-approval
            // 更新已保存的策略值
            setSavedStrategyValues({
                safetyStock: editSafetyStock,
                replenishmentMode: replenishmentMode
            });
            alert('策略更新成功！(系统自动审批通过)');
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
        if (!strategy) return;
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


            // Debug Log
            if (benchmarkType === 'yoy' && target.month === 1) { // Log Jan as sample
                console.log(`[Forecast Debug] ${target.key}:`, {
                    historyValues: [
                        yoyRange >= 1 ? getHistoryValue(`${target.year - 1}-${String(target.month).padStart(2, '0')}`) : null,
                        yoyRange >= 2 ? getHistoryValue(`${target.year - 2}-${String(target.month).padStart(2, '0')}`) : null,
                        yoyRange >= 3 ? getHistoryValue(`${target.year - 3}-${String(target.month).padStart(2, '0')}`) : null,
                    ],
                    weights: [
                        yoyWeightSliders[0] / 100,
                        (yoyWeightSliders[1] - yoyWeightSliders[0]) / 100,
                        (100 - yoyWeightSliders[1]) / 100
                    ],
                    rawPrediction: prediction,
                    ratioAdjusted: Math.round(prediction * (1 + ratioAdjustment / 100))
                });
            }

            newCalculated[target.key] = Math.round(prediction);
        });

        // Save Configuration and Results to Backend
        // We use newCalculated directly to ensure we save the latest data
        setIsSaving(true);
        api.post(`/products/${sku}/strategy`, {
            ...strategy,
            // FORECAST PARAMS (Update with new UI state)
            start_year_month: selectedStartMonth,
            forecast_year_month: selectedForecastMonth,
            benchmark_type: benchmarkType,
            mom_range: momRange,
            mom_time_sliders: momTimeSliders,
            mom_weight_sliders: momWeightSliders,
            yoy_range: yoyRange,
            yoy_weight_sliders: yoyWeightSliders,
            ratio_adjustment: ratioAdjustment,
            forecast_overrides: forecastOverrides, // Current overrides
            calculated_forecasts: newCalculated,    // Newly calculated

            // NON-FORECAST PARAMS (Preserve existing DB state to facilitate isolated updates)
            // Even if the user has changed these in the UI (Draft state), we don't save them here.
            safety_stock_days: strategy.safety_stock_days,
            replenishment_mode: strategy.replenishment_mode,
            supplier_info: strategy.supplier_info,

            log_content: `更新销售预测配置: 基准 ${benchmarkType === 'mom' ? '环比' : '同比'}, 比率调整 ${ratioAdjustment}%`
        }).then((result: any) => {
            setStrategy(result.strategy);
            fetchLogs();
            fetchProductDetail(); // Refresh chart data to reflect new forecasts
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

            await api.post('/purchase-orders', {
                sku: data.basic.sku,
                product_name: data.basic.name,
                quantity: qty,
                order_date: new Date().toISOString().split('T')[0],
                supplier_info: JSON.stringify(editSupplierInfo || {}),
                status: 'DRAFT',
                log_content: `生成采购单: 建议补货数量 ${qty.toLocaleString()} 件, 供应商: ${supplierName}`
            });

            alert('采购单草稿生成成功！请前往采购管理查看。');
        } catch (e: any) {
            console.error(e);
            const errorMsg = e.response?.data?.error || e.message || '网络连接失败';
            alert(`采购单生成失败：${errorMsg}`);
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
                    <KPISection data={data} />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-12 gap-10 items-start">

                        {/* Left Column: Configuration (4 cols) - Sticky */}
                        <div className="col-span-4 space-y-6 sticky top-[100px] self-start">

                            {/* 0. Sales Forecast Config */}
                            {/* 0. Sales Forecast Config */}
                            <ForecastConfig
                                isSaving={isSaving}
                                onRunForecast={handleRunForecast}
                                selectedStartMonth={selectedStartMonth}
                                setSelectedStartMonth={setSelectedStartMonth}
                                selectedForecastMonth={selectedForecastMonth}
                                setSelectedForecastMonth={setSelectedForecastMonth}
                                startOptions={startOptions}
                                forecastOptions={forecastOptions}
                                benchmarkType={benchmarkType}
                                setBenchmarkType={setBenchmarkType}
                                momRange={momRange}
                                setMomRange={setMomRange}
                                momTimeSliders={momTimeSliders}
                                setMomTimeSliders={setMomTimeSliders}
                                momWeightSliders={momWeightSliders}
                                setMomWeightSliders={setMomWeightSliders}
                                yoyRange={yoyRange}
                                setYoyRange={setYoyRange}
                                yoyWeightSliders={yoyWeightSliders}
                                setYoyWeightSliders={setYoyWeightSliders}
                                ratioAdjustment={ratioAdjustment}
                                setRatioAdjustment={setRatioAdjustment}
                            />

                            {/* 1. Inventory Strategy Config */}

                            {/* 1. Inventory Strategy Config */}
                            <InventoryStrategy
                                data={data}
                                strategy={strategy}
                                isSaving={isSaving}
                                onSave={() => handleSaveStrategy()}
                                editSafetyStock={editSafetyStock}
                                setEditSafetyStock={setEditSafetyStock}
                                replenishmentMode={replenishmentMode}
                                setReplenishmentMode={setReplenishmentMode}
                                currentLeadTime={currentLeadTime}
                                isCreatingPO={isCreatingPO}
                                onCreatePO={handleCreatePO}
                                hasUnsavedChanges={hasUnsavedChanges}
                                supplier={editSupplierInfo}
                                autoReplenishment={autoReplenishment}
                                setAutoReplenishment={setAutoReplenishment}
                                autoReplenishmentTime={autoReplenishmentTime}
                                setAutoReplenishmentTime={setAutoReplenishmentTime}
                            />      {/* 2. Supplier Card (Refactored for Edit) */}
                            {/* 2. Supplier Card */}
                            <SupplierCard
                                supplier={editSupplierInfo}
                                isSaving={isSaving}
                                onSave={(newInfo) => {
                                    setEditSupplierInfo(newInfo); // Optimistic update or state sync
                                    handleSaveStrategy(newInfo); // Save to backend
                                }}
                            />

                            {/* 3. Dead Stock Config */}
                            <DeadStockConfig />
                        </div>
                        {/* Right Column: Visuals & Logs (8 cols) */}
                        <div className="col-span-8 space-y-6">

                            {/* 2. Forecast Data Adjustment (New) */}
                            <ForecastDataGrid
                                isOpen={isForecastTableOpen}
                                onToggle={() => setIsForecastTableOpen(!isForecastTableOpen)}
                                forecastGrid={forecastGrid}
                                forecastOverrides={forecastOverrides}
                                setForecastOverrides={setForecastOverrides}
                                calculatedForecasts={calculatedForecasts}
                                dayOfWeekFactors={dayOfWeekFactors}
                            />

                            {/* 1. Main Forecast & Inventory Simulation Chart - Nano Design Refactor */}
                            <SalesForecastChart
                                displayData={displayData}
                                viewDimension={viewDimension}
                                setViewDimension={setViewDimension}
                                onExport={handleExportExcel}
                                nowLabel={nowLabel}
                            />
                            {/* 3. Inventory Trend Simulation (Sawtooth) */}
                            <InventorySimChart
                                data={data}
                                editSafetyStock={editSafetyStock}
                                currentLeadTime={currentLeadTime}
                                eoq={strategy?.eoq || 500}
                                dayOfWeekFactors={dayOfWeekFactors}
                                forecastOverrides={forecastOverrides}
                                calculatedForecasts={calculatedForecasts}
                            />

                            {/* 4. Operation Logs */}
                            <OperationLogs logs={logs} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default ProductDetail;