import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { config } from '../../config';

interface ShipRecord {
    id: number;
    outbound_id: string; // Add outbound_id
    product_model: string;
    product_name: string;
    outbound_date: string;
    quantity: number;
    customer_name: string;
    unit_price: number;
    created_at: string;
}

const ShipList: React.FC = () => {
    const [records, setRecords] = useState<ShipRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchShipList();
    }, []);

    const fetchShipList = async () => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/api/shiplist`);
            const data = await response.json();
            setRecords(data);
        } catch (error) {
            console.error('Failed to fetch ship list:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRecords = records.filter(record =>
        record.product_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7]">
            <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-gray-100 z-20">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">出库清单</h1>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1440px] mx-auto h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:ring-4 focus:ring-black/5 outline-none w-64 transition-all"
                                placeholder="搜索型号、名称或客户..."
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">出库单号</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">产品型号</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">产品名称</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">出库日期</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400 text-right">数量</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400 text-right">未税单价</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">客户名称</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center text-gray-400">加载中...</td>
                                        </tr>
                                    ) : paginatedRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center text-gray-400">暂无出库记录</td>
                                        </tr>
                                    ) : (
                                        paginatedRecords.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-5 px-6 text-sm font-medium text-gray-600 font-mono">{record.outbound_id || '-'}</td>
                                                <td className="py-5 px-6 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                                    <Link to={`/stock/product/${record.product_model}`} className="hover:underline">
                                                        {record.product_model}
                                                    </Link>
                                                </td>
                                                <td className="py-5 px-6 text-[15px] font-semibold text-gray-900">{record.product_name}</td>
                                                <td className="py-5 px-6 text-sm text-gray-500">{new Date(record.outbound_date).toLocaleDateString()}</td>
                                                <td className="py-5 px-6 text-right text-base font-bold text-gray-900">{record.quantity}</td>
                                                <td className="py-5 px-6 text-right text-sm font-medium text-gray-900">¥ {Number(record.unit_price || 0).toFixed(2)}</td>
                                                <td className="py-5 px-6 text-sm text-gray-600">{record.customer_name}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-auto flex items-center justify-end gap-6 px-8 py-5 border-t border-gray-50 bg-gray-50/30">
                            <div className="text-[13px] text-gray-400">
                                显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} / 共 {filteredRecords.length} 条数据
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] text-gray-400">每页:</span>
                                    <div className="relative">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="appearance-none bg-transparent border-none text-[13px] font-semibold text-gray-900 focus:ring-0 cursor-pointer pl-0 pr-6 py-0 relative z-10"
                                        >
                                            <option value={15}>15</option>
                                            <option value={30}>30</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 px-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-gray-200 rounded disabled:opacity-20 flex items-center shadow-sm bg-white"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="text-sm font-bold text-gray-900 min-w-8 text-center bg-gray-100 py-1 px-2 rounded">
                                        {currentPage} / {totalPages || 1}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1 px-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-gray-200 rounded disabled:opacity-20 flex items-center shadow-sm bg-white"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ShipList;
