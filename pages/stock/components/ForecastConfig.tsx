import React, { useState, useEffect } from 'react';
import {
    Settings2,
    RefreshCw,
    Timer,
    Hourglass,
    Calendar,
    Clock,
    Copy,
    Layers,
    TrendingUp,
    History,
    ChevronRight,
    Calculator,
    Percent,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import MultiThumbSlider from '../../../components/MultiThumbSlider';

interface ForecastConfigProps {
    isSaving: boolean;
    onRunForecast: (overrides?: any) => void;

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
    // Local Edit State
    const [isEditing, setIsEditing] = useState(false);

    // Draft State (for Edit Mode)
    const [draftStart, setDraftStart] = useState(selectedStartMonth);
    const [draftForecast, setDraftForecast] = useState(selectedForecastMonth);
    const [draftBenchmark, setDraftBenchmark] = useState(benchmarkType);
    const [draftRatio, setDraftRatio] = useState(ratioAdjustment);
    const [draftMomRange, setDraftMomRange] = useState(momRange);
    const [draftMomTime, setDraftMomTime] = useState(momTimeSliders);
    const [draftMomWeight, setDraftMomWeight] = useState(momWeightSliders);
    const [draftYoyRange, setDraftYoyRange] = useState(yoyRange);
    const [draftYoyWeight, setDraftYoyWeight] = useState(yoyWeightSliders);

    // Sync Props to Draft when entering Edit Mode or Props change
    useEffect(() => {
        if (!isEditing) {
            setDraftStart(selectedStartMonth);
            setDraftForecast(selectedForecastMonth);
            setDraftBenchmark(benchmarkType);
            setDraftRatio(ratioAdjustment);
            setDraftMomRange(momRange);
            setDraftMomTime(momTimeSliders);
            setDraftMomWeight(momWeightSliders);
            setDraftYoyRange(yoyRange);
            setDraftYoyWeight(yoyWeightSliders);
        }
    }, [isEditing, selectedStartMonth, selectedForecastMonth, benchmarkType, ratioAdjustment, momRange, momTimeSliders, momWeightSliders, yoyRange, yoyWeightSliders]);

    const handleSave = () => {
        // Optimistic Commit
        setSelectedStartMonth(draftStart);
        setSelectedForecastMonth(draftForecast);
        setBenchmarkType(draftBenchmark);
        setRatioAdjustment(draftRatio);
        setMomRange(draftMomRange);
        setMomTimeSliders(draftMomTime);
        setMomWeightSliders(draftMomWeight);
        setYoyRange(draftYoyRange);
        setYoyWeightSliders(draftYoyWeight);

        setIsEditing(false);

        // Pass the draft values directly to ensure the API call uses the new config immediately
        // bypassing React state update latency
        const updates = {
            start_year_month: draftStart,
            forecast_year_month: draftForecast,
            benchmark_type: draftBenchmark,
            ratio_adjustment: draftRatio,
            mom_range: draftMomRange,
            mom_time_sliders: draftMomTime,
            mom_weight_sliders: draftMomWeight,
            yoy_range: draftYoyRange,
            yoy_weight_sliders: draftYoyWeight
        };

        // Trigger calculation (allow UI to update state first visually, though logic uses overrides)
        setTimeout(() => onRunForecast(updates), 0);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Revert will happen automatically via useEffect
    };

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden">

            {/* Header Area - Fixed Height to prevent layout shift between View/Edit modes */}
            <div className="px-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm h-[84px]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <Settings2 size={16} />
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 leading-none">
                        <span className="text-sm font-black text-slate-800">销售</span>
                        <span className="text-sm font-black text-slate-800">预测</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div>
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700 font-bold bg-white border border-slate-200 rounded-md shadow-sm transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-1"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1"
                        >
                            <Settings2 size={12} />
                            修改
                        </button>
                    )}
                </div>
            </div>

            <div className={`px-4 pt-3 pb-1 space-y-2 transition-opacity duration-200 ${isEditing ? 'opacity-100' : 'opacity-80 pointer-events-none grayscale-[0.3]'}`}>

                {/* 1. Forecast Horizon (Date Range) */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Calendar size={12} />
                        <span>预测周期</span>
                    </div>
                    <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg ring-1 ring-slate-200/50 relative">
                        <select
                            value={draftStart}
                            onChange={e => setDraftStart(e.target.value)}
                            disabled={!isEditing}
                            className="w-1/2 bg-transparent border-none text-[10px] font-bold text-slate-700 py-1 px-0 cursor-pointer focus:ring-0 text-center hover:bg-white/50 rounded-md transition-colors appearance-none"
                            style={{ textAlignLast: 'center' }}
                        >
                            {startOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="text-slate-400 px-0.5 shrink-0">
                            <ChevronRight size={12} strokeWidth={2.5} />
                        </div>
                        <select
                            value={draftForecast}
                            onChange={e => setDraftForecast(e.target.value)}
                            disabled={!isEditing}
                            className="w-1/2 bg-transparent border-none text-[10px] font-bold text-slate-700 py-1 px-0 cursor-pointer focus:ring-0 text-center hover:bg-white/50 rounded-md transition-colors appearance-none"
                            style={{ textAlignLast: 'center' }}
                        >
                            {forecastOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2. Model & Ratio (Aligned Header Layout) */}
                <div className="space-y-1">
                    {/* Row 1: Labels Line */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 block ml-0.5">预测模型</label>

                        {/* Ratio Input (Right Aligned on the same line as Model Label) */}
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-slate-400">修正</label>
                            <div className="relative group/input flex items-center w-[54px]">
                                <input
                                    type="number"
                                    value={draftRatio}
                                    onChange={(e) => setDraftRatio(Math.round(Number(e.target.value)))}
                                    disabled={!isEditing}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-1 text-[10px] font-mono font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all text-right pr-3 disabled:opacity-60 disabled:bg-slate-100"
                                    placeholder="0"
                                />
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 select-none">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Model Buttons (Below Model Label) */}
                    <div className="flex bg-slate-100/80 p-0.5 rounded-md w-full">
                        <button
                            onClick={() => isEditing && setDraftBenchmark('mom')}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold leading-none transition-all duration-200 ${draftBenchmark === 'mom' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            环比
                        </button>
                        <button
                            onClick={() => isEditing && setDraftBenchmark('yoy')}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold leading-none transition-all duration-200 ${draftBenchmark === 'yoy' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            同比
                        </button>
                    </div>
                </div>

                {/* 3. Detailed Config Panel */}
                <div className="pt-0.5">
                    {draftBenchmark === 'mom' ? (
                        <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Time Horizon Selector (Ultra Compact) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">采样</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/40">
                                    {[
                                        { val: 1, label: '1月' },
                                        { val: 6, label: '6月' },
                                        { val: 12, label: '12月' }
                                    ].map(m => (
                                        <button
                                            key={m.val}
                                            onClick={() => isEditing && setDraftMomRange(m.val as any)}
                                            className={`flex items-center justify-center py-1 px-1 rounded-md transition-all duration-200 text-[10px] font-bold
                                                ${draftMomRange === m.val
                                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                                    : 'text-slate-500 hover:bg-slate-200/40'
                                                }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Decay Model -> 时间比 */}
                            <div className="flex flex-col">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">时间比</label>
                                    <div className="text-[9px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 scale-90 origin-right">
                                        {Math.round(draftMomRange * (draftMomTime[0] / 100))}月 / {Math.round(draftMomRange * (draftMomTime[1] - draftMomTime[0]) / 100)}月 / {Math.round(draftMomRange * (100 - draftMomTime[1]) / 100)}月
                                    </div>
                                </div>
                                <MultiThumbSlider
                                    values={draftMomTime}
                                    onChange={setDraftMomTime}
                                    colors={['#E0E7FF', '#A5B4FC', '#6366F1']}
                                    disabled={!isEditing}
                                />
                            </div>

                            {/* Weight Factor */}
                            <div className="flex flex-col">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">加权系数</label>
                                    <div className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 scale-90 origin-right">
                                        {draftMomWeight[0]}% / {draftMomWeight[1] - draftMomWeight[0]}% / {100 - draftMomWeight[1]}%
                                    </div>
                                </div>
                                <MultiThumbSlider
                                    values={draftMomWeight}
                                    onChange={setDraftMomWeight}
                                    colors={['#D1FAE5', '#6EE7B7', '#10B981']}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* History Depth Selector (Reduced Height) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-0.5">回溯深度</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/40">
                                    {[
                                        { val: 1, label: '1年' },
                                        { val: 2, label: '2年' },
                                        { val: 3, label: '3年' }
                                    ].map(y => (
                                        <button
                                            key={y.val}
                                            onClick={() => isEditing && setDraftYoyRange(y.val as any)}
                                            className={`flex items-center justify-center py-1 px-1 rounded-md transition-all duration-200 text-[10px] font-bold
                                                ${draftYoyRange === y.val
                                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                                    : 'text-slate-500 hover:bg-slate-200/40'
                                                }`}
                                        >
                                            {y.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Weighted Average */}
                            {draftYoyRange > 1 ? (
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">加权</label>
                                        <div className="text-[9px] font-mono font-bold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100 whitespace-nowrap scale-90 origin-right">
                                            {draftYoyRange === 2
                                                ? `${draftYoyWeight[0]}% / ${100 - draftYoyWeight[0]}%`
                                                : `${draftYoyWeight[0]}% / ${draftYoyWeight[1] - draftYoyWeight[0]}% / ${100 - draftYoyWeight[1]}%`
                                            }
                                        </div>
                                    </div>
                                    <MultiThumbSlider
                                        values={draftYoyRange === 2 ? [draftYoyWeight[0]] : draftYoyWeight}
                                        onChange={setDraftYoyWeight}
                                        colors={['#FFEDD5', '#FDBA74', '#F97316']}
                                        disabled={!isEditing}
                                    />
                                    <div className="flex justify-between text-[8px] text-slate-400 px-1 font-bold mt-0.5">
                                        <span>{new Date().getFullYear() - 1}</span>
                                        {draftYoyRange >= 2 && <span>{new Date().getFullYear() - 2}</span>}
                                        {draftYoyRange >= 3 && <span>{new Date().getFullYear() - 3}</span>}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                                    <span className="text-[9px] font-bold text-slate-400">单一年份基准 · 100% 权重</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="bg-slate-50 px-4 py-1.5 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 leading-tight font-medium space-y-0.5">
                    <p><span className="text-red-500 font-bold mr-0.5">*</span>配置调整仅影响本次测算结果</p>
                    <p><span className="text-red-500 font-bold mr-0.5">*</span>如需长期生效，点击保存</p>
                </div>
            </div>
        </div>
    );
};

export default ForecastConfig;
