import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Product, StockStatus } from '../types';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (product: Omit<Product, 'id'>) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        sku: '',
        name: '',
        status: StockStatus.HEALTHY,
        inStock: 0,
        available: 0,
        inTransit: 0,
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
        // Reset form
        setFormData({
            sku: '',
            name: '',
            status: StockStatus.HEALTHY,
            inStock: 0,
            available: 0,
            inTransit: 0,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">添加新商品</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">产品型号 (SKU)</label>
                            <input
                                required
                                type="text"
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                placeholder="例如: MK-2024"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">库存状态</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as StockStatus })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none bg-white"
                            >
                                <option value={StockStatus.HEALTHY}>健康</option>
                                <option value={StockStatus.WARNING}>库存预警</option>
                                <option value={StockStatus.CRITICAL}>急需补货</option>
                                <option value={StockStatus.STAGNANT}>呆滞</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">产品名称</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            placeholder="例如: 2024新款..."
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">在库数量</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.inStock}
                                onChange={e => setFormData({ ...formData, inStock: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">可用数量</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.available}
                                onChange={e => setFormData({ ...formData, available: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">在途数量</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.inTransit}
                                onChange={e => setFormData({ ...formData, inTransit: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                            <Save size={16} />
                            保存商品
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;
