import React, { useState } from 'react';
import { Truck, RefreshCw, Loader2 } from 'lucide-react';
import { SupplierInfo } from '../types';

interface SupplierCardProps {
    supplier: SupplierInfo | null;
    isSaving: boolean;
    onSave: (newInfo: SupplierInfo) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, isSaving, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editInfo, setEditInfo] = useState<SupplierInfo | null>(null);

    // Initialize edit info when entering edit mode or when supplier changes
    React.useEffect(() => {
        if (supplier) {
            setEditInfo(supplier);
        }
    }, [supplier]);

    if (!supplier || !editInfo) return null;

    const handleSave = () => {
        if (editInfo) {
            onSave(editInfo);
            setIsEditing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ring-1 ring-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-base">备货供应商</h3>
                        {isEditing ? (
                            <div className="mt-1 space-y-2">
                                <input
                                    className="block w-full text-sm font-medium border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                                    value={editInfo.name}
                                    onChange={e => setEditInfo({ ...editInfo, name: e.target.value })}
                                />
                                <input
                                    className="block w-full text-[10px] font-mono text-blue-600 bg-blue-50 px-1 rounded border-none"
                                    value={editInfo.code}
                                    onChange={e => setEditInfo({ ...editInfo, code: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-medium text-gray-700">{supplier.name}</span>
                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">{supplier.code}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <button
                            onClick={handleSave}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                            <RefreshCw size={10} />
                            保存
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleSave} // In read mode, this might just trigger parent save? Original logic was mixed. 
                                // Looking at original code: there was a handleSaveStrategy on the "Update Supplier Config" button.
                                // And also an isEditingSupplier state.
                                // Here we simplify: Main button triggers parent save (which saves everything).
                                disabled={isSaving}
                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                更新供应商配置
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors border border-blue-200"
                            >
                                编辑
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Editable Price & Lead Time */}
            <div className="bg-gray-50/80 rounded-xl p-4 space-y-4 border border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">阶梯价格 & 交期</span>
                </div>

                <div className="space-y-3">
                    {/* Tier 1 - Simplified */}
                    <div className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 w-12 text-right">基础</span>
                            <div className="h-4 w-px bg-gray-300"></div>
                            <span className="text-xs text-gray-500">交期(天)</span>
                            <input
                                type="number"
                                disabled={!isEditing}
                                defaultValue={30} // This was hardcoded in original
                                className={`w-10 bg-transparent text-gray-700 text-xs text-center border-b ${isEditing ? 'border-gray-300' : 'border-transparent'} focus:border-blue-500 focus:outline-none`}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-xs">¥</span>
                            <input
                                type="number"
                                disabled={!isEditing}
                                value={editInfo.price}
                                onChange={e => setEditInfo({ ...editInfo, price: parseInt(e.target.value) || 0 })}
                                className={`w-16 bg-transparent font-bold text-gray-900 text-right border-b ${isEditing ? 'border-gray-300' : 'border-transparent'} focus:border-blue-500 focus:outline-none transition-colors`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierCard;
