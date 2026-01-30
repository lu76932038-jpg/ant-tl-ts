import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { config } from '../../config';

interface AddEntryModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        sku: '',
        product_name: '',
        quantity: 100,
        unit_price: 0,
        arrival_date: new Date().toISOString().split('T')[0], // Default today
        supplier: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${config.apiBaseUrl}/api/entry-list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                onSuccess();
            } else {
                alert('提交失败');
            }
        } catch (error) {
            console.error('Submit failed', error);
            alert('提交失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">新建入库单</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">产品 SKU</label>
                        <input
                            required
                            type="text"
                            value={formData.sku}
                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="如: SKU-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                        <input
                            type="text"
                            value={formData.product_name}
                            onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                            <input
                                required
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">单价 (¥)</label>
                            <input
                                required
                                type="number"
                                value={formData.unit_price}
                                onChange={e => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">预计/实际到货日期</label>
                        <input
                            required
                            type="date"
                            value={formData.arrival_date}
                            onChange={e => setFormData({ ...formData, arrival_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                        <input
                            required
                            type="text"
                            value={formData.supplier}
                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="供应商名称"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isSubmitting ? '保存中' : '确认入库'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
