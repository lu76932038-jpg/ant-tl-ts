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
import StockingConfig from './components/StockingConfig';
import { useAuth } from '../../context/AuthContext';
import ForecastPermissionModal from './components/ForecastPermissionModal'; // Task 48
import { Lock } from 'lucide-react';

// --- Component ---
const ProductDetail: React.FC = () => {
    const { user } = useAuth(); // Task 48: Auth Context
    // ... hooks logic unchanged
    const { sku } = useParams<{ sku: string }>();
    const [data, setData] = useState<ProductDetailData | null>(null);
    const [strategy, setStrategy] = useState<StrategyConfig | null>(null);
    const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI States
    const [editSafetyStock, setEditSafetyStock] = useState<number>(3); // 最小销售周期 (月)
    const [editReplenishmentCycle, setEditReplenishmentCycle] = useState<number>(3); // 补货销售周期 (月)
    const [editBufferDays, setEditBufferDays] = useState<number>(30);  // 安全库存缓冲天数
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
    // V3.0.1 任务55 & 57
    const [deadStockDays, setDeadStockDays] = useState<number>(180);
    const [isStockingEnabled, setIsStockingEnabled] = useState<boolean>(true);
    // V3.0.1 Task 48: Data Permission
    const [authorizedIds, setAuthorizedIds] = useState<number[]>([]);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

    // Daily Seasonality
    const [dayOfWeekFactors, setDayOfWeekFactors] = useState<number[]>([]);

    // 已保存的策略参数值（用于检测未保存变更）
    const [savedStrategyValues, setSavedStrategyValues] = useState<{
        safetyStock: number;
        replenishmentCycle: number;
        bufferDays: number;
        replenishmentMode: 'fast' | 'economic';
    } | null>(null);

    // 计算是否有未保存的变更
    const hasUnsavedChanges = savedStrategyValues !== null && (
        savedStrategyValues.safetyStock !== editSafetyStock ||
        savedStrategyValues.replenishmentCycle !== editReplenishmentCycle ||
        savedStrategyValues.bufferDays !== editBufferDays ||
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
    const [benchmarkType, setBenchmarkType] = useState<'mom' | 'yoy'>('yoy');

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
        `${currentYear + 2}-12`,
        `${currentYear + 3}-12`
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
            setEditSafetyStock(result.strategy.safety_stock_days || 1);
            setEditReplenishmentCycle(result.strategy.replenishment_sales_cycle || 3);
            setEditBufferDays(result.strategy.buffer_days !== undefined ? result.strategy.buffer_days : 30);

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

            // V3.0.1 任务55 & 57
            if (result.strategy.dead_stock_days) setDeadStockDays(result.strategy.dead_stock_days);
            if (result.strategy.is_stocking_enabled !== undefined) setIsStockingEnabled(result.strategy.is_stocking_enabled);

            // V3.0.1 Task 48: Load Permissions
            if (result.strategy.authorized_viewer_ids) {
                let ids = result.strategy.authorized_viewer_ids;
                // Handle potential string format from legacy DB
                if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch { ids = []; } }
                setAuthorizedIds(Array.isArray(ids) ? ids : []);
            }

            // 保存初始值用于检测变更
            setSavedStrategyValues({
                safetyStock: result.strategy.safety_stock_days || 1,
                replenishmentCycle: result.strategy.replenishment_sales_cycle || 3,
                bufferDays: result.strategy.buffer_days !== undefined ? result.strategy.buffer_days : 30,
                replenishmentMode: result.strategy.replenishment_mode || 'economic'
            });

            const currentYear = new Date().getFullYear();
            // Default Start: 3 Years Back Jan
            setSelectedStartMonth(result.strategy.start_year_month || `${currentYear - 3}-01`);
            // Default End: 3 Years Forward Dec
            setSelectedForecastMonth(result.strategy.forecast_year_month || `${currentYear + 3}-12`);

            // Ensure supplier info has a default object if null so the card shows up
            if (!result.supplier) {
                const emptySupplier = {
                    name: '殸木供应商',
                    code: 'DEFAULT',
                    price: 1,
                    leadTime: 30,
                    minOrderQty: 1,
                    orderUnitQty: 1,
                    priceTiers: [
                        { minQty: 1, price: 1, leadTime: 30, isSelected: true }
                    ]
                };
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


    const handleSaveStrategy = async (supplierOverride?: SupplierInfo, newAuthorizedIds?: number[]) => {
        if (!strategy) return;
        setIsSaving(true);
        try {
            const supplierToSave = supplierOverride || editSupplierInfo;
            const idsToSave = newAuthorizedIds !== undefined ? newAuthorizedIds : authorizedIds;

            const result: any = await api.post(`/products/${sku}/strategy`, {
                ...strategy,
                start_year_month: selectedStartMonth,
                forecast_year_month: selectedForecastMonth,
                safety_stock_days: editSafetyStock,
                replenishment_sales_cycle: editReplenishmentCycle,
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
                // Task 56 Correction: If stocking is disabled, FORCE auto_replenishment to false
                auto_replenishment: isStockingEnabled ? autoReplenishment : false,
                auto_replenishment_time: autoReplenishmentTime,

                // V3.0.1 任务55 & 57
                dead_stock_days: deadStockDays,
                is_stocking_enabled: isStockingEnabled,
                // V3.0.1 Task 48
                authorized_viewer_ids: idsToSave,
                // V3.0.1 任务11: 详细日志记录
                log_content: `更新库存策略配置: 备库 ${isStockingEnabled ? '启用' : '关闭'}, 呆滞 ${deadStockDays}天, 缓冲 ${editBufferDays}天, 最细周期 ${editSafetyStock}个月, 补货周期 ${editReplenishmentCycle}个月, 补货方式: ${autoReplenishment ? '自动(' + autoReplenishmentTime + ')' : '手动'}`,
                buffer_days: editBufferDays
            });
            // Refresh data
            // Refresh data
            setStrategy(result.strategy);
            if (result.supplier) {
                setSupplier(result.supplier);
                setEditSupplierInfo(result.supplier);
            } else if (supplierToSave) {
                setSupplier(supplierToSave);
                setEditSupplierInfo(supplierToSave);
            }
            fetchLogs(); // Refresh logs to show auto-approval
            // 更新已保存的策略值
            setSavedStrategyValues({
                safetyStock: editSafetyStock,
                replenishmentCycle: editReplenishmentCycle,
                bufferDays: editBufferDays,
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

    // V3.0.1 任务：阶梯价格联动选择
    const handleSelectTier = (tierIndex: number) => {
        if (!editSupplierInfo?.priceTiers) return;
        const newTiers = editSupplierInfo.priceTiers.map((t, idx) => ({
            ...t,
            isSelected: idx === tierIndex
        }));
        setEditSupplierInfo({
            ...editSupplierInfo,
            priceTiers: newTiers
        });
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

            // 任务49: 预测数据只会显示在时间大于等于今天 (包含本月)
            const isPast = monthKey < currentMonthKey;
            const remainder = isPast ? 0 : Math.max(0, baseForecast - actual);

            // Recalculate forecast amount
            const finalForecastQty = actual + remainder;
            const useOriginalAmount = d.forecastAmount && d.forecastAmount > 0 && baseForecast === d.forecastQty;
            const finalForecastAmount = isPast ? null : (useOriginalAmount // Past: Hide Forecast
                ? d.forecastAmount
                : Math.round(finalForecastQty * price));

            // Recalculate forecast customers
            const useOriginalCust = d.forecastCustomerCount && d.forecastCustomerCount > 0 && baseForecast === d.forecastQty;
            const finalForecastCustomerCount = isPast ? null : (useOriginalCust // Past: Hide Forecast
                ? d.forecastCustomerCount
                : Math.round(finalForecastQty * custRatio));

            // Determine if strictly future
            const isStrictlyFuture = monthKey > currentMonthKey;

            return {
                ...d,
                forecastQty: finalForecastQty, // Total height for reference
                forecastRemainder: remainder, // The part to stack on top of actual (0 for past)
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
            return Array.from(yearMap.values()).map(y => {
                // Task 49: If year is in the past, hide forecast data entirely (set to null)
                // This prevents the green dashed line from dropping to 0 for past years
                const isPastYear = parseInt(y.month) < currentYear;

                return {
                    ...y,
                    simStock: Math.round(y.simStock / y.count),
                    simRop: 0, simSafety: 0,
                    // If past year, force forecasts to null to break the line on chart
                    forecastQty: isPastYear ? null : y.forecastQty,
                    forecastAmount: isPastYear ? null : y.forecastAmount,
                    forecastCustomerCount: isPastYear ? null : y.forecastCustomerCount,
                    // Ensure forecast remainder is also cleared
                    forecastRemainder: isPastYear ? 0 : y.forecastRemainder
                };
            });
        }
        return chartData;
    };

    const displayData = getChartData();
    const nowIndex = displayData.findIndex(c => c.type === 'future');
    const nowLabel = nowIndex !== -1 ? data.charts[nowIndex].fullDate : '';

    // Forecast Grid Helper
    const getForecastMonths = () => {
        if (!selectedForecastMonth || !selectedStartMonth) return {};
        const months: { year: number, month: number, key: string }[] = [];

        const [startY, startM] = selectedStartMonth.split('-').map(Number);
        const [endY, endM] = selectedForecastMonth.split('-').map(Number);

        let current = new Date(startY, startM - 1, 1);
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
    const handleRunForecast = (overrides?: any) => {
        if (!data) return;
        if (!strategy) return;

        // Merge overrides with current state to get the effective config
        const effectiveConfig = {
            start_year_month: overrides?.start_year_month ?? selectedStartMonth,
            forecast_year_month: overrides?.forecast_year_month ?? selectedForecastMonth,
            benchmark_type: overrides?.benchmark_type ?? benchmarkType,
            mom_range: overrides?.mom_range ?? momRange,
            mom_time_sliders: overrides?.mom_time_sliders ?? momTimeSliders,
            mom_weight_sliders: overrides?.mom_weight_sliders ?? momWeightSliders,
            yoy_range: overrides?.yoy_range ?? yoyRange,
            yoy_weight_sliders: overrides?.yoy_weight_sliders ?? yoyWeightSliders,
            ratio_adjustment: overrides?.ratio_adjustment ?? ratioAdjustment
        };

        const newCalculated: Record<string, number> = {};
        // Re-generate grid based on EFFECTIVE start/end
        const forecastMonthsList = (() => {
            // ... Logic duplicated from getForecastMonths but using effective dates ...
            // Since getForecastMonths relies on state, and we need it inside here, better to pass effective dates to a helper
            // For simplify, let's reuse getForecastMonths if dates didn't change, or re-calc if they did.
            // Actually, the grid generation logic is duplicated below. Let's fix this properly.
            if (overrides?.start_year_month || overrides?.forecast_year_month) {
                // Re-calc months for the new range
                const months: { year: number, month: number, key: string }[] = [];
                const [startY, startM] = effectiveConfig.start_year_month.split('-').map(Number);
                const [endY, endM] = effectiveConfig.forecast_year_month.split('-').map(Number);
                let current = new Date(startY, startM - 1, 1);
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
            }
            return getForecastMonths();
        })();

        const flatForecastMonths = Object.values(forecastMonthsList).flat();

        // Helper to get history value
        const getHistoryValue = (monthKey: string) => {
            const found = data.charts.find(c => c.month === monthKey);
            return found ? (found.actualQty || 0) : 0; // Using actual for history
        };

        flatForecastMonths.forEach(target => {
            let prediction = 0;
            const targetDate = new Date(target.year, target.month - 1, 1);

            if (effectiveConfig.benchmark_type === 'yoy') {
                // YoY Logic
                const range = effectiveConfig.yoy_range;
                const weights = effectiveConfig.yoy_weight_sliders;

                if (range === 1) {
                    const lastYear = new Date(targetDate);
                    lastYear.setFullYear(lastYear.getFullYear() - 1);
                    prediction = getHistoryValue(`${lastYear.getFullYear()}-${String(lastYear.getMonth() + 1).padStart(2, '0')}`);
                } else if (range === 2) {
                    const w1 = weights[0] / 100;
                    const w2 = 1 - w1;
                    const y1 = new Date(targetDate); y1.setFullYear(y1.getFullYear() - 1);
                    const y2 = new Date(targetDate); y2.setFullYear(y2.getFullYear() - 2);
                    const v1 = getHistoryValue(`${y1.getFullYear()}-${String(y1.getMonth() + 1).padStart(2, '0')}`);
                    const v2 = getHistoryValue(`${y2.getFullYear()}-${String(y2.getMonth() + 1).padStart(2, '0')}`);
                    prediction = v1 * w1 + v2 * w2;
                } else {
                    const w1 = weights[0] / 100;
                    const w2 = (weights[1] - weights[0]) / 100;
                    const w3 = (100 - weights[1]) / 100;
                    const y1 = new Date(targetDate); y1.setFullYear(y1.getFullYear() - 1);
                    const y2 = new Date(targetDate); y2.setFullYear(y2.getFullYear() - 2);
                    const y3 = new Date(targetDate); y3.setFullYear(y3.getFullYear() - 3);
                    prediction = getHistoryValue(`${y1.getFullYear()}-${String(y1.getMonth() + 1).padStart(2, '0')}`) * w1 +
                        getHistoryValue(`${y2.getFullYear()}-${String(y2.getMonth() + 1).padStart(2, '0')}`) * w2 +
                        getHistoryValue(`${y3.getFullYear()}-${String(y3.getMonth() + 1).padStart(2, '0')}`) * w3;
                }
            } else {
                // MoM Logic
                const range = effectiveConfig.mom_range;
                const timeSliders = effectiveConfig.mom_time_sliders;
                const weightSliders = effectiveConfig.mom_weight_sliders;

                const split1 = Math.round(range * (timeSliders[0] / 100));
                const split2 = Math.round(range * (timeSliders[1] / 100));

                const weight1 = weightSliders[0] / 100;
                const weight2 = (weightSliders[1] - weightSliders[0]) / 100;
                const weight3 = (100 - weightSliders[1]) / 100;

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
            if (effectiveConfig.benchmark_type === 'yoy' && target.month === 1) { // Log Jan as sample
                // ... omitted debug Log ...
            }

            // Apply ratio adjustment
            if (effectiveConfig.ratio_adjustment !== 0) {
                prediction = prediction * (1 + effectiveConfig.ratio_adjustment / 100);
            }

            newCalculated[target.key] = Math.round(prediction);
        });

        // Save Configuration and Results to Backend
        // We use newCalculated directly to ensure we save the latest data
        setIsSaving(true);
        api.post(`/products/${sku}/strategy`, {
            ...strategy,
            // FORECAST PARAMS (Update with new UI state)
            start_year_month: effectiveConfig.start_year_month,
            forecast_year_month: effectiveConfig.forecast_year_month,
            benchmark_type: effectiveConfig.benchmark_type,
            mom_range: effectiveConfig.mom_range,
            mom_time_sliders: effectiveConfig.mom_time_sliders,
            mom_weight_sliders: effectiveConfig.mom_weight_sliders,
            yoy_range: effectiveConfig.yoy_range,
            yoy_weight_sliders: effectiveConfig.yoy_weight_sliders,
            ratio_adjustment: effectiveConfig.ratio_adjustment,
            forecast_overrides: forecastOverrides, // Current overrides
            calculated_forecasts: newCalculated,    // Newly calculated

            // NON-FORECAST PARAMS (Preserve existing DB state to facilitate isolated updates)
            // Even if the user has changed these in the UI (Draft state), we don't save them here.
            safety_stock_days: strategy.safety_stock_days,
            replenishment_mode: strategy.replenishment_mode,
            supplier_info: strategy.supplier_info,

            log_content: `更新销售预测配置: 基准 ${effectiveConfig.benchmark_type === 'mom' ? '环比' : '同比'}, 比率调整 ${effectiveConfig.ratio_adjustment}%`
        }).then((result: any) => {
            setStrategy(result.strategy);
            fetchLogs();
            fetchProductDetail(); // Refresh chart data to reflect new forecasts
        }).finally(() => setIsSaving(false));

        setCalculatedForecasts(newCalculated);
    };


    // V3.0.1: 生成采购计划并立即更新在途库存
    const handleCreatePlan = async (qty: number) => {
        if (!data || !strategy || qty <= 0) return;
        if (!confirm(`确定要生成 ${qty.toLocaleString()} 件的采购计划吗？\n生成后将立即计入在途库存。`)) return;

        setIsCreatingPO(true);
        try {
            const supplierName = editSupplierInfo?.name || '未知供应商';

            // 确保供应商信息的完整性（特别是价格）
            let finalSupplierInfo: any = editSupplierInfo || {};
            // 如果没有选中的价格层级，尝试选中第一个
            if (finalSupplierInfo.priceTiers && finalSupplierInfo.priceTiers.length > 0) {
                const hasSelected = finalSupplierInfo.priceTiers.some((t: any) => t.isSelected);
                if (!hasSelected) {
                    finalSupplierInfo = {
                        ...finalSupplierInfo,
                        priceTiers: finalSupplierInfo.priceTiers.map((t: any, index: number) => ({
                            ...t,
                            isSelected: index === 0 // 默认选中第一个
                        }))
                    };
                }
            }

            // 2. 提取选中层级的货期，提升到顶层 supplier.leadTime
            if (finalSupplierInfo.priceTiers) {
                const selectedTier = finalSupplierInfo.priceTiers.find((t: any) => t.isSelected);
                if (selectedTier) {
                    finalSupplierInfo.leadTime = selectedTier.leadTime || selectedTier.leadTimeDays || 0;
                }
            }

            // 1. 调用独立接口创建采购计划
            await api.post('/purchase-plans', {
                sku: data.basic.sku,
                product_name: data.basic.name,
                quantity: qty,
                order_date: new Date().toISOString().split('T')[0],
                supplier_info: JSON.stringify(finalSupplierInfo),
                status: 'PLAN',
                source: 'MANUAL' // 标记为手动生成
            });

            // V3.0.2 变更：采购计划仅作为意向，不计入在途库存。只有转为正式 PO 后才计入。
            // 因此此处移除 setData 更新 inTransit 的逻辑。

            alert('采购计划生成成功！\n请前往“采购计划”页面进行审核与转单。');
        } catch (e: any) {
            console.error(e);
            alert(`生成失败：${e.message}`);
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

                        {/* Task 48: Permission Button (Admin Only) */}
                        {(!user || user.role === 'admin') && (
                            <button
                                onClick={() => setIsPermissionModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm print:hidden"
                            >
                                <Lock size={14} />
                                <span className="hidden sm:inline">权限配置</span>
                            </button>
                        )}

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
                    <KPISection data={data} supplier={supplier} />

                    {/* Permission Modal */}
                    <ForecastPermissionModal
                        isOpen={isPermissionModalOpen}
                        onClose={() => setIsPermissionModalOpen(false)}
                        authorizedIds={authorizedIds}
                        onSave={(ids) => {
                            setAuthorizedIds(ids);
                            handleSaveStrategy(undefined, ids);
                        }}
                    />

                    {/* Main Content Grid */}
                    {/* Main Content Grid (1:4:1 Ratio -> 2:8:2 cols) */}
                    <div className="grid grid-cols-12 gap-6 items-start">

                        <div className="col-span-2 space-y-6 sticky top-[100px] self-start">

                            {/* New: Stocking Config (Task 56 & 57) */}
                            <StockingConfig
                                enabled={isStockingEnabled}
                                setEnabled={setIsStockingEnabled}
                                isSaving={isSaving}
                            />

                            {/* 0. Sales Forecast Config (Permission Gated) */}
                            {((!user || user.role === 'admin') || (user.id && authorizedIds.includes(user.id))) ? (
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
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 flex flex-col items-center gap-2">
                                    <Lock className="text-gray-300" size={32} />
                                    <div className="text-gray-400 font-bold text-sm">暂无预测配置权限</div>
                                </div>
                            )}

                            {/* 2. Dead Stock Config (Moved from Right) */}
                            <DeadStockConfig
                                deadStockDays={deadStockDays}
                                setDeadStockDays={setDeadStockDays}
                                lastOutboundDate={data?.charts?.find(c => c.outbound && c.outbound > 0)?.month || '无记录'}
                                isSaving={isSaving}
                                onSave={() => handleSaveStrategy()}
                            />

                        </div>
                        {/* Middle Column: Visuals & Logs (8 cols) */}
                        <div className="col-span-8 space-y-6">

                            {/* 2. Forecast Data Adjustment (New) - Permission Gated */}
                            {((!user || user.role === 'admin') || (user.id && authorizedIds.includes(user.id))) ? (
                                <>
                                    <ForecastDataGrid
                                        isOpen={isForecastTableOpen}
                                        onToggle={() => setIsForecastTableOpen(!isForecastTableOpen)}
                                        forecastGrid={forecastGrid}
                                        forecastOverrides={forecastOverrides}
                                        setForecastOverrides={setForecastOverrides}
                                        calculatedForecasts={calculatedForecasts}
                                        dayOfWeekFactors={dayOfWeekFactors}
                                        isSaving={isSaving}
                                        onSave={() => handleSaveStrategy()}
                                        chartData={data.charts}
                                        // Forecast Configuration Parameters for Tooltip logic
                                        benchmarkType={benchmarkType}
                                        momRange={momRange}
                                        momTimeSliders={momTimeSliders}
                                        momWeightSliders={momWeightSliders}
                                        yoyRange={yoyRange}
                                        yoyWeightSliders={yoyWeightSliders}
                                        ratioAdjustment={ratioAdjustment}
                                        dailyActuals={data.kpi?.dailyActuals}
                                    />

                                    {/* 1. Main Forecast & Inventory Simulation Chart - Nano Design Refactor */}
                                    <SalesForecastChart
                                        displayData={displayData}
                                        viewDimension={viewDimension}
                                        setViewDimension={setViewDimension}
                                        onExport={handleExportExcel}
                                        nowLabel={nowLabel}
                                    />
                                </>
                            ) : (
                                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[400px]">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Lock className="text-gray-300" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">数据访问受限</h3>
                                        <p className="text-sm text-gray-500 mt-1">您没有权限查看此产品的销售预测详情。请联系管理员添加权限。</p>
                                    </div>
                                </div>
                            )}
                            {/* 3. Inventory Trend Simulation (Sawtooth) */}
                            {(() => {
                                // Calculate dynamic lead time for simulation
                                const selectedTier = editSupplierInfo?.priceTiers?.find(t => t.isSelected);
                                const effectiveLeadTime = selectedTier ? selectedTier.leadTime : (
                                    replenishmentMode === 'fast' ? 7 : 30
                                );

                                return (
                                    <InventorySimChart
                                        data={data}
                                        editSafetyStock={editSafetyStock}
                                        editReplenishmentCycle={editReplenishmentCycle}
                                        currentLeadTime={effectiveLeadTime}
                                        eoq={strategy?.eoq || 500}
                                        dayOfWeekFactors={dayOfWeekFactors}
                                        forecastOverrides={forecastOverrides}
                                        calculatedForecasts={calculatedForecasts}
                                        minOrderQty={editSupplierInfo?.minOrderQty || 1}
                                        orderUnitQty={editSupplierInfo?.orderUnitQty || 1}
                                    />
                                );
                            })()}

                            {/* 4. Operation Logs */}
                            <OperationLogs logs={logs} />
                        </div>

                        {/* Right Column: Execute & Strategy (2 cols) - Sticky */}
                        <div className="col-span-2 space-y-6 sticky top-[100px] self-start">
                            {/* 1. Inventory Strategy Config (Moved to Right Top) */}
                            <InventoryStrategy
                                data={data}
                                strategy={strategy}
                                isSaving={isSaving}
                                onSave={() => handleSaveStrategy()}
                                editSafetyStock={editSafetyStock}
                                setEditSafetyStock={setEditSafetyStock}
                                editReplenishmentCycle={editReplenishmentCycle}
                                setEditReplenishmentCycle={setEditReplenishmentCycle}
                                replenishmentMode={replenishmentMode}
                                setReplenishmentMode={setReplenishmentMode}
                                currentLeadTime={currentLeadTime}
                                isCreatingPO={isCreatingPO}
                                onCreatePlan={handleCreatePlan}
                                hasUnsavedChanges={hasUnsavedChanges}
                                supplier={editSupplierInfo}
                                onSelectTier={handleSelectTier}
                                autoReplenishment={autoReplenishment}
                                setAutoReplenishment={setAutoReplenishment}
                                autoReplenishmentTime={autoReplenishmentTime}
                                setAutoReplenishmentTime={setAutoReplenishmentTime}
                                isStockingEnabled={isStockingEnabled}
                            />
                            {/* 2. Supplier Card (Moved from Left) */}
                            <SupplierCard
                                sku={data.basic.sku}
                                supplier={supplier}
                                isSaving={isSaving}
                                onSave={handleSaveStrategy}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default ProductDetail;