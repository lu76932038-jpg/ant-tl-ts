
import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Plus,
    Calendar,
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    ArrowUpRight,
    RefreshCw,
    X,
    Check,
    BrainCircuit
} from 'lucide-react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface CustomerCredit {
    id: number;
    customer_code: string;
    customer_name: string;
    rating: string;
    total_limit: number;
    available_limit: number;
    overdue_amount: number;
    last_evaluation_date: string;
    risk_status: string;
}

const CreditOverview: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<CustomerCredit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState('信用等级');
    const [filterRisk, setFilterRisk] = useState('风险预警状态');
    const [stats, setStats] = useState<any>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [unassignedClients, setUnassignedClients] = useState<{ customer_code: string, customer_name: string }[]>([]);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [searchUnassigned, setSearchUnassigned] = useState('');

    const [isUnassignedLoading, setIsUnassignedLoading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/credit-risk/stats');
            setStats(res);
        } catch (error) {
            console.error('Failed to fetch credit risk stats', error);
        }
    };

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const res: any = await api.get('/credit-risk/list');
            setData(res || []);
        } catch (error) {
            console.error('Failed to fetch credit risk data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnassigned = async (query?: string) => {
        try {
            setIsUnassignedLoading(true);
            const res: any = await api.get(`/credit-risk/unassigned?search=${encodeURIComponent(query || '')}`);
            setUnassignedClients(res || []);
            setSelectedCodes([]);
        } catch (error) {
            console.error('Failed to fetch unassigned customers', error);
        } finally {
            setIsUnassignedLoading(false);
        }
    };

    // Debounced Search Effect
    useEffect(() => {
        if (!isAddModalOpen) return;

        const handler = setTimeout(() => {
            fetchUnassigned(searchUnassigned);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchUnassigned, isAddModalOpen]);

    const handleAddCustomers = async () => {
        if (selectedCodes.length === 0) return;
        try {
            setIsAdding(true);
            await api.post('/credit-risk/add', { codes: selectedCodes });
            setIsAddModalOpen(false);
            fetchData(); // Refresh main list
        } catch (error) {
            console.error('Failed to add customers', error);
        } finally {
            setIsAdding(false);
        }
    };

    const toggleSelection = (code: string) => {
        setSelectedCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleSelectAll = () => {
        const filtered = unassignedClients.filter(c =>
            c.customer_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
            c.customer_code.toLowerCase().includes(searchUnassigned.toLowerCase())
        );

        if (selectedCodes.length === filtered.length) {
            setSelectedCodes([]);
        } else {
            setSelectedCodes(filtered.map(c => c.customer_code));
        }
    };


    const getRatingColor = (rating: string) => {
        switch (rating) {
            case 'A+': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'A': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'B': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'C': return 'bg-rose-50 text-rose-600 border-rose-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const handleExport = () => {
        if (data.length === 0) return;
        const exportData = data.map(item => ({
            '客户名称': item.customer_name,
            '客户编码': item.customer_code,
            '信用等级': item.rating,
            '总授信额度': item.total_limit,
            '可用额度': item.available_limit,
            '逾期金额': item.overdue_amount,
            '上次评估日期': item.last_evaluation_date ? new Date(item.last_evaluation_date).toLocaleDateString() : '-',
            '风险状态': item.risk_status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "信用风控列表");
        XLSX.writeFile(wb, `客户信用风控列表_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredData = data.filter(item => {
        const matchSearch = item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.customer_code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRating = filterRating === '信用等级' || item.rating === filterRating;
        const matchRisk = filterRisk === '风险预警状态' || item.risk_status === (filterRisk === '高风险' ? 'High' : filterRisk === '中风险' ? 'Medium' : 'Low');
        return matchSearch && matchRating && matchRisk;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    return (
        <div className="p-8 space-y-8 bg-[#f8fafc] min-h-full">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">客户信用风控列表</h1>
                    <p className="text-slate-500 mt-2 font-medium">实时分析客户信用档案及风险评估状态。</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { fetchData(); fetchStats(); }}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        刷新数据
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        导出数据
                    </button>
                    <button
                        onClick={() => {
                            setSearchUnassigned('');
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        添加监控客户
                    </button>
                    <button
                        onClick={() => navigate('/credit/ai-analysis')}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20"
                    >
                        新建评估任务
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: '平均信用分', value: (stats?.avgScore || 0).toString(), trend: stats?.trends?.avgScore || '0%', icon: <ShieldCheck className="text-emerald-500" /> },
                    { label: '高风险客户', value: (stats?.highRiskCount || 0).toString(), trend: stats?.trends?.highRiskCount || '0', icon: <AlertTriangle className="text-rose-500" /> },
                    { label: '总授信额度', value: `¥${((stats?.totalLimit || 0) / 10000).toFixed(1)}W`, trend: stats?.trends?.totalLimit || '0%', icon: <TrendingUp className="text-indigo-500" /> },
                    { label: '逾期回收率', value: stats?.recoveryRate || '100%', trend: stats?.trends?.recoveryRate || '0%', icon: <ShieldCheck className="text-blue-500" /> },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                                {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索客户名称/编码..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-600">筛选：</span>
                    <select
                        value={filterRating}
                        onChange={(e) => { setFilterRating(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer"
                    >
                        <option>信用等级</option>
                        <option>A+</option>
                        <option>A</option>
                        <option>B</option>
                        <option>C</option>
                    </select>
                    <div className="w-px h-4 bg-slate-200 mx-2" />
                    <select
                        value={filterRisk}
                        onChange={(e) => { setFilterRisk(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer"
                    >
                        <option>风险预警状态</option>
                        <option>高风险</option>
                        <option>中风险</option>
                        <option>低风险</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">客户名称</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">信用等级</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">总授信额度</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">可用额度</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">逾期金额</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">上次评估日期</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
                                            <p>数据加载中...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((cust) => (
                                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{cust.customer_name}</div>
                                            <div className="text-xs font-medium text-slate-400 mt-0.5">#{cust.customer_code}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getRatingColor(cust.rating)}`}>
                                                {cust.rating}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-700">
                                            ¥{Number(cust.total_limit).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${(Number(cust.available_limit) / Number(cust.total_limit)) > 0.8 ? 'bg-emerald-500' :
                                                            (Number(cust.available_limit) / Number(cust.total_limit)) > 0.4 ? 'bg-indigo-500' : 'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${(Number(cust.available_limit) / Math.max(Number(cust.total_limit), 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {cust.total_limit > 0 ? Math.round((Number(cust.available_limit) / Number(cust.total_limit)) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 mt-1">¥{Number(cust.available_limit).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-sm font-black ${Number(cust.overdue_amount) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                ¥{Number(cust.overdue_amount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {cust.last_evaluation_date ? new Date(cust.last_evaluation_date).toLocaleDateString() : '-'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right flex gap-2 justify-end">
                                            <button
                                                onClick={() => navigate(`/credit/detail/${cust.customer_code}`)}
                                                className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                                title="查看画像"
                                            >
                                                查看画像 <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/credit/ai-analysis?customerCode=${cust.customer_code}`)}
                                                className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                                                title="AI 评估"
                                            >
                                                AI 评估 <BrainCircuit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-8 py-10 text-center text-slate-400">
                                        暂无风控记录
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="flex justify-between items-center px-4">
                    <p className="text-sm font-medium text-slate-500">共 <span className="font-bold text-slate-800">{filteredData.length}</span> 条记录</p>
                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${currentPage === page
                                    ? 'bg-slate-900 text-white shadow-lg scale-105'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">添加监控客户</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">从现有客户列表中选择需要纳入信用风控的客户</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4 bg-white">
                            {/* Search & Select All */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="搜索待添加的客户名称/编码..."
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700"
                                        value={searchUnassigned}
                                        onChange={(e) => setSearchUnassigned(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSelectAll}
                                    disabled={isUnassignedLoading || unassignedClients.length === 0}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all whitespace-nowrap disabled:opacity-50"
                                >
                                    {selectedCodes.length > 0 && selectedCodes.length === unassignedClients.length ? '取消全选' : '本页全选'}
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl min-h-[300px] relative">
                                {isUnassignedLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                                        <p className="text-sm font-medium text-slate-500">正在获取客户列表...</p>
                                    </div>
                                ) : null}

                                {unassignedClients.filter(c =>
                                    c.customer_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
                                    c.customer_code.toLowerCase().includes(searchUnassigned.toLowerCase())
                                ).length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-medium">
                                        {!isUnassignedLoading && (
                                            <>
                                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Search className="w-8 h-8 opacity-20" />
                                                </div>
                                                <p>没找到未加入风控的客户</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {unassignedClients.filter(c =>
                                            c.customer_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
                                            c.customer_code.toLowerCase().includes(searchUnassigned.toLowerCase())
                                        ).map(client => (
                                            <div
                                                key={client.customer_code}
                                                onClick={() => toggleSelection(client.customer_code)}
                                                className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedCodes.includes(client.customer_code) ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${selectedCodes.includes(client.customer_code)
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                                                    : 'bg-white border-slate-200'
                                                    }`}>
                                                    {selectedCodes.includes(client.customer_code) && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{client.customer_name}</div>
                                                    <div className="text-[10px] font-black text-slate-400 mt-0.5 tracking-wider uppercase">ID: {client.customer_code}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {unassignedClients.length >= 50 && (
                                            <div className="p-3 text-center bg-slate-50 border-t border-slate-100 italic text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                — 仅显示前 50 条匹配项，请增加关键词精准查询 —
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="text-sm font-medium text-slate-500">
                                已选择 <span className="font-bold text-indigo-600">{selectedCodes.length}</span> 个客户
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAddCustomers}
                                    disabled={selectedCodes.length === 0 || isAdding}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isAdding && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    确认添加
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditOverview;
