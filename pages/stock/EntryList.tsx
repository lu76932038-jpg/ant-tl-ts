import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight, ChevronDown, Plus, Package } from 'lucide-react';
import { AddEntryModal } from './AddEntryModal';
import { api } from '../../services/api';


interface EntryRecord {
    id: number;
    entry_id: string; // IN-...
    sku: string;
    product_name: string;
    arrival_date: string;
    purchase_date?: string;
    quantity: number;
    supplier: string;
    unit_price: number;
    status: 'PENDING' | 'RECEIVED';
}

const EntryList: React.FC = () => {
    const [records, setRecords] = useState<EntryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchEntryList();
    }, []);

    const fetchEntryList = async () => {
        setIsLoading(true);
        try {
            const data: any = await api.get('/entrylist');
            setRecords(data);
        } catch (error) {
            console.error('Failed to fetch entry list:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleEntryAdded = () => {
        fetchEntryList();
        setIsAddModalOpen(false);
    };

    const filteredRecords = records.filter(record =>
        record.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f7]">
            <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-gray-100 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">入库清单</h1>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                    <Plus size={16} />
                    新建入库
                </button>
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
                                placeholder="搜索型号、名称或供应商..."
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">入库单号</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">产品型号</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">产品名称</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">预计到达</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400 text-right">入库数量</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400 text-right">采购单价</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">供应商</th>
                                        <th className="py-5 px-6 text-[13px] font-medium text-gray-400">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr><td colSpan={8} className="py-20 text-center text-gray-400">加载中...</td></tr>
                                    ) : paginatedRecords.length === 0 ? (
                                        <tr><td colSpan={8} className="py-20 text-center text-gray-400">暂无入库记录</td></tr>
                                    ) : (
                                        paginatedRecords.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-5 px-6 text-sm font-medium text-gray-600 font-mono">{record.entry_id}</td>
                                                <td className="py-5 px-6 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                                    <Link to={`/stock/product/${record.sku}`} className="hover:underline">
                                                        {record.sku}
                                                    </Link>
                                                </td>
                                                <td className="py-5 px-6 text-[15px] font-semibold text-gray-900">{record.product_name}</td>
                                                <td className="py-5 px-6 text-sm text-gray-500">{new Date(record.arrival_date).toLocaleDateString()}</td>
                                                <td className="py-5 px-6 text-right text-base font-bold text-gray-900">{record.quantity}</td>
                                                <td className="py-5 px-6 text-right text-sm font-medium text-gray-900">¥ {Number(record.unit_price).toFixed(2)}</td>
                                                <td className="py-5 px-6 text-sm text-gray-600">{record.supplier}</td>
                                                <td className="py-5 px-6">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${record.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {record.status === 'RECEIVED' ? '已入库' : '待入库'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-auto flex items-center justify-end gap-6 px-8 py-5 border-t border-gray-50 bg-gray-50/30">
                            {/* ... Pagination Logic (Same as ShipList) ... */}
                            <div className="text-[13px] text-gray-400">
                                显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} / 共 {filteredRecords.length} 条数据
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 px-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-gray-200 rounded disabled:opacity-20 flex items-center shadow-sm bg-white"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
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

            {/* Add Modal */}
            {isAddModalOpen && (
                <AddEntryModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleEntryAdded} />
            )}
        </div>
    );
};

export default EntryList;
