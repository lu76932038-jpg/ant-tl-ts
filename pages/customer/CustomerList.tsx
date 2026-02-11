import React, { useState, useEffect } from 'react';
import { api } from '../../services/api'; // Adjust path as needed based on file location
import { Search, RefreshCw, Users, FileText } from 'lucide-react';

interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
    created_at?: string;
    updated_at?: string;
}

const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setIsLoading(true);
            const data: any = await api.get('/customers');
            setCustomers(data || []);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        客户列表
                    </h1>
                    <p className="text-gray-500 mt-1">查看已同步的客户档案信息</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchCustomers}
                        disabled={isLoading}
                        className="p-2 bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="刷新列表"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="搜索客户名称或编码..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="text-sm text-slate-500">
                    共 {filteredCustomers.length} 个客户
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold w-20">ID</th>
                                <th className="py-4 px-6 font-semibold">客户编码</th>
                                <th className="py-4 px-6 font-semibold">客户名称</th>
                                <th className="py-4 px-6 font-semibold">更新时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-3 px-6 text-slate-400 font-mono text-xs">{customer.id}</td>
                                        <td className="py-3 px-6">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono font-bold">
                                                {customer.customer_code}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 font-medium text-slate-700">
                                            {customer.customer_name}
                                        </td>
                                        <td className="py-3 px-6 text-slate-400 text-xs">
                                            {customer.updated_at ? new Date(customer.updated_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={48} className="opacity-20" />
                                            <p>暂无客户数据</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerList;
