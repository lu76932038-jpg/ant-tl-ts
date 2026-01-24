import React, { useState } from 'react';
import { Settings, RefreshCw, Loader2, Plus, Trash2, Truck, Package, Clock } from 'lucide-react';
import { SupplierInfo, PriceTier } from '../types';

interface SupplierCardProps {
    supplier: SupplierInfo | null;
    isSaving: boolean;
    onSave: (newInfo: SupplierInfo) => void;
}

const defaultPriceTiers: PriceTier[] = [
    { minQty: 1, price: 100, leadTime: 30 },
];

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, isSaving, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editInfo, setEditInfo] = useState<SupplierInfo | null>(null);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>(defaultPriceTiers);

    // 初始化编辑信息
    React.useEffect(() => {
        if (supplier) {
            setEditInfo(supplier);
            setPriceTiers(supplier.priceTiers?.length ? supplier.priceTiers : defaultPriceTiers);
        }
    }, [supplier]);

    if (!supplier || !editInfo) return null;

    const handleSave = () => {
        if (editInfo) {
            onSave({ ...editInfo, priceTiers });
            setIsEditing(false);
        }
    };

    const handleAddTier = () => {
        const lastTier = priceTiers[priceTiers.length - 1];
        setPriceTiers([...priceTiers, {
            minQty: lastTier ? lastTier.minQty + 100 : 1,
            price: lastTier ? Math.round(lastTier.price * 0.95) : 100,
            leadTime: 30
        }]);
    };

    const handleRemoveTier = (index: number) => {
        if (priceTiers.length > 1) {
            setPriceTiers(priceTiers.filter((_, i) => i !== index));
        }
    };

    const handleTierChange = (index: number, field: keyof PriceTier, value: number) => {
        const newTiers = [...priceTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setPriceTiers(newTiers);
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Settings size={18} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">供应商策略设置</h3>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                                保存设置
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            <RefreshCw size={12} />
                            编辑设置
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 1. 供应商基本信息 */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">供应商信息</h4>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">供应商名称</span>
                                {isEditing ? (
                                    <input
                                        className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                                        value={editInfo.name}
                                        onChange={e => setEditInfo({ ...editInfo, name: e.target.value })}
                                    />
                                ) : (
                                    <div className="text-sm font-bold text-gray-900">{supplier.name}</div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">供应商编码</span>
                                {isEditing ? (
                                    <input
                                        className="w-full text-sm font-mono text-indigo-600 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                                        value={editInfo.code}
                                        onChange={e => setEditInfo({ ...editInfo, code: e.target.value })}
                                    />
                                ) : (
                                    <div className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">{supplier.code}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-100"></div>

                {/* 2. 交付模式配置 */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-800">交付模式</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className={`bg-blue-50/50 rounded-xl border ${isEditing ? 'border-blue-200' : 'border-blue-100'} p-4 space-y-2`}>
                            <div className="flex items-center gap-2">
                                <Truck size={16} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-900">快速交付</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={12} className="text-blue-400" />
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min={1}
                                        value={editInfo.leadTimeFast || 7}
                                        onChange={e => setEditInfo({ ...editInfo, leadTimeFast: parseInt(e.target.value) || 7 })}
                                        className="w-16 text-sm font-bold text-blue-700 bg-white border border-blue-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-blue-700">{supplier.leadTimeFast || 7}</span>
                                )}
                                <span className="text-xs text-blue-500">天</span>
                            </div>
                        </div>

                        <div className={`bg-emerald-50/50 rounded-xl border ${isEditing ? 'border-emerald-200' : 'border-emerald-100'} p-4 space-y-2`}>
                            <div className="flex items-center gap-2">
                                <Package size={16} className="text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-900">经济交付</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={12} className="text-emerald-400" />
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min={1}
                                        value={editInfo.leadTimeEconomic || 30}
                                        onChange={e => setEditInfo({ ...editInfo, leadTimeEconomic: parseInt(e.target.value) || 30 })}
                                        className="w-16 text-sm font-bold text-emerald-700 bg-white border border-emerald-200 rounded px-2 py-1 focus:border-emerald-500 focus:outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-emerald-700">{supplier.leadTimeEconomic || 30}</span>
                                )}
                                <span className="text-xs text-emerald-500">天</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-100"></div>

                {/* 3. 阶梯价格 */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                            <h4 className="text-sm font-bold text-gray-800">阶梯价格</h4>
                        </div>
                        {isEditing && (
                            <button
                                onClick={handleAddTier}
                                className="text-xs text-amber-600 font-bold hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Plus size={12} />
                                添加阶梯
                            </button>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                        {/* 表头 */}
                        <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-gray-100/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            <div>起订量</div>
                            <div>单价 (¥)</div>
                            <div>交期 (天)</div>
                            {isEditing && <div className="text-center">操作</div>}
                        </div>

                        {/* 价格行 */}
                        <div className="divide-y divide-gray-100">
                            {priceTiers.map((tier, index) => (
                                <div key={index} className="grid grid-cols-4 gap-2 px-4 py-3 items-center">
                                    <div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={1}
                                                value={tier.minQty}
                                                onChange={e => handleTierChange(index, 'minQty', parseInt(e.target.value) || 1)}
                                                className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-gray-700">≥ {tier.minQty}</span>
                                        )}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={tier.price}
                                                onChange={e => handleTierChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-900">¥{tier.price.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={1}
                                                value={tier.leadTime}
                                                onChange={e => handleTierChange(index, 'leadTime', parseInt(e.target.value) || 1)}
                                                className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-gray-700">{tier.leadTime} 天</span>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="text-center">
                                            <button
                                                onClick={() => handleRemoveTier(index)}
                                                disabled={priceTiers.length <= 1}
                                                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SupplierCard;
