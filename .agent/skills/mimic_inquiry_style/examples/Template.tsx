import React, { useState } from 'react';
import {
    Download,
    RotateCw,
    Plus,
    Search,
    LayoutGrid,
    CheckCircle2,
    LoaderCircle,
    CircleX,
    Filter,
    ChevronDown
} from 'lucide-react';

/**
 * TEMPLATE: Inquiry Style List
 * 
 * Use this template to verify the structure when applying the 'mimic_inquiry_style' skill.
 */

const InquiryStyleTemplate: React.FC = () => {
    // Mock Data
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    return (
        // [LAYOUT RULE] Outer Container: Full height, fixed, no scroll
        <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto overflow-hidden w-full min-h-0 bg-[#f5f5f7]">

            {/* [LAYOUT RULE] 1. Header Area (Title + Glass Toolbar) */}
            <div className="flex-none space-y-4 pb-6 px-2">
                <div className="flex items-center justify-between px-2 py-4">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">页面标题 / 子标题</h1>
                </div>

                {/* [COMPONENT RULE] Glass Action Bar Container */}
                <div className="bg-[#f0f0f0]/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
                    <div className="flex items-center gap-4">

                        {/* [COMPONENT RULE] Big Action Buttons (w-12 h-12) */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-xl shadow-sm hover:text-blue-500 transition-all">
                                <RotateCw className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[240px]">
                            <input
                                type="text"
                                placeholder="搜索关键字..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-5 pr-5 py-3 bg-white border border-slate-100 text-sm rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 shadow-sm transition-all"
                            />
                        </div>

                        {/* [COMPONENT RULE] Tab-style Status Filters */}
                        <div className="flex items-center gap-2 ml-auto">
                            {[
                                { id: null, label: '全部', icon: LayoutGrid, count: 120 },
                                { id: 'completed', label: '成功', icon: CheckCircle2, count: 85 },
                                { id: 'pending', label: '处理中', icon: LoaderCircle, count: 5 }
                            ].map((btn) => (
                                <button
                                    key={btn.label}
                                    onClick={() => setStatusFilter(btn.id)}
                                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all font-black text-sm group shrink-0
                                    ${statusFilter === btn.id
                                            ? 'bg-black text-white shadow-lg'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-50 shadow-sm'}`}
                                >
                                    <btn.icon className={`w-5 h-5 ${statusFilter === btn.id ? 'text-white' : 'text-slate-400'}`} />
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] min-w-[20px] text-center
                                    ${statusFilter === btn.id ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                                        {btn.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* [LAYOUT RULE] 2. Content Card (Flex-1, Scrollable Inner) */}
            <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500">

                {/* [LAYOUT RULE] 3. Scrollable Table Area */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-30">
                            <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
                                <th className="px-6 py-6 font-black border-b border-slate-100">ID</th>
                                <th className="px-6 py-6 font-black border-b border-slate-100">名称</th>
                                <th className="px-6 py-6 font-black text-center border-b border-slate-100">状态</th>
                                <th className="px-6 py-6 font-black text-center border-b border-slate-100">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Example Row */}
                            <tr className="hover:bg-slate-100/30 transition-all">
                                <td className="px-6 py-6 font-mono font-black text-blue-500">
                                    #TASK-001
                                </td>
                                <td className="px-6 py-6 font-bold text-slate-700">
                                    示例数据项
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <span className="text-emerald-500 flex items-center justify-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full text-[11px] font-black tracking-tight">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> 已完成
                                    </span>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    <button className="text-slate-400 hover:text-blue-500 font-bold text-xs">查看详情</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* [LAYOUT RULE] 4. Footer/Pagination Area (Static) */}
                <div className="flex-none px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] text-slate-400 font-black tracking-widest uppercase">
                        显示第 1 到 10 条记录 / 共 120 条
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
                            上一页
                        </button>
                        <button className="px-4 py-2 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryStyleTemplate;
