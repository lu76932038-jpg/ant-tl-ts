import React, { useState, useEffect } from 'react';
import {
    Settings2,
    Save,
    Loader2,
    ShieldCheck,
    AlertTriangle,
    Package,
    Users,
    Calendar,
    Archive,
    Clock,
    Truck
} from 'lucide-react';
import { api } from '../../services/api';

const StockDefaults: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Config States
    const [defaults, setDefaults] = useState({
        stocking_period: 3,
        min_outbound_freq: 10,
        min_customer_count: 3,
        safety_stock_days: 1,
        dead_stock_days: 180,
        is_stocking_enabled: false,
        buffer_days: 30,
        lead_time_economic: 30
    });

    useEffect(() => {
        fetchDefaults();
    }, []);

    const fetchDefaults = async () => {
        try {
            setIsLoading(true);
            const res: any = await api.get('/settings/stock-defaults');
            if (res) {
                setDefaults(prev => ({ ...prev, ...res }));
            }
        } catch (error) {
            console.error("Failed to load defaults", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.post('/settings/stock-defaults', defaults);
            alert('全局默认配置已保存，后续新建产品将自动应用此配置。');
        } catch (error) {
            console.error("Failed to save defaults", error);
            alert('保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: string, val: any) => {
        setDefaults(prev => ({ ...prev, [key]: val }));
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Settings2 className="text-white h-6 w-6" />
                        </div>
                        备货策略默认配置
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 font-medium ml-[52px]">
                        配置新建产品的初始默认参数，标准化备货流程
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    保存全局配置
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. 准入标准配置 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <ShieldCheck size={18} />
                            </div>
                            <span className="font-bold text-gray-800">备库准入标准</span>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">数据考核周期 (月)</label>
                                <div className="relative">
                                    <input
                                        type="range" min="1" max="12" step="1"
                                        value={defaults.stocking_period}
                                        onChange={e => handleChange('stocking_period', Number(e.target.value))}
                                        className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between mt-2 font-mono font-bold text-sm text-gray-700">
                                        <span>1个月</span>
                                        <span className="text-blue-600">{defaults.stocking_period} 个月</span>
                                        <span>12个月</span>
                                    </div>
                                </div>
                                <p className="mt-2 text-[11px] text-gray-400">系统将基于此周期内的历史数据来评估产品是否值得备货</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Package size={12} /> 最小出库项次
                                </label>
                                <input
                                    type="number"
                                    value={defaults.min_outbound_freq}
                                    onChange={e => handleChange('min_outbound_freq', Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Users size={12} /> 最小客户数
                                </label>
                                <input
                                    type="number"
                                    value={defaults.min_customer_count}
                                    onChange={e => handleChange('min_customer_count', Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. 库存策略配置 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Archive size={18} />
                            </div>
                            <span className="font-bold text-gray-800">默认库存策略</span>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">默认安全库存 (月)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range" min="0.5" max="6" step="0.5"
                                    value={defaults.safety_stock_days}
                                    onChange={e => handleChange('safety_stock_days', Number(e.target.value))}
                                    className="flex-1 h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                />
                                <span className="w-20 text-right font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-sm">
                                    {defaults.safety_stock_days} M
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Clock size={12} /> 缓冲天数
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={defaults.buffer_days}
                                        onChange={e => handleChange('buffer_days', Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all pl-3"
                                    />
                                    <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">天</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Truck size={12} /> 默认经济交期
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={defaults.lead_time_economic}
                                        onChange={e => handleChange('lead_time_economic', Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all pl-3"
                                    />
                                    <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">天</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 生命周期与杂项 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow duration-300 md:col-span-2">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                                <AlertTriangle size={18} />
                            </div>
                            <span className="font-bold text-gray-800">生命周期管控</span>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">呆滞判定阈值</label>
                            <div className="relative">
                                <input
                                    type="range" min="30" max="365" step="30"
                                    value={defaults.dead_stock_days}
                                    onChange={e => handleChange('dead_stock_days', Number(e.target.value))}
                                    className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-orange-500"
                                />
                                <div className="flex justify-between mt-2 font-mono font-bold text-sm text-gray-700">
                                    <span>30天</span>
                                    <span className="text-orange-600 bg-orange-50 px-2 rounded">{defaults.dead_stock_days} 天</span>
                                    <span>365天</span>
                                </div>
                            </div>
                            <p className="mt-2 text-[11px] text-gray-400">超过此天数无出库记录将被标记为呆滞品</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">默认启用备货</h3>
                                <p className="text-xs text-gray-500 mt-1">新建产品是否默认开启备货状态？</p>
                            </div>
                            <button
                                onClick={() => handleChange('is_stocking_enabled', !defaults.is_stocking_enabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${defaults.is_stocking_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`absolute left-0 inline-block w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${defaults.is_stocking_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StockDefaults;
