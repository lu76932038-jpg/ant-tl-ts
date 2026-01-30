import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../../services/api';

interface PurchaseOrder {
    id: number;
    po_id: string;
    sku: string;
    product_name: string;
    quantity: number;
    supplier_info: string;
    status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'PLAN';
    order_date: string;
}

const PurchaseOrderList: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);


    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data: any = await api.get('/purchase-orders');
            // 过滤掉 PLAN 状态，因为计划现在有了专门的页面
            setOrders(data.filter((o: any) => o.status !== 'PLAN'));
        } finally {
            setIsLoading(false);
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
                <h1 className="text-xl font-bold tracking-tight text-gray-900">采购订单管理</h1>
            </header>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1440px] mx-auto h-full flex flex-col space-y-6">

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">PO 号</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">SKU</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">产品名称</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">下单日期</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400 text-right">数量</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">状态</th>
                                        <th className="py-4 px-6 text-xs font-medium text-gray-400">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="text-center py-20 text-gray-400">加载中...</td></tr>
                                    ) : orders.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50/50">
                                            <td className="py-4 px-6 text-sm font-mono text-gray-600">{o.po_id}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-blue-600 hover:underline cursor-pointer">{o.sku}</td>
                                            <td className="py-4 px-6 text-sm font-medium text-gray-900">{o.product_name}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500">{o.order_date}</td>
                                            <td className="py-4 px-6 text-right text-sm font-bold">{o.quantity}</td>
                                            <td className="py-4 px-6">
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${o.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                    o.status === 'PLAN' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                        o.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {o.status === 'PLAN' ? '待处理采购计划' : o.status}
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
                                        <tr><td colSpan={7} className="text-center py-20 text-gray-400">暂无采购订单</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PurchaseOrderList;
