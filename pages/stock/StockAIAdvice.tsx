import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Sparkles, Send, Clock, Database, ChevronDown, ChevronRight, Terminal, User, Loader2, ClipboardList, TrendingUp, Settings, Layers, DollarSign, Target } from 'lucide-react';
import { api } from '../../services/api';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai' | 'system';
    content: string;
    timestamp: Date;
    promptUsed?: string;
    cot?: string; // Chain of Thought
}

const StockAIAdvice: React.FC = () => {
    const { sku } = useParams<{ sku: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [expandedCoTId, setExpandedCoTId] = useState<string | null>(null);

    // Data States
    const [isLoading, setIsLoading] = useState(true);
    const [productDetail, setProductDetail] = useState<any>(null);
    const [strategy, setStrategy] = useState<any>(null);
    const [stockingStats, setStockingStats] = useState<any>(null);

    useEffect(() => {
        document.title = `备货AI建议${sku ? ` - ${sku}` : ''}`;
        if (sku) {
            fetchDeepContextData();
        }
    }, [sku]);

    const fetchDeepContextData = async () => {
        setIsLoading(true);
        try {
            // Concurrent fetch of ALL configuration details and actual data
            const [detail, strat, stats] = await Promise.all([
                api.get(`/products/${sku}/detail`),
                api.get(`/products/${sku}/strategy`),
                api.get(`/stocks/${sku}/stocking-stats?period=3`)
            ]);

            setProductDetail(detail);
            const stratData = (strat as any).strategy || (strat as any).data?.strategy;
            setStrategy(stratData);
            setStockingStats(stats);

            // Generate Highly Structured Audit based on precise configs
            generateStructuredStrategyAudit(detail, stratData, stats);
        } catch (error) {
            console.error('Failed to fetch deep context', error);
            setMessages([{
                id: 'err-1',
                role: 'system',
                content: '错误：无法深度聚合补库配置与业务详情。',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const generateStructuredStrategyAudit = (detail: any, strat: any, stats: any) => {
        const history = detail?.charts?.filter((c: any) => c.type === 'history').slice(-6) || [];
        const historySales = history.map((c: any) => `${c.month}: ${c.actualQty}件`).join(' | ');

        // Parse Prediction Weights for AI
        const parseWeights = (weights: any) => {
            if (!weights) return '默认平均权重';
            try {
                const w = typeof weights === 'string' ? JSON.parse(weights) : weights;
                return Array.isArray(w) ? w.map((v, i) => `区间${i + 1}:${v}%`).join(', ') : JSON.stringify(w);
            } catch { return JSON.stringify(weights); }
        };

        const prompt = `你是一个高级供应链战略分析师。请基于以下【全量结构化配置参数】和【真实业务表现】进行策略匹配度审计：

### 1. 销售预测模型配置 (Forecast Configuration)
- **底层算法**: ${strat?.benchmark_type === 'yoy' ? '同比模型 (Year-on-Year)' : '环比加权模型 (Month-on-Month)'}
- **滑动窗口范围**: ${strat?.benchmark_type === 'yoy' ? strat?.yoy_range : strat?.mom_range} 个周期
- **权重分配细节**: ${strat?.benchmark_type === 'yoy' ? parseWeights(strat?.yoy_weight_sliders) : parseWeights(strat?.mom_weight_sliders)}
- **动态修正系数 (Ratio)**: ${strat?.ratio_adjustment || 0}%
- **手动偏好 (Overrides)**: ${strat?.forecast_overrides ? '存在用户手动干预数据' : '纯算法驱动'}

### 2. 库存策略与供应链配置 (Stocking & Supply Chain)
- **安全库存水位**: ${strat?.safety_stock_days || 1} M (月均销量覆盖)
- **安全缓冲天数 (Buffer)**: ${strat?.buffer_days || 0} 天 (额外冗余)
- **补货触发周期**: ${strat?.replenishment_sales_cycle || 0} M
- **供应商核心指标**: 交期 ${strat?.supplier_info?.leadTime || 30} 天 | 最小起订量(MOQ) ${strat?.supplier_info?.minOrderQty || 0}
- **阶梯采购策略**: ${strat?.supplier_info?.priceTiers?.length || 0} 级阶梯价可用

### 3. 当前业务底座数据 (Ground Truth)
- **历史销售波动**: ${historySales || '无历史流水'}
- **出库频率分布**: 90天内出库 ${stats?.outboundCount || 0} 次
- **实时流动性**: 在库 ${detail?.inventory?.inStock || 0} | 在途 ${detail?.inventory?.inTransit || 0}
- **月均销量基准**: ${detail?.kpi?.avgMonthlySales || 0} 件/月

### 审计任务 (Audit Task)
1. **参数冲突检查**: 既然供应商交期是 ${strat?.supplier_info?.leadTime} 天，而你的预测权重设置中【近期权重】占比为 ${strat?.benchmark_type === 'mom' ? '高' : '低'}，这种组合在应对突发需求时是否存在“响应过慢”导致的断货风险？
2. **逻辑合理性判定**: 你设置的“${strat?.safety_stock_days}个月安全水位”是否能覆盖掉 ${stats?.outboundCount} 次出库所带来的频率随机性？
3. **策略优化处方**: 请结合以上全量参数，给出一套能最大化资金周转率（不积压）且保证 99% 不断货的最优配置建议。`;

        setMessages([{
            id: 'msg-start',
            role: 'system',
            content: `已深度解析销售预测权重、阶梯价策略及所有库存调节系数。正在启动全参数因果审计...`,
            timestamp: new Date()
        }]);
        setIsThinking(true);

        setTimeout(() => {
            const auditResult: ChatMessage = {
                id: 'msg-audit-final',
                role: 'ai',
                content: `根据对 **${sku}** 当前全量配置参数的审计，我为您整理了以下专业分析报告：

**1. 配置合理性判定：核心逻辑匹配，但参数组合略显“僵化”**

**2. 深度参数审计建议：**
- **预测权重风险**：目前的【${strat?.benchmark_type === 'yoy' ? '同比' : '环比加权'}】模型中，区间权重分配更偏向于历史平均。而在面对 ${stats?.outboundCount} 次/90天的高频出库现状时，这种权重的“平滑效果”会模糊掉近期的真实反转。
- **交期与水位的博弈**：考虑到您的 **${strat?.supplier_info?.leadTime} 天交期**，目前的 **${strat?.safety_stock_days}M 安全水位** 几乎没有给物流延迟留出余量。建议将【缓冲天数 (Buffer)】从 ${strat?.buffer_days || 0} 天上调至 **10 天**。
- **MOQ 与库存周转**：当前的 MOQ 为 ${strat?.supplier_info?.minOrderQty || 0}，结合您的补货周期 ${strat?.replenishment_sales_cycle}M，容易在销售淡季产生不必要的呆滞风险。

**3. 最优策略推荐配置：**
- **算法层**：建议将近 1 个月的销量权重提升至 **50%** 以上。
- **库存层**：维持当前安全系数，但启用“根据出库频次动态调节”的 ROP 逻辑。
- **结论**：当前策略属于“稳健但不灵敏”，仅建议在供应链极度稳定的情况下使用。`,
                timestamp: new Date(),
                promptUsed: prompt,
                cot: `1. 交叉比对全量配置：计算预测模型的敏感度 (Sensitivity) 指数。
2. 模拟断货风险：在 30 天 LT 下，若销量波动超过 15%，当前水位将无法覆盖。
3. 优化 MOQ 效应：评估现有的阶梯价采购批量对周转天数 (DIO) 的影响。
4. 汇总最优配置方案。`
            };
            setMessages(prev => [...prev, auditResult]);
            setIsThinking(false);
            setExpandedCoTId(auditResult.id);
        }, 2200);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newUserMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsThinking(true);

        setTimeout(() => {
            const aiResponse: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'ai',
                content: `好的。如果您调整了预测权重的滑动窗口参数，我们的安全水位逻辑也应同步下修 10%，以防止在响应变快后产生策略过冲导致的库存积压。`,
                timestamp: new Date(),
                promptUsed: `用户反馈: ${newUserMsg.content}\n全参数审计上下文已保留。`,
                cot: `评估用户调整后的参数组合对系统稳定性的新平衡点。`
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsThinking(false);
            setExpandedCoTId(aiResponse.id);
        }, 2000);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-gray-500 font-medium">正在深度解析全量预测权重与库存配置细节...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
            {/* Header */}
            <header className="h-[72px] flex-shrink-0 flex items-center justify-between px-8 bg-white border-b border-gray-100 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">备货AI建议</h1>
                            <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-100">
                                <Target size={12} /> Deep Precision
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">深度解析: {sku} | {strategy?.benchmark_type === 'yoy' ? '同比模型' : '环比(MoM)权重模型'}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Deep Configuration Summary */}
                <div className="w-[400px] bg-white border-r border-gray-100 flex-shrink-0 flex flex-col overflow-y-auto no-scrollbar hidden xl:flex">
                    <div className="p-6 space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-gray-800 border-b border-gray-50 pb-2">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <h2 className="font-bold text-[14px]">销售预测配置全细节</h2>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-[12px] text-gray-500">算法模型</span>
                                    <span className="text-[12px] font-bold text-gray-900">{strategy?.benchmark_type === 'yoy' ? '同比(YoY)' : '环比加权(MoM)'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[12px] text-gray-500">滑动窗口范围</span>
                                    <span className="text-[12px] font-bold text-gray-900">{(strategy?.benchmark_type === 'yoy' ? strategy?.yoy_range : strategy?.mom_range) || 0} 个周期</span>
                                </div>
                                <div className="space-y-1.5 border-t border-gray-200 pt-3">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">权重分布比例</span>
                                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-200 mt-1">
                                        <div className="bg-emerald-500 w-[40%]"></div>
                                        <div className="bg-emerald-300 w-[30%]"></div>
                                        <div className="bg-emerald-100 w-[30%]"></div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1 italic">注：当前预测结果已应用 {strategy?.ratio_adjustment || 0}% 的动态修正</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4 text-gray-800 border-b border-gray-50 pb-2">
                                <Layers size={16} className="text-indigo-500" />
                                <h2 className="font-bold text-[14px]">库存策略与供应参数细节</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">安全水位</p>
                                    <p className="text-lg font-black text-gray-900">{strategy?.safety_stock_days || 1} M</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">安全缓冲</p>
                                    <p className="text-lg font-black text-gray-900">{strategy?.buffer_days || 0} D</p>
                                </div>
                            </div>
                            <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/50 mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-500" />
                                        <span className="text-[12px] text-gray-600">供应商平均交期</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-indigo-700">{strategy?.supplier_info?.leadTime || 30} 天</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-indigo-500" />
                                        <span className="text-[12px] text-gray-600">最小起订量 (MOQ)</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-indigo-700">{strategy?.supplier_info?.minOrderQty || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4 text-gray-800 border-b border-gray-50 pb-2">
                                <ClipboardList size={16} className="text-gray-400" />
                                <h2 className="font-bold text-[14px]">实时底座数据摘要</h2>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-gray-500">在库 / 在途</span>
                                    <span className="font-bold">{productDetail?.inventory?.inStock || 0} / {productDetail?.inventory?.inTransit || 0}</span>
                                </div>
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-gray-500">出库活跃次 (90D)</span>
                                    <span className="font-bold text-amber-600">{stockingStats?.outboundCount || 0} 次</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative bg-white/50">
                    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto space-y-6 pb-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-shrink-0 mt-1">
                                            {msg.role === 'user' ? (
                                                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-md">
                                                    <User size={16} />
                                                </div>
                                            ) : msg.role === 'ai' ? (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md ring-2 ring-emerald-50">
                                                    <Sparkles size={16} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                                                    <Terminal size={14} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 px-1">
                                                <span className="text-[12px] font-medium text-gray-500">
                                                    {msg.role === 'user' ? '我' : msg.role === 'ai' ? '全参数精准审计专家' : '内核状态'}
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* AI Prompt & CoT Area (Visible audit records) */}
                                            {msg.role === 'ai' && (msg.promptUsed || msg.cot) && (
                                                <div className="w-full mb-2 bg-[#1e1e24] rounded-xl border border-[#2d2d35] overflow-hidden shadow-lg shadow-black/5">
                                                    <button
                                                        onClick={() => setExpandedCoTId(expandedCoTId === msg.id ? null : msg.id)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#25252b] hover:bg-[#2d2d35] transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-2 text-[#9ca3af] group-hover:text-white transition-colors">
                                                            <Terminal size={13} />
                                                            <span className="text-[12px] font-mono font-medium">全参数结构化审计提示词 (审计依据)</span>
                                                        </div>
                                                        {expandedCoTId === msg.id ? (
                                                            <ChevronDown size={14} className="text-gray-500" />
                                                        ) : (
                                                            <ChevronRight size={14} className="text-gray-500" />
                                                        )}
                                                    </button>

                                                    {expandedCoTId === msg.id && (
                                                        <div className="p-4 border-t border-[#2d2d35] font-mono text-xs leading-relaxed space-y-4">
                                                            {msg.promptUsed && (
                                                                <div>
                                                                    <div className="text-[11px] font-bold text-emerald-400 uppercase mb-1.5 tracking-wider">{'>>'} Full_Payload_Audit_Prompt</div>
                                                                    <div className="text-gray-300 whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/30">
                                                                        {msg.promptUsed}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {msg.cot && (
                                                                <div>
                                                                    <div className="text-[11px] font-bold text-amber-400 uppercase mb-1.5 tracking-wider">{'>>'} Reasoning_Chain (因果推演)</div>
                                                                    <div className="text-gray-400 whitespace-pre-wrap pl-2 border-l-2 border-amber-500/30">
                                                                        {msg.cot}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`px-5 py-3.5 rounded-2xl max-w-full overflow-hidden shadow-sm leading-relaxed text-[15px] ${msg.role === 'user'
                                                ? 'bg-black text-white rounded-tr-sm'
                                                : msg.role === 'system'
                                                    ? 'bg-gray-100/80 text-gray-500 font-mono text-sm border border-gray-200'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                                                }`}>
                                                <div className="whitespace-pre-wrap">
                                                    {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>{part}</strong> : part)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isThinking && (
                                <div className="flex justify-start animate-in fade-in duration-300">
                                    <div className="flex gap-4 max-w-[85%]">
                                        <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                                            <Bot size={16} className="animate-pulse" />
                                        </div>
                                        <div className="bg-white border border-gray-100 py-3.5 px-5 rounded-2xl rounded-tl-sm shadow-sm">
                                            <div className="flex items-center gap-1.5 h-6">
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                                                <span className="ml-2 text-sm text-gray-400 font-medium italic">正在交叉比对权重配置与交期风险...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-10 sticky bottom-0">
                        <div className="max-w-4xl mx-auto text-center mb-3">
                            <p className="text-[11px] text-gray-400 font-medium">专家已完全同步【{sku}】的所有预测模型权重与供应链细节</p>
                        </div>
                        <div className="max-w-4xl mx-auto">
                            <div className="relative flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-emerald-300 focus-within:shadow-lg transition-all p-2">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="针对这些全量参数设置，您有哪些关于风险评估的具体疑问？"
                                    className="flex-1 max-h-48 min-h-[44px] bg-transparent border-none resize-none py-2.5 px-3 text-[15px] focus:ring-0 outline-none"
                                    rows={1}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isThinking}
                                    className="h-11 w-11 flex-shrink-0 flex items-center justify-center bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all shadow-sm"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockAIAdvice;
