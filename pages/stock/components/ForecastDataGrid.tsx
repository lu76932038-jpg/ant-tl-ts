import React, { useState, useMemo } from 'react';
import { ChevronDown, Calendar, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { format, getISOWeek, getDate, getMonth, getYear as getFnsYear } from 'date-fns';

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ForecastDataGridProps {
    isOpen: boolean;
    onToggle: () => void;
    forecastGrid: Record<number, { year: number, month: number, key: string }[]>;
    forecastOverrides: Record<string, number>;
    setForecastOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    calculatedForecasts: Record<string, number>;
    dayOfWeekFactors?: number[];
}

const ForecastDataGrid: React.FC<ForecastDataGridProps> = ({
    isOpen,
    onToggle,
    forecastGrid,
    forecastOverrides,
    setForecastOverrides,
    calculatedForecasts,
    dayOfWeekFactors = []
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('monthly');
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

    // --- Data Transformation Helpers ---

    // 1. Get List of Years
    const availableYears = useMemo(() => Object.keys(forecastGrid).map(Number).sort((a, b) => a - b), [forecastGrid]);

    // 2. Generate Daily Data (Drill-down from Monthly)
    const getDailyData = (year: number) => {
        const months = forecastGrid[year] || [];
        const result = [];

        for (const mData of months) {
            const daysCount = new Date(year, mData.month, 0).getDate();
            const monthlyTotal = forecastOverrides[mData.key] ?? calculatedForecasts[mData.key] ?? 0;

            // Calculate daily weights sum for this month
            let totalWeights = 0;
            // dayOfWeekFactors: 0=Mon, ... 6=Sun
            // JS getDay(): 0=Sun, 1=Mon...
            const getFactor = (date: Date) => {
                if (!dayOfWeekFactors || dayOfWeekFactors.length === 0) return 1;
                const day = date.getDay();
                const factorIndex = day === 0 ? 6 : day - 1;
                return dayOfWeekFactors[factorIndex] || 1;
            };

            for (let d = 1; d <= daysCount; d++) {
                totalWeights += getFactor(new Date(year, mData.month - 1, d));
            }

            const dailyBase = totalWeights > 0 ? monthlyTotal / totalWeights : monthlyTotal / daysCount;

            const days = [];
            for (let d = 1; d <= daysCount; d++) {
                const dateObj = new Date(year, mData.month - 1, d);
                const factor = getFactor(dateObj);
                const val = Math.round(dailyBase * factor);

                days.push({
                    day: d,
                    date: `${year}-${String(mData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                    value: val,
                    monthKey: mData.key,
                    isWeekend: [0, 6].includes(dateObj.getDay())
                });
            }
            result.push({ month: mData.month, key: mData.key, days });
        }
        return result;
    };

    // 3. Generate Weekly Data
    const getWeeklyData = (year: number) => {
        const daily = getDailyData(year); // Reuse daily generation
        const weeklyMap = new Map<number, number>();

        daily.forEach(m => {
            m.days.forEach(d => {
                const dateObj = new Date(d.date);
                const weekNum = getISOWeek(dateObj);
                weeklyMap.set(weekNum, (weeklyMap.get(weekNum) || 0) + d.value);
            });
        });

        // Convert Map to Array [1..53]
        return Array.from({ length: 53 }).map((_, i) => ({
            week: i + 1,
            value: weeklyMap.get(i + 1) || 0
        })).filter(w => w.value > 0); // Optional: filter empty weeks
    };

    // 4. Generate Yearly Data
    const getYearlyData = () => {
        return availableYears.map(year => {
            const months = forecastGrid[year] || [];
            let total = 0;
            months.forEach(m => {
                total += forecastOverrides[m.key] ?? calculatedForecasts[m.key] ?? 0;
            });
            return { year, total };
        });
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

    const renderContent = () => {
        switch (viewMode) {
            case 'daily':
                return renderDailyView();
            case 'weekly':
                return renderWeeklyView();
            case 'yearly':
                return renderYearlyView();
            case 'monthly':
            default:
                return renderMonthlyView();
        }
    };

    // --- Specific View Renderers ---

    const renderMonthlyView = () => (
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

                            const val = forecastOverrides[monthData.key] ?? calculatedForecasts[monthData.key] ?? 0;
                            const isOverridden = forecastOverrides[monthData.key] !== undefined;

                            return (
                                <td key={i} className="py-2 text-center p-1">
                                    <div className="flex flex-col items-center gap-1">
                                        {/* <div className="text-[10px] text-gray-400 scale-90 origin-bottom h-3">
                                            {calculatedForecasts[monthData.key] ? calculatedForecasts[monthData.key] : '-'}
                                        </div> */}
                                        <input
                                            type="text"
                                            placeholder="0"
                                            className={`w-14 text-center py-1.5 rounded text-xs font-bold border ${isOverridden ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500'} focus:outline-none transition-all`}
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
    );

    const renderDailyView = () => {
        const data = getDailyData(yearFilter);
        return (
            <div className="space-y-4">
                {/* Year Filter */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-gray-500">选择年份:</span>
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                    </select>
                </div>

                {/* Daily Grid */}
                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600 font-bold">
                            <tr>
                                <th className="py-2 pl-4 sticky left-0 bg-gray-50 z-10 w-20 border-b border-r">月份</th>
                                {Array.from({ length: 31 }).map((_, i) => (
                                    <th key={i} className="py-2 text-center w-10 min-w-[40px] border-b">{i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((month) => (
                                <tr key={month.key} className="hover:bg-gray-50">
                                    <td className="py-3 pl-4 font-bold text-gray-900 sticky left-0 bg-white z-10 border-r">{month.month}月</td>
                                    {Array.from({ length: 31 }).map((_, i) => {
                                        const dayData = month.days.find(d => d.day === i + 1);
                                        if (!dayData) return <td key={i} className="bg-gray-50/50"></td>; // Padding for non-exist days

                                        return (
                                            <td key={i} className={`text-center p-1 ${dayData.isWeekend ? 'bg-blue-50/30' : ''}`}>
                                                <div className="text-gray-600 font-medium">
                                                    {dayData.value}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">* 日数据目前基于月总额平均计算（包含周末），暂不支持直接单日编辑。</p>
            </div>
        );
    };

    const renderWeeklyView = () => {
        const data = getWeeklyData(yearFilter);
        // Group into rows of 13 weeks (quarterly-ish view) to avoid horizontal scroll hell
        // Or just one long scroll row? Let's do simple list for now.
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-gray-500">选择年份:</span>
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                    {data.map(week => (
                        <div key={week.week} className="bg-gray-50 rounded p-2 text-center border border-gray-100">
                            <div className="text-[10px] text-gray-400 font-bold uppercase">Week {week.week}</div>
                            <div className="text-sm font-bold text-blue-600 mt-0.5">{week.value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderYearlyView = () => {
        const data = getYearlyData();
        return (
            <div className="w-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="py-3 pl-4 rounded-l-lg">年份</th>
                            <th className="py-3 text-right pr-12 rounded-r-lg">年度总预测</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map(d => (
                            <tr key={d.year} className="hover:bg-gray-50">
                                <td className="py-4 pl-4 font-bold text-gray-900">{d.year}</td>
                                <td className="py-4 text-right pr-12 font-bold text-blue-600 text-lg">
                                    {d.total.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100 mb-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        预测数量明细
                        {isOpen && renderViewSwitcher()}
                    </h2>
                    <p className="text-xs text-gray-400">系统根据配置自动计算，支持多维度查看数据</p>
                </div>
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-all border border-gray-100 shadow-sm active:scale-95"
                >
                    {isOpen ? '收起表格' : '查看详细表格'}
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>
            </div>

            <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0 overflow-hidden'}`}>
                {/* 
                  Important: overflow-auto needed for daily view scrolling, 
                  but we put it inside content renderers where needed to avoid clipping dropdowns if any (none here yet)
                */}
                {renderContent()}
            </div>
        </div>
    );
};

export default ForecastDataGrid;
