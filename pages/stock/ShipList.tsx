import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { read, utils } from 'xlsx';
import {
    Download,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Search,
    TrendingUp,
    Users,
    Package,
    DollarSign,
    ExternalLink,
    Filter,
    ArrowUpRight
} from 'lucide-react';
import { api } from '../../services/api';
import { ImportDataModal } from './components/ImportDataModal';

interface ShipRecord {
    id: number;
    outbound_id: string;
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        fetchShipList();
    }, []);

    const fetchShipList = async () => {
        try {
            const data: any = await api.get('/shiplist');
            setRecords(data);
        } catch (error) {
            console.error('Failed to fetch ship list:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 计算 KPI 指标
    const stats = useMemo(() => {
        const totalValue = records.reduce((sum, r) => sum + (r.quantity * (r.unit_price || 0)), 0);
        const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
        const uniqueCustomers = new Set(records.map(r => r.customer_name)).size;
        const recentShipments = records.filter(r => {
            const date = new Date(r.outbound_date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        return {
            totalValue: totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 }),
            totalQuantity: totalQuantity.toLocaleString(),
            customerCount: uniqueCustomers,
            monthlyCount: recentShipments
        };
    }, [records]);

    const filteredRecords = records.filter(record =>
        record.product_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.outbound_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#fafafa]">
            <ImportDataModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchShipList();
                    // Optional: Show global success toast if needed, but Modal already alerts
                }}
            />

            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-30 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-800">出库管理看板</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <ArrowUpRight size={16} />
                        导入出库数据
                    </button>
                    {/* Existing Buttons */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={16} />
                        筛选器
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm shadow-slate-200">
                        <Download size={16} />
                        导出报表数据
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-[1600px] mx-auto space-y-8">

                    {/* KPI Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1">
                                    <ArrowUpRight size={10} /> +12%
                                </span>
                            </div>
                            <div className="text-sm font-medium text-slate-500 mb-1">本月出库频次</div>
                            <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-1">
                                {stats.monthlyCount} <span className="text-xs font-normal text-slate-400">单</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Package size={20} />
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500 mb-1">出库总量累计</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {stats.totalQuantity}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500 mb-1">活跃交易客户</div>
                            <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-1">
                                {stats.customerCount} <span className="text-xs font-normal text-slate-400">位</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 group border-l-4 border-l-emerald-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <DollarSign size={20} />
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500 mb-1">出库总货值 (未税)</div>
                            <div className="text-2xl font-bold text-slate-900">
                                <span className="text-base mr-1 font-normal text-slate-400">¥</span>{stats.totalValue}
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px]">
                        {/* Toolbar */}
                        <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                            <div className="relative group max-w-md w-full">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-indigo-600 transition-colors">
                                    <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    placeholder="搜索单号、型号、产品名或客户信息..."
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[13px] text-slate-400">当前数据量：<span className="font-bold text-slate-700">{filteredRecords.length}</span> 条记录</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest w-[160px]">出库单号</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest w-[200px]">产品型号</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest">产品名称</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest w-[140px]">出库日期</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest text-right w-[100px]">数量</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest text-right w-[140px]">单价 (未税)</th>
                                        <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-widest w-[200px]">客户名称</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-sm font-medium text-slate-400">正在为您加载海量数据...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3 grayscale opacity-40">
                                                    <Package size={48} className="text-slate-300" />
                                                    <p className="text-sm font-medium text-slate-400">未找到符合条件的出库记录</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRecords.map((record, idx) => (
                                            <tr key={record.id} className="hover:bg-indigo-50/30 transition-all duration-150 group animate-in fade-in slide-in-from-bottom-1" style={{ animationDelay: `${idx * 20}ms` }}>
                                                <td className="py-4 px-6">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-mono font-bold group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-slate-200 transition-all">
                                                        {record.outbound_id || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <Link
                                                        to={`/stock/product/${record.product_model}`}
                                                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group/link"
                                                    >
                                                        {record.product_model}
                                                        <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </Link>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="text-sm font-semibold text-slate-800 truncate" title={record.product_name}>
                                                        {record.product_name}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                                                    {new Date(record.outbound_date).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className="text-base font-extrabold text-slate-900 pr-1">
                                                        {record.quantity}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">pcs</span>
                                                </td>
                                                <td className="py-4 px-6 text-right text-sm font-bold text-slate-700">
                                                    ¥{Number(record.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                            {record.customer_name.substring(0, 1)}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-600 truncate">{record.customer_name}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between mt-auto">
                            <div className="text-[12px] font-medium text-slate-400">
                                显示 <span className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> 至 <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> / 共 <span className="text-slate-900 font-bold">{filteredRecords.length}</span> 条
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">每页条数</span>
                                    <div className="relative group">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="appearance-none bg-white border border-slate-200 pl-3 pr-8 py-1 rounded-lg text-sm font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500/10 focus:outline-none hover:border-slate-300 transition-all shadow-sm"
                                        >
                                            <option value={15}>15</option>
                                            <option value={30}>30</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>

                                    <div className="flex items-center px-4 h-9 bg-slate-200/50 rounded-xl font-bold text-slate-700 text-sm shadow-inner">
                                        {currentPage} / <span className="opacity-40 px-1">{totalPages || 1}</span>
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
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

