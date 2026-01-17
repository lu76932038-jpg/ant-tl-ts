import React from 'react';
import { MoreHorizontal, Loader2, RefreshCw, Timer, Hourglass, Calendar, Clock, Copy, Layers } from 'lucide-react';
import MultiThumbSlider from '../../../components/MultiThumbSlider';

interface ForecastConfigProps {
    isSaving: boolean;
    onRunForecast: () => void;

    // Date Range
    selectedStartMonth: string;
    setSelectedStartMonth: (val: string) => void;
    selectedForecastMonth: string;
    setSelectedForecastMonth: (val: string) => void;
    startOptions: string[];
    forecastOptions: string[];

    // Benchmark Config
    benchmarkType: 'mom' | 'yoy';
    setBenchmarkType: (val: 'mom' | 'yoy') => void;

    // MoM Config
    momRange: 3 | 6 | 12;
    setMomRange: (val: 3 | 6 | 12) => void;
    momTimeSliders: number[];
    setMomTimeSliders: (val: number[]) => void;
    momWeightSliders: number[];
    setMomWeightSliders: (val: number[]) => void;

    // YoY Config
    yoyRange: 1 | 2 | 3;
    setYoyRange: (val: 1 | 2 | 3) => void;
    yoyWeightSliders: number[];
    setYoyWeightSliders: (val: number[]) => void;

    // Ratio
    ratioAdjustment: number;
    setRatioAdjustment: (val: number) => void;
}

const ForecastConfig: React.FC<ForecastConfigProps> = ({
    isSaving,
    onRunForecast,
    selectedStartMonth, setSelectedStartMonth,
    selectedForecastMonth, setSelectedForecastMonth,
    startOptions, forecastOptions,
    benchmarkType, setBenchmarkType,
    momRange, setMomRange,
    momTimeSliders, setMomTimeSliders,
    momWeightSliders, setMomWeightSliders,
    yoyRange, setYoyRange,
    yoyWeightSliders, setYoyWeightSliders,
    ratioAdjustment, setRatioAdjustment
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                    <MoreHorizontal className="text-gray-400 rotate-90" size={20} />
                    销售预测配置
                </div>
                <button
                    onClick={onRunForecast}
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
    );
};

export default ForecastConfig;
