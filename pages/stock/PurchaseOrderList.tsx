import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../../services/api';


interface Suggestion {
    sku: string;
    product_name: string;
    current_stock: number;
    rop: number;
    suggested_qty: number;
    reason: string;
    supplier: string;
}

interface PurchaseOrder {
    id: number;
    po_id: string;
    sku: string;
    product_name: string;
    quantity: number;
    supplier_info: string;
    status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
    order_date: string;
}

const PurchaseOrderList: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'suggestions' | 'orders'>('suggestions');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'suggestions') fetchSuggestions();
        else fetchOrders();
    }, [activeTab]);

    const fetchSuggestions = async () => {
        setIsLoading(true);
        try {
            const data: any = await api.get('/purchase-orders/suggestions');
            setSuggestions(data);
        } finally {
            setIsLoading(false);
        }
    };


    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data: any = await api.get('/purchase-orders');
            setOrders(data);
        } finally {
            setIsLoading(false);
        }
    };


    const handleCreatePO = async (suggestion: Suggestion) => {
        if (!confirm(`确认要为 ${suggestion.sku} 创建采购单吗?`)) return;
        try {
            await api.post('/purchase-orders', {
                sku: suggestion.sku,
                product_name: suggestion.product_name,
                quantity: suggestion.suggested_qty,
                order_date: new Date().toISOString().split('T')[0],
                supplier_info: JSON.stringify({ name: suggestion.supplier })
            });
            alert('采购单已创建');
            fetchSuggestions();
        } catch (error) {
            console.error(error);
        }
    };


    const handleConfirmPO = async (id: number) => {
        if (!confirm('确认采购? 将自动生成入库单。')) return;
        try {
            await api.post(`/purchase-orders/${id}/confirm`);
            alert('已确认采购，请前往入库清单查看');
            fetchOrders();
        } catch (error) {
            console.error(error);
        }
    };


    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7]">
            <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-gray-100 z-20">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">采购与补货管理</h1>
            </header>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1440px] mx-auto h-full flex flex-col space-y-6">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('suggestions')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'suggestions' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            补货建议
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            采购单列表
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 p-0">
                        {activeTab === 'suggestions' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">SKU</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">产品</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">当前库存</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">ROP</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">建议采购</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">原因</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {suggestions.map((s) => (
                                            <tr key={s.sku} className="hover:bg-gray-50/50">
                                                <td className="py-4 px-6 text-sm font-mono text-gray-600">{s.sku}</td>
                                                <td className="py-4 px-6 text-sm font-semibold text-gray-900">{s.product_name}</td>
                                                <td className="py-4 px-6 text-right text-sm text-gray-500">{s.current_stock}</td>
                                                <td className="py-4 px-6 text-right text-sm text-orange-500 font-bold">{s.rop}</td>
                                                <td className="py-4 px-6 text-right text-sm font-bold text-blue-600">{s.suggested_qty}</td>
                                                <td className="py-4 px-6 text-xs text-red-500 bg-red-50 rounded-full px-2 py-1 w-fit mt-1">{s.reason}</td>
                                                <td className="py-4 px-6">
                                                    <button
                                                        onClick={() => handleCreatePO(s)}
                                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-blue-700 transition"
                                                    >
                                                        生成采购单
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!isLoading && suggestions.length === 0 && (
                                            <tr><td colSpan={7} className="text-center py-20 text-gray-400">暂无补货建议</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">PO 号</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">SKU</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">下单日期</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">数量</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">状态</th>
                                            <th className="py-4 px-6 text-xs font-medium text-gray-400">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-gray-50/50">
                                                <td className="py-4 px-6 text-sm font-mono text-gray-600">{o.po_id}</td>
                                                <td className="py-4 px-6 text-sm font-medium text-gray-900">{o.sku}</td>
                                                <td className="py-4 px-6 text-sm text-gray-500">{o.order_date}</td>
                                                <td className="py-4 px-6 text-right text-sm font-bold">{o.quantity}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${o.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                        o.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {o.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {o.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleConfirmPO(o.id)}
                                                            className="text-xs border border-green-600 text-green-600 px-3 py-1 rounded hover:bg-green-50 font-bold transition"
                                                        >
                                                            确认采购
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {!isLoading && orders.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-20 text-gray-400">暂无采购单</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PurchaseOrderList;
