import React, { useState, useEffect } from 'react';
import {
    Layers,
    RefreshCw,
    ArrowRight,
    Calendar,
    Package,
    DollarSign,
    Loader2,
    ChevronRight,
    Search,
    Filter,
    ClipboardCheck,
    XCircle,
    Send
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

interface PurchasePlan {
    id: number;
    plan_id: string; // 修正类型定义
    po_id?: string;
    sku: string;
    product_name: string;
    quantity: number;
    supplier_info: string;
    status: 'PLAN';
    source: 'MANUAL' | 'AUTO'; // 前端类型同步
    order_date: string;
    email_notification_info?: string; // JSON String
    created_at?: string;
}

const PurchasePlanList: React.FC = () => {
    const [plans, setPlans] = useState<PurchasePlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            // 调用新的独立接口获取采购计划
            const data: any = await api.get('/purchase-plans');
            setPlans(data);
        } catch (error) {
            console.error('Failed to fetch purchase plans', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    // 状态转换：计划 -> 采购单 (DRAFT)
    const handleConvertToPO = async (id: number) => {
        if (!confirm('确定要将该计划转化为正式采购单吗？')) return;
        try {
            // 调用独立接口进行转化：Plan -> PO
            await api.post(`/purchase-plans/${id}/convert`);
            alert('已成功转化为正式采购单！');
            fetchPlans();
        } catch (error) {
            console.error(error);
            alert('转化失败');
        }
    };

    // 取消计划
    const handleCancelPlan = async (id: number) => {
        if (!confirm('确定要取消该采购计划吗？(取消后相关的在途库存占用将释放)')) return;
        try {
            await api.post(`/purchase-plans/${id}/cancel`);
            fetchPlans();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredPlans = plans.filter(p =>
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
            {/* Header */}
            <header className="h-[80px] flex items-center justify-between px-8 bg-white border-b border-slate-200/60 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm ring-1 ring-indigo-100">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-800">采购计划管理</h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">所有生成的补货计划与在途预审</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="搜索 SKU 或品名..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all w-[240px]"
                        />
                    </div>
                    <button
                        onClick={fetchPlans}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1440px] mx-auto">

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Loader2 className="animate-spin text-indigo-200" size={40} />
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">正在拉取采购意图...</span>
                        </div>
                    ) : filteredPlans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
                                <Layers className="text-slate-200" size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">暂无待处理计划</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-[300px] text-center">系统尚未生成任何采购计划，您可以去库存详情页手动触发或等待后台自动补货。</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlans.map((plan) => {
                                let supplier: any = {};
                                try {
                                    supplier = typeof plan.supplier_info === 'string'
                                        ? JSON.parse(plan.supplier_info || '{}')
                                        : plan.supplier_info || {};
                                } catch (e) {
                                    console.error('JSON Parse Error', e);
                                }
                                const selectedTier = supplier?.priceTiers?.find((t: any) => t.isSelected);
                                const estPrice = selectedTier?.price || 0;
                                const estAmount = estPrice * plan.quantity;

                                return (
                                    <div key={plan.id} className="group bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden">
                                        {/* Status Header */}
                                        <div className="px-5 py-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">待处理计划</span>
                                                {/* Source Badge */}
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${plan.source === 'AUTO'
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {plan.source === 'AUTO' ? '自动生成' : '手工创建'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Email Status Indicator */}
                                                {plan.email_notification_info && (() => {
                                                    try {
                                                        const emailInfo = typeof plan.email_notification_info === 'string'
                                                            ? JSON.parse(plan.email_notification_info)
                                                            : plan.email_notification_info;

                                                        let iconColor = 'text-slate-300';
                                                        let title = '邮件通知状态未知';

                                                        if (emailInfo.status === 'SENT') {
                                                            iconColor = 'text-green-500';
                                                            const recipientList = Array.isArray(emailInfo.recipients)
                                                                ? emailInfo.recipients.join('\n')
                                                                : '未知接收人';
                                                            title = `发送时间: ${new Date(emailInfo.sent_at).toLocaleString()}\n\n接收人:\n${recipientList}`;
                                                        } else if (emailInfo.status === 'FAILED') {
                                                            iconColor = 'text-red-500';
                                                            title = `发送失败: ${emailInfo.error}`;
                                                        } else if (emailInfo.status === 'PENDING') {
                                                            iconColor = 'text-amber-500 animate-pulse';
                                                            title = '正在发送...';
                                                        }

                                                        return (
                                                            <div className="relative group/email cursor-help" title={title}>
                                                                <Send size={14} className={iconColor} />
                                                            </div>
                                                        );
                                                    } catch (e) { return null; }
                                                })()}
                                                <span className="text-[10px] font-bold text-slate-400 font-mono">#{plan.plan_id || plan.id}</span>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-6 flex-1">
                                            <Link to={`/stock/product/${plan.sku}`} className="group/item">
                                                <span className="text-[11px] font-black text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-widest block mb-1">
                                                    {plan.sku}
                                                </span>
                                                <h4 className="text-base font-black text-slate-800 line-clamp-2 leading-snug group-hover/item:text-indigo-600 transition-colors">
                                                    {plan.product_name}
                                                </h4>
                                            </Link>

                                            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="font-bold">供应商:</span>
                                                    <span>{supplier.name || '未指定'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold">单价:</span>
                                                    <span>¥{estPrice.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold">货期:</span>
                                                    <span>{supplier.leadTime || 0} 天</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                                        <Package size={10} />
                                                        <span className="text-[9px] font-black uppercase">计划数量</span>
                                                    </div>
                                                    <div className="text-sm font-black text-slate-800">
                                                        {plan.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">PCS</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                                                    <div className="flex items-center gap-1.5 text-orange-400 mb-1">
                                                        <DollarSign size={10} />
                                                        <span className="text-[9px] font-black uppercase">预估金额</span>
                                                    </div>
                                                    <div className="text-sm font-black text-orange-600">
                                                        {estAmount > 0 ? `¥${estAmount.toLocaleString()}` : <span className="text-xs text-orange-400">待核算</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 pt-5 border-t border-slate-100/60 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1.5">生成时间</span>
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Calendar size={12} />
                                                        <span className="text-[10px] font-bold">
                                                            {plan.created_at ? new Date(plan.created_at).toLocaleString() : plan.order_date}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1.5">预计到货</span>
                                                    <div className="text-[10px] font-bold text-slate-400">
                                                        待转单确认
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Area */}
                                        <div className="p-4 bg-slate-50/80 mt-auto flex gap-2">
                                            <button
                                                onClick={() => handleCancelPlan(plan.id)}
                                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <XCircle size={14} />
                                                取消
                                            </button>
                                            <button
                                                onClick={() => handleConvertToPO(plan.id)}
                                                className="flex-[2] py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                            >
                                                <ClipboardCheck size={14} />
                                                转正式采购单
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PurchasePlanList;
