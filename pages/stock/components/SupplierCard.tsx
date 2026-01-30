import React, { useState } from 'react';
import {
    Settings,
    RefreshCw,
    Loader2,
    Plus,
    Trash2,
    Truck,
    Package,
    Clock,
    Building2,
    Hash,
    ChevronRight,
    CircleDot,
    DollarSign,
    Box,
    ShieldCheck
} from 'lucide-react';
import { api } from '@/services/api';
import { SupplierInfo, PriceTier } from '../types';

interface SupplierCardProps {
    sku: string;
    supplier: SupplierInfo | null;
    isSaving: boolean;
    onSave: (newInfo: SupplierInfo) => Promise<void>;
}

const defaultPriceTiers: PriceTier[] = [];

const SupplierCard: React.FC<SupplierCardProps> = ({ sku, supplier, isSaving, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editInfo, setEditInfo] = useState<SupplierInfo | null>(null);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>(defaultPriceTiers);
    const [availableSuppliers, setAvailableSuppliers] = useState<{ name: string, code: string }[]>([]);

    // 加载全量供应商列表
    React.useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const result: any = await api.get('/products/suppliers');
                if (Array.isArray(result)) {
                    setAvailableSuppliers(result.map(s => ({ name: s.name, code: s.supplier_code || s.code })));
                }
            } catch (error) {
                console.error('Failed to fetch suppliers list:', error);
            }
        };
        fetchSuppliers();
    }, []);

    // 初始化编辑信息
    React.useEffect(() => {
        if (supplier) {
            setEditInfo(supplier);
            setPriceTiers(supplier.priceTiers?.length ? supplier.priceTiers : defaultPriceTiers);
        }
    }, [supplier]);

    // 切换供应商时拉取对应策略
    const fetchSupplierStrategy = async (supplierCode: string) => {
        try {
            console.log(`Fetching strategy for sku=${sku}, supplier=${supplierCode}`);
            const res: any = await api.get(`/products/${sku}/strategy?supplier_code=${supplierCode}`);
            if (res && res.supplier && res.supplier.priceTiers) {
                console.log('Found strategy for supplier:', res.supplier);
                setPriceTiers(res.supplier.priceTiers);
            } else {
                console.log('No strategy found for supplier, resetting tiers.');
                setPriceTiers([]);
            }
        } catch (error) {
            console.error('Error fetching supplier strategy:', error);
            // 出错时不清空，以免误操作？或者给个提示。这里选择清空以防误导。
            setPriceTiers([]);
        }
    };

    if (!supplier || !editInfo) return null;

    const handleSave = async () => {
        const sortedTiers = [...priceTiers].sort((a, b) => a.minQty - b.minQty);
        await onSave({ ...editInfo, priceTiers: sortedTiers });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (supplier) {
            setEditInfo(supplier);
            setPriceTiers(supplier.priceTiers?.length ? supplier.priceTiers : defaultPriceTiers);
        }
    };

    const handleAddTier = () => {
        const lastTier = priceTiers[priceTiers.length - 1];
        setPriceTiers([...priceTiers, {
            minQty: lastTier ? lastTier.minQty + 100 : 1,
            price: lastTier ? Math.round(lastTier.price * 0.95) : 100,
            leadTime: lastTier ? lastTier.leadTime : 30,
            isSelected: false
        }]);
    };

    const handleRemoveTier = (index: number) => {
        if (priceTiers.length > 0) {
            const newTiers = priceTiers.filter((_, i) => i !== index);
            if (index < priceTiers.length && priceTiers[index].isSelected && newTiers.length > 0) {
                newTiers[0].isSelected = true;
            }
            setPriceTiers(newTiers);
        }
    };

    const handleTierChange = (index: number, field: keyof PriceTier, value: any) => {
        const newTiers = [...priceTiers];
        if (field === 'isSelected') {
            newTiers.forEach((t, i) => t.isSelected = (i === index));
        } else {
            newTiers[index] = { ...newTiers[index], [field]: value };
        }
        setPriceTiers(newTiers);
    };

    return (
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 overflow-hidden">
            {/* 1. Header Area */}
            <div className="px-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 backdrop-blur-sm h-[84px]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <Building2 size={16} />
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 leading-none">
                        <span className="text-sm font-black text-slate-800">供应商</span>
                        <span className="text-sm font-black text-slate-800">策略</span>
                    </div>
                </div>

                <div>
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <button onClick={handleCancel} className="px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700 font-bold bg-white border border-slate-200 rounded-md shadow-sm transition-all">
                                取消
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-70 transition-all flex items-center justify-center gap-1">
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                保存
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1">
                            <Settings size={12} />
                            编辑
                        </button>
                    )}
                </div>
            </div>

            <div className={`p-4 space-y-4 transition-all duration-300 ${isEditing ? 'opacity-100' : 'opacity-90'}`}>

                {/* 2. Basic Info - Ultra Compact */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                        <span>供应商</span>
                        {/* 无论编辑状态与否，都在标题旁显示 Code（如果存在） */}
                        {editInfo?.code ? <span className="text-indigo-500 font-mono px-1.5 py-0.5 bg-indigo-50 rounded">{editInfo.code}</span> : null}
                    </div>

                    {isEditing ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="relative">
                                <input
                                    className="w-full text-[11px] font-bold text-slate-700 bg-slate-100/50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all pl-8"
                                    value={editInfo.name}
                                    placeholder="供应商名称"
                                    list="supplier-list-full"
                                    onInput={e => {
                                        const val = (e.target as HTMLInputElement).value;
                                        const selected = availableSuppliers.find(s => s.name === val);
                                        const newCode = selected ? selected.code : editInfo.code;

                                        setEditInfo({
                                            ...editInfo,
                                            name: val,
                                            code: newCode
                                        });

                                        // 如果选中了已存在的供应商，尝试拉取该供应商的历史策略
                                        if (selected && selected.code) {
                                            fetchSupplierStrategy(selected.code);
                                        }
                                    }}
                                />
                                <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <datalist id="supplier-list-full">
                                    {availableSuppliers.map((s, idx) => (
                                        <option key={`${s.code}-${idx}`} value={s.name}>
                                            {s.code}
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                            {/* 隐藏 Code 输入框，因为已经在标题旁显示，且通过名称自动关联 */}
                        </div>
                    ) : (
                        <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
                            <div className="text-xs font-black text-slate-800 tracking-tight leading-tight">{supplier.name}</div>

                        </div>
                    )}
                </div>

                {/* 2.5 订货配置 - MOQ 和订货单位 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
                        <Box size={12} className="text-purple-500" />
                        <span>订货配置</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* 最小起订量 */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">最小起订量 (MOQ)</label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    min="1"
                                    value={editInfo.minOrderQty || 1}
                                    onChange={e => setEditInfo({ ...editInfo, minOrderQty: parseInt(e.target.value) || 1 })}
                                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-700 font-mono focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                                />
                            ) : (
                                <div className="h-9 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-700 font-mono">
                                    {supplier?.minOrderQty || 1}
                                </div>
                            )}
                        </div>
                        {/* 订货单位量 */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">订货单位量</label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    min="1"
                                    value={editInfo.orderUnitQty || 1}
                                    onChange={e => setEditInfo({ ...editInfo, orderUnitQty: parseInt(e.target.value) || 1 })}
                                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-700 font-mono focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                                />
                            ) : (
                                <div className="h-9 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-700 font-mono">
                                    {supplier?.orderUnitQty || 1}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-400 ml-1">
                        补货量 = max(需求量, MOQ)，并向上取整到订货单位的倍数
                    </div>
                </div>


                {/* 3. Price Tiers - Card Style */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <DollarSign size={12} className="text-amber-500" />
                            <span>阶梯价格配置</span>
                        </div>
                        {isEditing && (
                            <button
                                onClick={handleAddTier}
                                className="text-[10px] text-indigo-600 font-black flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
                            >
                                <Plus size={10} />
                                添加
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {/* Header Row - Grid Layout */}
                        <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.5fr] gap-2 px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none border-b border-slate-100/50">
                            <div className="text-right">起订量</div>
                            <div className="text-right">含税单价</div>
                            <div className="text-right">货期</div>
                            <div></div>
                        </div>

                        {priceTiers.map((tier, index) => (
                            <div
                                key={index}
                                className="relative group transition-all duration-300 rounded-lg overflow-hidden border border-slate-100 bg-white hover:border-indigo-100"
                            >
                                <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.5fr] gap-2 px-2 h-9 items-center">
                                    {/* 起订量 */}
                                    <div className="flex justify-end items-center overflow-hidden">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={tier.minQty}
                                                onChange={e => handleTierChange(index, 'minQty', parseInt(e.target.value) || 0)}
                                                className="w-full h-8 bg-transparent transition-all rounded text-[10px] font-bold text-slate-700 font-mono italic text-right focus:outline-none border-transparent hover:border-slate-200 focus:border-indigo-300 border px-1"
                                            />
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-700 font-mono italic h-8 flex items-center justify-end w-full px-1">
                                                {Number(tier.minQty).toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* 单价 */}
                                    <div className="flex justify-end items-center overflow-hidden">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={tier.price}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        handleTierChange(index, 'price', val);
                                                    }
                                                }}
                                                className="w-full h-8 bg-transparent transition-all rounded text-[10px] font-bold font-mono text-slate-800 text-right focus:outline-none border-transparent hover:border-slate-200 focus:border-indigo-300 border px-1"
                                            />
                                        ) : (
                                            <span className="text-[10px] font-bold font-mono text-slate-800 h-8 flex items-center justify-end w-full px-1">
                                                {Number(tier.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>

                                    {/* 货期 */}
                                    <div className="flex justify-end items-center overflow-hidden">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={tier.leadTime}
                                                onChange={e => handleTierChange(index, 'leadTime', parseInt(e.target.value) || 0)}
                                                className="w-full h-8 bg-transparent transition-all rounded text-[10px] font-bold text-slate-700 font-mono text-right focus:outline-none border-transparent hover:border-slate-200 focus:border-indigo-300 border px-1"
                                            />
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-700 font-mono h-8 flex items-center justify-end w-full px-1">{tier.leadTime}</div>
                                        )}
                                    </div>

                                    {/* 删除按钮 */}
                                    <div className="flex justify-end items-center">
                                        {isEditing && (
                                            <button
                                                onClick={() => handleRemoveTier(index)}
                                                disabled={priceTiers.length <= 1}
                                                title="删除"
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierCard;
