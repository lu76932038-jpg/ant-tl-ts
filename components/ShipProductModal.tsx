import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Package } from 'lucide-react';
import { Product } from '../types';

interface ShipProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onShip: (data: { product_model: string; product_name: string; outbound_date: string; quantity: number; customer_name: string; unit_price: number }) => Promise<void>;
}

const ShipProductModal: React.FC<ShipProductModalProps> = ({ isOpen, onClose, product, onShip }) => {
    const [quantity, setQuantity] = useState(1);
    const [customerName, setCustomerName] = useState('');
    const [outboundDate, setOutboundDate] = useState('');
    const [unitPrice, setUnitPrice] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setCustomerName('');
            setUnitPrice('');
            setOutboundDate(new Date().toISOString().split('T')[0]); // Default to today
        }
    }, [isOpen]);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onShip({
                product_model: product.sku,
                product_name: product.name,
                outbound_date: outboundDate,
                quantity: Number(quantity),
                customer_name: customerName,
                unit_price: Number(unitPrice) || 0
            });
            onClose();
        } catch (error) {
            console.error('Shipment failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">商品出库</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{product.name} ({product.sku})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                出库数量
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Package className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-gray-900 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                未税单价 (元)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <span className="text-gray-400 font-bold">¥</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-gray-900 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                客户名称
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="请输入客户名称"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-gray-900 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                出库日期
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={outboundDate}
                                    onChange={(e) => setOutboundDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-gray-900 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all active:scale-[0.98]"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '提交中...' : '确认出库'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShipProductModal;
