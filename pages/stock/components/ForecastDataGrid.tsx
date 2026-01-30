import React, { useState, useMemo } from 'react';
import { ChevronDown, Calendar, Clock, BarChart3, TrendingUp, Download, ChevronUp, AlertCircle, Copy, Check, Snowflake, Sun, Leaf, Wind } from 'lucide-react';
import { getISOWeek } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ChartData } from '../types';
import { SmartTooltip } from './SmartTooltip';

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ForecastDataGridProps {
    isOpen: boolean;
    onToggle: () => void;
    forecastGrid: Record<number, { year: number, month: number, key: string }[]>;
    forecastOverrides: Record<string, number>;
    setForecastOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    calculatedForecasts: Record<string, number>;
    dayOfWeekFactors?: number[];
    isSaving?: boolean;
    onSave?: () => void;
    chartData?: ChartData[];
    benchmarkType?: 'mom' | 'yoy';
    momRange?: number;
    momTimeSliders?: number[];
    momWeightSliders?: number[];
    yoyRange?: number;
    yoyWeightSliders?: number[];
    ratioAdjustment?: number;
    dailyActuals?: { date: string, qty: number }[];
}

const ForecastDataGrid: React.FC<ForecastDataGridProps> = ({
    isOpen,
    onToggle,
    forecastGrid,
    forecastOverrides,
    setForecastOverrides,
    calculatedForecasts,
    dayOfWeekFactors = [],
    chartData = [],
    benchmarkType,
    momRange,
    momTimeSliders,
    momWeightSliders,
    yoyRange,
    yoyWeightSliders,
    ratioAdjustment = 0,
    dailyActuals = []
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);


    // --- Data Prep ---
    // Lookup for real daily actuals: YYYY-MM-DD -> quantity
    const dailyActualsMap = useMemo(() => {
        const map = new Map<string, number>();
        dailyActuals.forEach(d => map.set(d.date, d.qty));
        return map;
    }, [dailyActuals]);

    // Create a quick lookup for actuals: YYYY-MM -> quantity
    const actualsMap = useMemo(() => {
        const map = new Map<string, number>();
        chartData.forEach(c => {
            if (c.actualQty !== undefined && c.actualQty !== null) {
                map.set(c.month, c.actualQty);
            }
        });
        return map;
    }, [chartData]);


    const availableYears = useMemo(() => Object.keys(forecastGrid).map(Number).sort((a, b) => a - b), [forecastGrid]);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

    // --- Copy Tooltip Logic ---
    const [isCopied, setIsCopied] = useState(false);
    const [tooltipData, setTooltipData] = useState<{ data: any, rect: DOMRect } | null>(null);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleCopyTooltip = async (e: React.MouseEvent, data: any) => {
        e.stopPropagation();
        if (!data) return;

        const text = [
            `预测计算明细 (${data.date})`,
            `----------------------------------`,
            `预测值: ${formatNumber(data.dayForecast)}`,
            `公式: (月总数 / 月总权重) × 当日权重`,
            ``,
            `1. 月总数: ${formatNumber(data.value)}`,
            `   说明: ${dailyActualsMap.has(data.date)
                ? '数据库真实记录'
                : (data.source === 'actual' ? '系统实绩值' : (data.isOverride ? '手动调整值' : '系统预测值'))
            }`,
            `   过程: ${dailyActualsMap.has(data.date) ? '来源: shiplist 原始出库明细' : data.monthlyTotalProcess}`,
            ``,
            `2. 月总权重: ${formatNumber(Number(data.totalWeights))}`,
            `   过程: ${data.totalWeightsProcess}`,
            ``,
            `3. 当日权重: ${Number(data.weight).toFixed(3)}`,
            `   过程: ${data.dayWeightProcess}`
        ].join('\n');

        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
        } catch (err) {
            // Fallback for environments where clipboard API is restricted
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setIsCopied(true);
            } catch (fallbackErr) {
                console.error('Copy failed', fallbackErr);
            }
        }

        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCellEnter = (e: React.MouseEvent, dayData: any) => {
        if (dayData.date < new Date().toISOString().split('T')[0]) return; // No tooltip for history

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        // Clear any pending close timer
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

        setTooltipData({ data: dayData, rect });
    };

    const handleCellLeave = () => {
        // Delay closing to allow moving into the tooltip
        hoverTimeoutRef.current = setTimeout(() => {
            setTooltipData(null);
        }, 300);
    };

    // Keep tooltip open when hovering over it
    const handleTooltipEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    const handleTooltipLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setTooltipData(null);
        }, 300);
    };

    // Ensure yearFilter is valid when years change
    React.useEffect(() => {
        if (!availableYears.includes(yearFilter) && availableYears.length > 0) {
            setYearFilter(availableYears[0]);
        }
    }, [availableYears]);

    // Auto-scroll to Today
    React.useEffect(() => {
        if (isOpen && viewMode === 'daily') {
            setTimeout(() => {
                const todayEl = document.getElementById('today-cell');
                if (todayEl && scrollContainerRef.current) {
                    todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    }, [isOpen, viewMode, yearFilter]);


    // --- Core Logic: Get Value & Source ---
    // Returns { value, source: 'actual' | 'forecast' | 'none' }
    const getMonthValue = (monthKey: string) => {
        const actual = actualsMap.get(monthKey) ?? 0;
        const forecastOverride = forecastOverrides[monthKey];
        const forecastCalc = calculatedForecasts[monthKey] ?? 0;

        const effectiveForecast = forecastOverride !== undefined ? forecastOverride : forecastCalc;

        // Logic: Show larger one, but track source for coloring
        if (actual >= effectiveForecast && actual > 0) {
            return { value: actual, source: 'actual', forecast: effectiveForecast };
        } else {
            return { value: effectiveForecast, source: 'forecast', actual: actual };
        }
    };

    // --- Data Generation ---

    const generateAllData = (targetYear: number) => {
        const months = forecastGrid[targetYear] || [];
        const result = [];

        for (const mData of months) {
            const daysCount = new Date(targetYear, mData.month, 0).getDate();

            // Get Monthly Totals (No comparison yet)
            const actualMonthTotal = actualsMap.get(mData.key) ?? 0;
            const forecastOverride = forecastOverrides[mData.key];
            const forecastCalc = calculatedForecasts[mData.key] ?? 0;
            const forecastMonthTotal = forecastOverride !== undefined ? forecastOverride : forecastCalc;

            // Daily Weights
            let totalWeights = 0;
            const dailyWeights = [];
            for (let d = 1; d <= daysCount; d++) {
                const date = new Date(targetYear, mData.month - 1, d);
                // dayOfWeekFactors: 0=Mon...6=Sun. JS: 0=Sun...
                let jsDay = date.getDay();
                let idx = jsDay === 0 ? 6 : jsDay - 1;
                const weight = dayOfWeekFactors[idx] ?? 1;
                dailyWeights.push({ day: d, weight, date });
                totalWeights += weight;
            }

            const dailyBaseActual = totalWeights > 0 ? actualMonthTotal / totalWeights : actualMonthTotal / daysCount;
            const dailyBaseForecast = totalWeights > 0 ? forecastMonthTotal / totalWeights : forecastMonthTotal / daysCount;

            // 1. Monthly Total Calculation String
            let monthlyTotalProcess = "";
            if (forecastOverride !== undefined) {
                monthlyTotalProcess = `手动设定覆盖值: ${formatNumber(forecastOverride)}`;
            } else {
                if (benchmarkType === 'yoy' && yoyRange && yoyWeightSliders) {
                    const targetMonth = mData.month;
                    const v1 = actualsMap.get(`${targetYear - 1}-${String(targetMonth).padStart(2, '0')}`) || 0;
                    const v2 = actualsMap.get(`${targetYear - 2}-${String(targetMonth).padStart(2, '0')}`) || 0;
                    const v3 = actualsMap.get(`${targetYear - 3}-${String(targetMonth).padStart(2, '0')}`) || 0;

                    if (yoyRange === 1) {
                        monthlyTotalProcess = `${targetYear - 1}年同期(${formatNumber(v1)}) × 100%`;
                    } else if (yoyRange === 2) {
                        const w1 = yoyWeightSliders[0] / 100;
                        const w2 = 1 - w1;
                        monthlyTotalProcess = `${targetYear - 1}年(${formatNumber(v1)})×${w1.toFixed(2)} + ${targetYear - 2}年(${formatNumber(v2)})×${w2.toFixed(2)}`;
                    } else {
                        const w1 = yoyWeightSliders[0] / 100;
                        const w2 = (yoyWeightSliders[1] - yoyWeightSliders[0]) / 100;
                        const w3 = (100 - yoyWeightSliders[1]) / 100;
                        monthlyTotalProcess = `${targetYear - 1}年(${formatNumber(v1)})×${w1.toFixed(2)} + ${targetYear - 2}年(${formatNumber(v2)})×${w2.toFixed(2)} + ${targetYear - 3}年(${formatNumber(v3)})×${w3.toFixed(2)}`;
                    }
                } else if (benchmarkType === 'mom' && momRange && momTimeSliders && momWeightSliders) {
                    // Logic MUST match ProductDetail.tsx calculation
                    const split1 = Math.round(momRange * (momTimeSliders[0] / 100));
                    const split2 = Math.round(momRange * (momTimeSliders[1] / 100));

                    const w1 = momWeightSliders[0] / 100;
                    const w2 = (momWeightSliders[1] - momWeightSliders[0]) / 100;
                    const w3 = (100 - momWeightSliders[1]) / 100;

                    const historyData = [];
                    // Backtrack from TODAY (MoM is based on current velocity)
                    for (let i = 1; i <= momRange; i++) {
                        const d = new Date(); // Always relative to NOW
                        d.setMonth(d.getMonth() - i);
                        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const val = actualsMap.get(k) || 0;
                        historyData.push({ month: k, val });
                    }

                    const getSliceInfo = (start: number, end: number) => {
                        const slice = historyData.slice(start, end);
                        if (slice.length === 0) return { avg: 0, text: '无数据' };
                        const sum = slice.reduce((a, b) => a + b.val, 0);
                        const avg = sum / slice.length;
                        // Format: "Month1(Val) + Month2(Val)..." 
                        // Too long? Maybe just "Range: M1~M2 (Avg: V)"
                        const rangeStr = `${slice[slice.length - 1]?.month}~${slice[0]?.month}`;
                        return { avg, text: `${rangeStr} (均值:${formatNumber(Math.round(avg))})`, details: slice };
                    };

                    const s1 = getSliceInfo(0, split1);
                    const s2 = getSliceInfo(split1, split2);
                    const s3 = getSliceInfo(split2, momRange);

                    let calcParts = [];
                    let formulaParts = [];

                    if (split1 > 0) {
                        formulaParts.push(`近期权重${(w1 * 100).toFixed(0)}%`);
                        calcParts.push(`   • 近期 [${s1.details.map(d => d.month).join(', ')}]:\n     均值 ${formatNumber(Math.round(s1.avg))} × ${(w1).toFixed(2)}`);
                    }
                    if (split2 > split1) {
                        formulaParts.push(`中期权重${(w2 * 100).toFixed(0)}%`);
                        calcParts.push(`   • 中期 [${s2.details.map(d => d.month).join(', ')}]:\n     均值 ${formatNumber(Math.round(s2.avg))} × ${(w2).toFixed(2)}`);
                    }
                    if (momRange > split2) {
                        formulaParts.push(`远期权重${(w3 * 100).toFixed(0)}%`);
                        calcParts.push(`   • 远期 [${s3.details.map(d => d.month).join(', ')}]:\n     均值 ${formatNumber(Math.round(s3.avg))} × ${(w3).toFixed(2)}`);
                    }

                    monthlyTotalProcess = `过去${momRange}个月销量加权平均\n   ${calcParts.join('\n')}`;
                    // monthlyTotalProcess = `系统计算值: ${formatNumber(forecastCalc)}`; // Keeping simplistic header? No, overwrite.
                } else {
                    monthlyTotalProcess = `系统计算值: ${formatNumber(forecastCalc)}`;
                }

                if (ratioAdjustment !== 0) {
                    monthlyTotalProcess = `(${monthlyTotalProcess}) × (1 + ${ratioAdjustment}%)`;
                }
            }

            // 2. Total Weight Calculation String
            // Group by Day of Week (0=Sun, 1=Mon...)
            const dayStats: Record<number, { count: number, weight: number }> = {};
            dailyWeights.forEach(dw => {
                const dIdx = dw.date.getDay();
                if (!dayStats[dIdx]) dayStats[dIdx] = { count: 0, weight: dw.weight };
                dayStats[dIdx].count++;
            });

            // Display order: Mon -> Sun
            const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const displayOrder = [1, 2, 3, 4, 5, 6, 0];

            const totalWeightsProcess = displayOrder
                .map(dIdx => {
                    const info = dayStats[dIdx];
                    if (!info) return null;
                    return `${info.count}个${weekNames[dIdx]}(${info.weight.toFixed(3)})`;
                })
                .filter(Boolean)
                .join(" + ");

            // Loop Days and Compare at Day Level
            const todayStr = new Date().toISOString().split('T')[0];

            const days = dailyWeights.map(d => {
                const dayActual = Math.round(dailyBaseActual * d.weight);
                const dayForecast = Math.round(dailyBaseForecast * d.weight);
                const dateStr = d.date.toISOString().split('T')[0];

                // Date-Based Logic
                let val, source;

                if (dateStr < todayStr) {
                    // 历史日期判定逻辑：
                    // 1. 优先查日明细 map
                    const hasDailyRecord = dailyActualsMap.has(dateStr);

                    // 检查该月是否在数据库中有任何日明细
                    const monthKey = mData.key;
                    const hasAnyDailyInMonth = Array.from(dailyActualsMap.keys()).some(k => k.startsWith(monthKey));

                    if (hasDailyRecord) {
                        val = dailyActualsMap.get(dateStr) ?? 0;
                    } else if (!hasAnyDailyInMonth && actualMonthTotal > 0) {
                        // 该月完全没有日记录，但有月总量 -> 说明是早期汇总数据，使用权重推算还原
                        val = dayActual;
                    } else {
                        // 该月有部分日记录或总量也为 0 -> 严格显示为 0
                        val = 0;
                    }
                    source = 'actual';
                } else if (dateStr > todayStr) {
                    // 未来日期：取预测
                    val = dayForecast;
                    source = 'forecast';
                } else {
                    // 今日：取二者最大值
                    val = Math.max(dayActual, dayForecast);
                    source = 'today-mix';
                }

                return {
                    day: d.day,
                    date: dateStr,
                    value: val,
                    source,
                    isWeekend: [0, 6].includes(d.date.getDay()),
                    dayActual,
                    dayForecast,
                    weight: d.weight,
                    totalWeights,
                    forecastMonthTotal,
                    isOverride: forecastOverride !== undefined,
                    monthlyTotalProcess,
                    totalWeightsProcess,
                    dayWeightProcess: `系数来源: [${['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date(dateStr).getDay()]}] = ${d.weight.toFixed(3)}`
                };
            });


            const monthlyTotal = days.reduce((acc, curr) => acc + curr.value, 0);

            // 基于日期判断月份 source，而不是简单比较数值
            // 历史月份 → actual（绿色）
            // 未来月份 → forecast（蓝色）
            // 当前月份 → today-mix（紫色）
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1; // 1-12

            let source: string;
            if (targetYear < currentYear) {
                source = 'actual';
            } else if (targetYear > currentYear) {
                source = 'forecast';
            } else {
                // 当前年份，按月份判断
                if (mData.month < currentMonth) {
                    source = 'actual';
                } else if (mData.month > currentMonth) {
                    source = 'forecast';
                } else {
                    source = 'today-mix';
                }
            }

            result.push({
                month: mData.month,
                key: mData.key,
                days,
                monthlyTotal,
                source,
                forecastVal: forecastMonthTotal,
                actualVal: actualMonthTotal
            });
        }
        return result;
    };

    // --- Export ---
    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // 1. Daily Sheet
        const dailyRows: any[] = [];
        // 2. Weekly Sheet
        const weeklyRows: any[] = [];
        // 3. Monthly Sheet
        const monthlyRows: any[] = [];
        // 4. Yearly Sheet
        const yearlyRows: any[] = [];

        availableYears.forEach(year => {
            const yearData = generateAllData(year);

            let yearTotal = 0;

            // Process Month
            yearData.forEach(m => {
                monthlyRows.push({
                    '年份': year,
                    '月份': m.month,
                    '日期': m.key,
                    '数值': m.monthlyTotal,
                    '来源': m.source === 'actual' ? '实绩' : '预测'
                });
                yearTotal += m.monthlyTotal;

                // Process Days
                m.days.forEach(d => {
                    dailyRows.push({
                        '日期': d.date,
                        '年份': year,
                        '月份': m.month,
                        '数值': d.value,
                        '星期': ['日', '一', '二', '三', '四', '五', '六'][new Date(d.date).getDay()],
                        '来源': d.source === 'actual' ? '实绩' : (d.source === 'today-mix' ? '混合' : '预测')
                    });
                });
            });

            yearlyRows.push({ '年份': year, '年度总额': yearTotal });
        });

        // Generate Weekly (Aggregated globally to handle week numbers correctly)
        // Group dailyRows by Year-Week
        const weekMap = new Map<string, number>();
        dailyRows.forEach(d => {
            const dt = new Date(d['日期']);
            const wk = getISOWeek(dt);
            const k = `${d['年份']}-W${String(wk).padStart(2, '0')}`;
            weekMap.set(k, (weekMap.get(k) || 0) + d['数值']);
        });
        // Sort keys
        const sortedWeeks = Array.from(weekMap.entries()).sort();
        sortedWeeks.forEach(([k, v]) => {
            weeklyRows.push({ '周次': k, '数值': v });
        });


        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "日明细");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weeklyRows), "周汇总");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), "月汇总");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(yearlyRows), "年总览");

        saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `销售明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // --- Rendering Helpers ---
    const formatNumber = (num: number) => num.toLocaleString('en-US');

    const getSourceStyle = (source: string) => {
        if (source === 'today-mix') return 'text-purple-600 font-bold';
        return source === 'actual' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold';
    };

    const getAggregateSource = (actualSum: number, forecastSum: number) => {
        return actualSum >= forecastSum ? 'actual' : 'forecast';
    };

    // --- Renderers ---

    const renderViewSwitcher = () => (
        <div className="flex bg-gray-100 p-1 rounded-lg">
            {[
                { id: 'daily', label: '日', icon: Calendar },
                { id: 'weekly', label: '周', icon: Clock },
                { id: 'monthly', label: '月', icon: BarChart3 },
                { id: 'yearly', label: '年', icon: TrendingUp },
            ].map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as ViewMode)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === mode.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                        }`}
                >
                    <mode.icon size={12} />
                    {mode.label}
                </button>
            ))}
        </div>
    );
    // --- Specific View Renderers (Using generateAllData local calculation for current view) ---

    const renderMonthlyView = () => {
        // Render all available years unless filtered (Requirement 2 implies showing configured period)
        // But table usually shows year rows. Let's just show all available years as rows.
        return (
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
                    {availableYears.map(year => {
                        const yearData = generateAllData(year);
                        return (
                            <tr key={year} className="group hover:bg-gray-50 transition-colors">
                                <td className="py-4 pl-2 font-bold text-gray-900">{year}</td>
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const mData = yearData.find(m => m.month === i + 1);
                                    if (!mData) return <td key={i} className="py-2 text-center text-gray-300">-</td>;

                                    return (
                                        <td key={i} className="py-2 text-center p-1">
                                            <div className="flex flex-col items-center gap-1 relative group/cell">
                                                <div className={`text-xs ${getSourceStyle(mData.source)} text-right w-full pr-4`}>
                                                    {formatNumber(mData.monthlyTotal)}
                                                </div>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-1 hidden group-hover/cell:block bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg z-50 whitespace-pre">
                                                    实绩: {formatNumber(mData.actualVal || 0)}{'\n'}
                                                    预测: {formatNumber(mData.forecastVal || 0)}
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderDailyView = () => {
        const data = generateAllData(yearFilter);
        return (
            <div className="space-y-4">
                {/* Year Filter */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-gray-500">选择年份:</span>
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold outline-none"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                    </select>
                </div>

                {/* Daily Grid */}
                <div ref={scrollContainerRef} className="overflow-x-auto pb-4 custom-scrollbar relative">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600 font-bold">
                            <tr>
                                <th className="py-2 pl-4 sticky left-0 bg-gray-50 z-10 w-20 border-b border-r">月份</th>
                                {Array.from({ length: 31 }).map((_, i) => (
                                    <th key={i} className="py-2 text-center w-12 min-w-[48px] border-b">{i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((month, rowIndex) => (
                                <tr key={month.key} className="hover:bg-gray-50">
                                    <td className="py-3 pl-4 font-bold text-gray-900 sticky left-0 bg-white z-10 border-r">{month.month}月</td>
                                    {Array.from({ length: 31 }).map((_, i) => {
                                        const dayData = month.days.find(d => d.day === i + 1);
                                        if (!dayData) return <td key={i} className="bg-gray-50/50"></td>;

                                        // Determine tooltip position based on row index (prevent top clipping)
                                        const tooltipPositionClass = rowIndex < 2
                                            ? 'top-full mt-1 origin-top'
                                            : 'bottom-full mb-1 origin-bottom';

                                        return (
                                            <td key={i} className={`text-center p-1 ${dayData.isWeekend ? 'bg-blue-50/20' : ''}`}>
                                                <div
                                                    className={`font-mono font-medium ${getSourceStyle(dayData.source)} relative group/day cursor-pointer`}
                                                    onMouseEnter={(e) => handleCellEnter(e, dayData)}
                                                    onMouseLeave={handleCellLeave}
                                                >
                                                    {formatNumber(dayData.value)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Smart Tooltip Portal */}
                <SmartTooltip
                    visible={!!tooltipData}
                    anchorRect={tooltipData?.rect || null}
                    onMouseEnter={handleTooltipEnter}
                    onMouseLeave={handleTooltipLeave}
                    content={tooltipData && (
                        <div className="flex flex-col gap-3 font-sans min-w-[320px]">
                            {/* Title */}
                            <div className="text-blue-400 font-bold border-b border-white/10 pb-2 mb-1 flex justify-between items-center gap-4">
                                <span>预测: (月总数 / 月总权重) × 当日权重</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-sm bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                                        {formatNumber(tooltipData.data.dayForecast)}
                                    </span>
                                    <button
                                        onClick={(e) => handleCopyTooltip(e, tooltipData.data)}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white cursor-pointer pointer-events-auto"
                                        title="复制详细内容"
                                    >
                                        {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5">
                                {/* Monthly Total */}
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-gray-400 font-medium">月总数</span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-200">
                                            {dailyActualsMap.has(tooltipData.data.date)
                                                ? '数据库真实记录'
                                                : (tooltipData.data.source === 'actual' ? '系统实绩值' : (tooltipData.data.isOverride ? '手动调整值' : '系统预测值'))
                                            }：
                                            <span className="font-mono text-white ml-1">{formatNumber(tooltipData.data.value)}</span>
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-pre-wrap leading-relaxed">
                                            {dailyActualsMap.has(tooltipData.data.date) ? '来源: shiplist 原始出库明细' : `过程: ${tooltipData.data.monthlyTotalProcess}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Monthly Weights */}
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-gray-400 font-medium">月总权重</span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-200">∑(每日) = <span className="font-mono text-white">{formatNumber(Number(tooltipData.data.totalWeights))}</span></span>
                                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-pre-wrap leading-relaxed">
                                            过程: {tooltipData.data.totalWeightsProcess}
                                        </span>
                                    </div>
                                </div>

                                {/* Daily Weight */}
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-gray-400 font-medium">当日权重</span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-200">系数 = <span className="font-mono text-white">{Number(tooltipData.data.weight).toFixed(3)}</span></span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">
                                            {tooltipData.data.dayWeightProcess}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                />
                {/* End Portal */}

                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                    <AlertCircle size={10} />
                    <span>日数据基于月度总量与周度权重(Weekly Seasonality)自动拆解</span>
                </div>
            </div>
        );
    };

    const renderWeeklyView = () => {
        const dailyData = generateAllData(yearFilter);
        const weeklyMap = new Map<number, { total: number, actualSum: number, forecastSum: number }>();

        dailyData.forEach(m => {
            m.days.forEach(d => {
                const wk = getISOWeek(new Date(d.date));
                // Handle year transition edge cases if needed, but ISOWeek handles it mostly. 
                // However, simple grouping by ISO week number might mix years if not careful.
                // Since this view is filtered by specific 'yearFilter' (e.g. 2026), 
                // we should be careful about days belonging to previous/next year's week.
                // But for simplicity in this visualization, we trust getISOWeek for the current year context.

                const current = weeklyMap.get(wk) || { total: 0, actualSum: 0, forecastSum: 0 };

                current.total += d.value;
                if (d.source === 'actual') {
                    current.actualSum += d.value;
                } else {
                    current.forecastSum += d.value;
                }

                weeklyMap.set(wk, current);
            });
        });

        // Sorted weeks
        const weeks = Array.from(weeklyMap.entries()).sort((a, b) => a[0] - b[0]);

        // Group by Quarter
        const quarters = [
            { id: 'Q1', label: '第一季度', range: [1, 13], icon: Snowflake },
            { id: 'Q2', label: '第二季度', range: [14, 26], icon: Sun },
            { id: 'Q3', label: '第三季度', range: [27, 39], icon: Leaf },
            { id: 'Q4', label: '第四季度', range: [40, 53], icon: Wind },
        ];

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Year Filter Header */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Clock size={18} />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-medium block">当前视角</span>
                            <span className="text-sm font-bold text-gray-900">周度明细 (Quarterly)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">选择年份:</span>
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(Number(e.target.value))}
                            className="bg-gray-50 hover:bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-blue-700 outline-none cursor-pointer transition-colors"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-8 pb-8">
                    {quarters.map((quarter) => {
                        const quarterWeeks = weeks.filter(([w]) => w >= quarter.range[0] && w <= quarter.range[1]);
                        if (quarterWeeks.length === 0) return null;

                        return (
                            <div key={quarter.id} className="relative">
                                {/* Quarter Label */}
                                <div className="flex items-center gap-2 mb-4 ml-1">
                                    <span className="text-sm font-black text-gray-300 select-none">{quarter.label}</span>
                                    <div className="h-px bg-gray-100 flex-1"></div>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-13 gap-3">
                                    {quarterWeeks.map(([weekNum, data]) => {
                                        const dominantSource = getAggregateSource(data.actualSum, data.forecastSum);
                                        const isActual = dominantSource === 'actual';

                                        return (
                                            <div
                                                key={weekNum}
                                                className={`
                                                    group relative flex flex-col justify-between
                                                    rounded-xl border p-3 hover:shadow-md transition-all duration-200 hover:-translate-y-1
                                                    ${isActual
                                                        ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300'
                                                        : 'bg-white border-gray-100 hover:border-blue-300'
                                                    }
                                                `}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-center relative mb-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActual ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                        周 {weekNum}
                                                    </span>
                                                    {isActual && (
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                    )}
                                                </div>

                                                {/* Value */}
                                                <div className={`text-base font-mono font-bold text-center tracking-tight ${getSourceStyle(dominantSource)}`}>
                                                    {formatNumber(data.total)}
                                                </div>

                                                {/* Decor */}
                                                <div className={`
                                                    absolute bottom-0 left-0 w-full h-0.5 rounded-b-xl
                                                    ${isActual ? 'bg-emerald-400/20' : 'bg-blue-400/20'}
                                                    opacity-0 group-hover:opacity-100 transition-opacity
                                                `} />
                                            </div>
                                        );
                                    })}

                                    {/* Fillers for empty slots if needed to maintain alignment, or just leave as is */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderYearlyView = () => {
        // Show all years
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12

        const data = availableYears.map(year => {
            const yearData = generateAllData(year);
            let total = 0;
            let actualSum = 0;
            let forecastSum = 0;

            yearData.forEach(m => {
                total += m.monthlyTotal;

                // 基于日期判断 source，而不是简单比较数值
                // 历史月份 → actual（绿色）
                // 未来月份 → forecast（蓝色）
                // 当前月份 → 混合（紫色）
                let monthSource: string;
                if (year < currentYear) {
                    monthSource = 'actual';
                } else if (year > currentYear) {
                    monthSource = 'forecast';
                } else {
                    // 当前年份，按月份判断
                    if (m.month < currentMonth) {
                        monthSource = 'actual';
                    } else if (m.month > currentMonth) {
                        monthSource = 'forecast';
                    } else {
                        monthSource = 'today-mix';
                    }
                }

                if (monthSource === 'actual') {
                    actualSum += m.monthlyTotal;
                } else {
                    forecastSum += m.monthlyTotal;
                }
            });

            // 年度 source 判断：完全是历史年 → actual，完全是未来年 → forecast，混合年 → today-mix
            let yearSource: string;
            if (year < currentYear) {
                yearSource = 'actual';
            } else if (year > currentYear) {
                yearSource = 'forecast';
            } else {
                yearSource = 'today-mix'; // 当前年份包含历史和未来
            }

            return { year, total, source: yearSource };
        });

        return (
            <div className="w-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="py-3 pl-4 rounded-l-lg">年份</th>
                            <th className="py-3 text-right pr-12 rounded-r-lg">年度总额</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map(d => (
                            <tr key={d.year} className="hover:bg-gray-50">
                                <td className="py-4 pl-4 font-bold text-gray-900">{d.year}</td>
                                <td className={`py-4 text-right pr-12 text-lg font-mono ${getSourceStyle(d.source)}`}>
                                    {formatNumber(d.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };


    const renderContent = () => {
        switch (viewMode) {
            case 'daily': return renderDailyView();
            case 'weekly': return renderWeeklyView();
            case 'yearly': return renderYearlyView();
            case 'monthly': default: return renderMonthlyView();
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100 mb-8 transition-all">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        销售实绩&预测明细
                        {isOpen && renderViewSwitcher()}
                    </h2>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>实绩</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>预测</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span>今日(Max)</span>
                        <span className="ml-2 opacity-60">(历史取实绩, 未来取预测)</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isOpen && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-100 shadow-sm active:scale-95"
                        >
                            <Download size={14} />
                            导出Excel
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition-all border border-gray-100 shadow-sm active:scale-95"
                    >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0 overflow-hidden'}`}>
                {renderContent()}
            </div>
        </div>
    );
};

export default ForecastDataGrid;
