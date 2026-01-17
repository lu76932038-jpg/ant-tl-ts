import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ForecastDataGridProps {
    isOpen: boolean;
    onToggle: () => void;
    forecastGrid: Record<number, { year: number, month: number, key: string }[]>;
    forecastOverrides: Record<string, number>;
    setForecastOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    calculatedForecasts: Record<string, number>;
}

const ForecastDataGrid: React.FC<ForecastDataGridProps> = ({
    isOpen,
    onToggle,
    forecastGrid,
    forecastOverrides,
    setForecastOverrides,
    calculatedForecasts
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900">预测数量</h2>
                    <p className="text-xs text-gray-400">系统根据配置自动计算，支持人工手动调整干预</p>
                </div>
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-all border border-gray-100 shadow-sm active:scale-95"
                >
                    {isOpen ? '收起表格' : '查看详细预测数据'}
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>
            </div>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
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
    );
};

export default ForecastDataGrid;
