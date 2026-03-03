import React, { useState, useEffect } from 'react';
import {
    Cpu,
    Code2,
    History,
    RefreshCw,
    ShieldAlert,
    CheckCircle2,
    ArrowRight,
    BrainCircuit,
    Zap,
    Save,
    Users,
    ChevronRight,
    Loader2,
    AlertCircle,
    Info,
    CalendarDays,
    Database,
    Search
} from 'lucide-react';
import { api } from '../../services/api';
import { fetchQichachaData } from '../../utils/creditApi';
import { useSearchParams } from 'react-router-dom';

interface CustomerOption {
    id: number;
    customer_code: string;
    customer_name: string;
}

interface VerifiedDataItem {
    label: string;
    original?: string;
    ai_verified?: string;
    value?: string;
}

interface VerifiedDataInfo {
    public_and_risk_info: VerifiedDataItem[];
    internal_info: VerifiedDataItem[];
}

interface AnalysisResult {
    customer_name: string;
    recommended_level: string;
    recommended_credit_limit_cny: number;
    risk_tags: string[];
    verified_data?: VerifiedDataInfo;
    recent_important_events?: string[];
    decision_reasoning: string;
    thinking_process?: string;
    processing_time_ms?: number;
    applied_prompt?: string;
}

interface CreditAiHistory {
    id: number;
    customer_code: string;
    customer_name: string;
    applied_prompt: string;
    reasoning_path: string;
    analysis_result: AnalysisResult | null;
    created_at: string;
}

const DEFAULT_PROMPT = `【角色设定】
你是一位拥有 20 年经验的资深 B2B 工业级企业风控与信用评估专家。你需要根据提供的客户多维数据（外部工商/司法数据 + 内部历史交易数据），客观、严谨地评估该客户的信用等级，并给出建议的授信额度。

【输入数据】
1. 客户基本信息

客户名称：{{客户名称}}

所属行业：{{行业分类}}

注册资本：{{注册资本_万元}} 万元

经营状态：{{当前经营状态}}

2. 外部风险数据 (API 拉取)

近三年司法诉讼次数：{{司法诉讼次数}} 次

被执行人/失信记录：{{失信记录状态_有无}}

行政处罚金额：{{行政处罚累计_万元}} 万元

3. 内部交易履约数据 (ERP/业务系统抽取)
（注：如果以下内部数据项值为“暂无数据”，说明系统内确实无此类发生记录，请照此作为评估事实，无需自行虚构或去外部搜索内部营业秘密数据。）

历史合作时长：{{合作月数}} 个月

近 12 个月累计交易额：{{近一年交易额_万元}} 万元

历史平均回款天数 (DSO)：{{平均回款天数}} 天

历史逾期支付次数：{{历史逾期次数}} 次

当前最高单次交易额：{{最高单次交易额_万元}} 万元

【信息核对与搜索指令】
对于以上 1 和 2 项涉及的内容（属于公开信息与外部风险数据），如果提供的数据项中出现“暂无数据”、“未知”或缺失，请你利用搜索引擎或自身知识库再次确认该企业的最新相关情况。如果有更新或获取到了数据，请保留原有信息并结合你的搜索结果合并记录下来。
此外，你必须通过全网搜索，获取该企业【最近一个月内】发生的最重要、最具影响力的三件事（例如：融资、高管变动、重大合作、新品发布、负面舆情、处罚等），并在结果中返回。如果近期实在没有足以当作重要事件的新闻，可以通过搜索返回该企业相对近期的最重要动向。
对于第 3 项内部交易履约数据，请完全采信输入的信息，不作任何外部搜索或篡改。

【评估规则与红线】

一票否决（红线）： 若【被执行人/失信记录】为“有”，或【经营状态】异常（注销、吊销），必须直接评定为 D 级，且建议授信额度必须为 0。

内部数据优先： 在无外部致命风险的前提下，历史合作越久、交易额越大、且 DSO 越稳定（如小于 60 天），信用评级应越高。

额度测算逻辑： 基础建议授信额度不应超过【近 12 个月累计交易额】的 30%。若存在逾期记录，需在此基础上按比例下调额度。

【输出格式要求】
请你严格按照以下 JSON 格式输出结果，不要包含任何多余的 Markdown 标记或解释性文字，以便系统直接解析。
强烈要求：必须在 thinking_process 字段中完整输出你的思考逻辑、计算过程以及对缺失数据的检索确认结果。

{
  "customer_name": "{{客户名称}}",
  "recommended_level": "A/B/C/D 其中的一个",
  "recommended_credit_limit_cny": 建议金额数字,
  "risk_tags": ["风险标签1", "优势标签2", "提取的关键词"],
  "verified_data": {
    "public_and_risk_info": [
      {"label": "记录项名称(如所属行业)", "original": "原始输入的值", "ai_verified": "AI 搜索确认或更新的值(若无更新写无)"}
    ],
    "internal_info": [
      {"label": "记录项名称(如历史合作时长)", "value": "原始输入的值"}
    ]
  },
  "recent_important_events": [
    "近一个月重要事件1简述", 
    "近一个月重要事件2简述", 
    "近一个月重要事件3简述"
  ],
  "decision_reasoning": "由于需要展示你的推演思路，请将原本的结论提取浓缩至此，控制在 50 字以内的终局结论。",
  "thinking_process": "请在这里详细写出你对提供的各项数据（基本信息、外部风险、内部履约）的分析过程。如果有缺失项目，请说明你的搜索尝试和结果。详细描述你最终得出评级和额度的核心计算与支撑理由，字数不限，越详细专业越好。"
}`;

const CreditAI: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'raw' | 'prompt' | 'history'>('raw');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [internalData, setInternalData] = useState<any>(null);
    const [externalData, setExternalData] = useState<any>(null);
    const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 历史记录状态
    const [historyList, setHistoryList] = useState<CreditAiHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<CreditAiHistory | null>(null);

    // 新增：用于人工调整的状态
    const [manualSuggestion, setManualSuggestion] = useState<string>('');
    const [manualLimit, setManualLimit] = useState<number>(0);
    const [manualNote, setManualNote] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const data: any = await api.get('/credit-risk/list');
            setCustomers(data);
            const codeFromUrl = searchParams.get('customerCode');
            if (codeFromUrl && data.length > 0) {
                const cust = data.find((c: CustomerOption) => c.customer_code === codeFromUrl);
                if (cust) {
                    handleCustomerSelect(cust);
                }
            } else if (data.length > 0) {
                // handleCustomerSelect(data[0]); // Don't auto select to keep it clean
            }
        } catch (err) {
            console.error('Failed to fetch customers', err);
        }
    };

    const fetchHistory = async (customerCode: string) => {
        setIsLoadingHistory(true);
        try {
            const data: any = await api.get(`/credit-risk/history/${customerCode}`);
            setHistoryList(data);
        } catch (err) {
            console.error('Failed to fetch AI history', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history' && selectedCustomer) {
            fetchHistory(selectedCustomer.customer_code);
        } else if (activeTab === 'raw') {
            setSelectedHistory(null);
        }
    }, [activeTab, selectedCustomer]);

    const handleCustomerSelect = async (customer: CustomerOption) => {
        setSelectedCustomer(customer);
        setIsLoadingData(true);
        setError(null);
        try {
            // 1. 获取内部财务数据 (这里如果是真实环境应该有对应接口，目前我们 mock 结合后端同步逻辑)
            // 作为演示，我们从 customer_risk 表获取部分字段
            const detail: any = await api.get(`/credit-risk/detail/${customer.customer_code}`);
            setInternalData({
                entity_id: detail.customer_code,
                customer_name: detail.customer_name,
                current_limit: detail.total_limit,
                available: detail.available_limit,
                overdue: detail.overdue_amount,
                last_rating: detail.rating,
                debt_to_equity: detail.debt_to_equity || 0,
                revenue_ttm: detail.revenue_ttm || 0,
                cooperation_months: detail.cooperation_months || 0,
                max_single_trade: detail.max_single_trade || 0,
                cash_flow: detail.cash_flow || "N/A"
            });

            // 2. 获取外部企查查数据
            try {
                const ext = await fetchQichachaData(customer.customer_code);
                setExternalData(ext);
            } catch (extErr) {
                console.warn('External data fetch failed', extErr);
                setExternalData({ error: "未能拉取实时征信数据，请检查接口配置" });
            }

        } catch (err: any) {
            setError('加载客户数据失败: ' + err.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    const runAnalysis = async () => {
        if (!selectedCustomer || !internalData) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            let filledPrompt = customPrompt;
            filledPrompt = filledPrompt.replace(/\{\{客户名称\}\}/g, selectedCustomer.customer_name || '未知');

            const ind = externalData?.businessRegistration?.industry || '未知';
            const cap = externalData?.businessRegistration?.registCapi || '未知';
            const bizSt = externalData?.businessRegistration?.bizStatus || '未知';
            const lawsuits = externalData?.judicialRisk?.lawsuitCount ?? externalData?.judicialRisk?.pendingCasesCount ?? '未知';
            const isDishonest = externalData?.judicialRisk?.isDishonest ? '有' : '无';
            const penalty = externalData?.penaltyAmount || '未知';

            filledPrompt = filledPrompt.replace(/\{\{行业分类\}\}/g, ind);
            filledPrompt = filledPrompt.replace(/\{\{注册资本_万元\}\}/g, String(cap));
            filledPrompt = filledPrompt.replace(/\{\{当前经营状态\}\}/g, bizSt);
            filledPrompt = filledPrompt.replace(/\{\{司法诉讼次数\}\}/g, String(lawsuits));
            filledPrompt = filledPrompt.replace(/\{\{失信记录状态_有无\}\}/g, isDishonest);
            filledPrompt = filledPrompt.replace(/\{\{行政处罚累计_万元\}\}/g, String(penalty));

            filledPrompt = filledPrompt.replace(/\{\{合作月数\}\}/g, String(internalData.cooperation_months || '未知'));
            filledPrompt = filledPrompt.replace(/\{\{近一年交易额_万元\}\}/g, String(internalData.revenue_ttm || '未知'));
            filledPrompt = filledPrompt.replace(/\{\{平均回款天数\}\}/g, '暂无数据');
            filledPrompt = filledPrompt.replace(/\{\{历史逾期次数\}\}/g, internalData.overdue > 0 ? '有(需人工核实)' : '暂无数据');
            filledPrompt = filledPrompt.replace(/\{\{最高单次交易额_万元\}\}/g, String(internalData.max_single_trade || '未知'));

            const payload = {
                customerCode: selectedCustomer.customer_code,
                customerName: selectedCustomer.customer_name,
                internalData,
                externalData,
                customPrompt: filledPrompt
            };

            const result: any = await api.post('/credit-risk/ai-analyze', payload);

            // 确保 result 中保存了实际使用的 prompt
            const finalResult = { ...result, applied_prompt: filledPrompt };
            setAnalysisResult(finalResult);

            // 同步 AI 建议到人工调整状态
            const autoSuggest = result.recommended_level === 'D' ? '冻结' : result.recommended_level === 'C' ? '调减' : '维持';
            setManualSuggestion(autoSuggest);
            setManualLimit(result.recommended_credit_limit_cny);
        } catch (err: any) {
            setError('AI 分析请求失败: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsAnalyzing(false);
        }
    };
    const handleApplyLimit = async () => {
        if (!selectedCustomer || !analysisResult) return;

        setIsSaving(true);
        try {
            const riskLevel = analysisResult.recommended_level.includes('A') ? 'Low' :
                (analysisResult.recommended_level === 'C' || analysisResult.recommended_level === 'D') ? 'High' : 'Medium';

            await api.post('/credit-risk/update', {
                customer_code: selectedCustomer.customer_code,
                rating: analysisResult.recommended_level,
                total_limit: manualLimit,
                available_limit: manualLimit, // 假设同步更新可用额度
                last_evaluation_date: new Date().toISOString().split('T')[0],
                risk_status: riskLevel
            });
            alert('信用额度与评级已成功应用并生效！');
        } catch (err: any) {
            setError('应用失败: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReject = () => {
        if (window.confirm('确定要驳回本次 AI 评估结果吗？当前数据将不会被保存。')) {
            setAnalysisResult(null);
            setManualSuggestion('');
            setManualLimit(0);
            setManualNote('');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full bg-slate-50/50">

            {/* Left: Input & Data Stream */}
            <div className="w-full lg:w-[40%] flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Users className="w-5 h-5" />
                            <h2 className="font-bold">选择分析对象</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                            {customers.length} 位受控客户
                        </span>
                    </div>

                    <div className="relative group">
                        <select
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            onChange={(e) => {
                                const cust = customers.find(c => c.customer_code === e.target.value);
                                if (cust) handleCustomerSelect(cust);
                            }}
                            value={selectedCustomer?.customer_code || ""}
                        >
                            <option value="" disabled>-- 请选择一个客户以加载数据 --</option>
                            {customers.map(c => (
                                <option key={c.customer_code} value={c.customer_code}>
                                    {c.customer_name} ({c.customer_code})
                                </option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                </div>

                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full">
                        {[
                            { id: 'raw', label: '原始数据流', icon: <Cpu className="w-4 h-4" /> },
                            { id: 'prompt', label: 'Prompt 模板', icon: <Code2 className="w-4 h-4" /> },
                            { id: 'history', label: '历史记录', icon: <History className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    if (tab.id === 'raw') {
                                        // Reset completely when going back to raw stream
                                        setSelectedHistory(null);
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {activeTab === 'raw' && (
                        <>
                            {isLoadingData ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-sm font-bold text-slate-400">正在抓取内外部数据对...</p>
                                </div>
                            ) : selectedCustomer ? (
                                <>
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            内部财务数据快照
                                        </h3>
                                        <div className="bg-slate-900 rounded-2xl p-4 relative group">
                                            <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/10 text-[10px] text-white/40 font-bold rounded">JSON</div>
                                            <pre className="text-emerald-400 font-mono text-[12px] leading-relaxed overflow-x-auto">
                                                {JSON.stringify(internalData, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            外部征信数据 (企查查)
                                        </h3>
                                        <div className="bg-slate-900 rounded-2xl p-4 relative group">
                                            <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/10 text-[10px] text-white/40 font-bold rounded">JSON</div>
                                            <pre className="text-blue-400 font-mono text-[12px] leading-relaxed overflow-x-auto">
                                                {JSON.stringify(externalData, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex gap-3">
                                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <p className="text-[11px] font-bold text-indigo-700/80 leading-relaxed italic">
                                            提示：系统已为您整合了该客户的最新财报、回款记录以及企查查外部工商司法风险。点击右侧“开始智能分析”将调用 DeepSeek 云模型进行风险推演。
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                        <Users className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h4 className="font-bold text-slate-400">尚未选择分析对象</h4>
                                    <p className="text-xs text-slate-300 mt-2 font-medium">请在上方导航下拉框中选择一个客户，以拉取其实时信用底稿数据。</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'prompt' && (
                        <div className="space-y-4 flex flex-col h-full">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">系统 Prompt 预设</h3>
                                <button className="text-[10px] font-bold text-indigo-600 hover:underline" onClick={() => setCustomPrompt(DEFAULT_PROMPT)}>重置默认</button>
                            </div>
                            <textarea
                                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[11px] text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none min-h-[400px]"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                            />
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                <p className="text-[10px] font-bold text-amber-700">警告：修改提示词会显著影响 AI 的决策逻辑和输出格式，请谨慎操作。</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                <span>历史分析存档</span>
                                <button
                                    onClick={() => selectedCustomer && fetchHistory(selectedCustomer.customer_code)}
                                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1"
                                    disabled={!selectedCustomer}
                                >
                                    <RefreshCw className="w-3 h-3" />刷新
                                </button>
                            </h3>

                            {!selectedCustomer ? (
                                <div className="text-center py-10 opacity-50">
                                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-xs font-bold text-slate-400">请先选择分析对象</p>
                                </div>
                            ) : isLoadingHistory ? (
                                <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 text-indigo-300 animate-spin" /></div>
                            ) : historyList.length === 0 ? (
                                <div className="text-center py-10 opacity-50 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500">暂无历史记录</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyList.map(hist => (
                                        <div
                                            key={hist.id}
                                            onClick={() => {
                                                setSelectedHistory(hist);
                                                if (hist.analysis_result) {
                                                    setAnalysisResult(hist.analysis_result);
                                                }
                                            }}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedHistory?.id === hist.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-slate-500">
                                                    {new Date(hist.created_at).toLocaleString()}
                                                </span>
                                                {hist.analysis_result && (
                                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${hist.analysis_result.recommended_level?.includes('A') ? 'bg-emerald-100 text-emerald-700' :
                                                        hist.analysis_result.recommended_level?.includes('C') || hist.analysis_result.recommended_level?.includes('D') ? 'bg-rose-100 text-rose-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {hist.analysis_result.recommended_level}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">
                                                {hist.reasoning_path}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100">
                    <button
                        onClick={runAnalysis}
                        disabled={!selectedCustomer || isAnalyzing}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                AI 推理中...
                            </>
                        ) : (
                            <>
                                <BrainCircuit className="w-5 h-5" />
                                开始智能分析 (DeepSeek)
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Right: AI Analysis Results */}
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-10">

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-4 items-start">
                            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                            <div>
                                <h4 className="font-bold text-rose-900">执行错误</h4>
                                <p className="text-sm font-medium text-rose-700/80 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isAnalyzing && !analysisResult && !error && (
                        <div className="py-40 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                <BrainCircuit className="w-20 h-20 text-indigo-500 relative" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">AI 信用风险推演引擎</h2>
                            <p className="max-w-md text-slate-500 font-medium mt-4 leading-relaxed">
                                请在左侧选择需要分析的客户对象。DeepSeek 将结合内部财务大数据与全网征信快照，为您生成一份多维度的信用分析报告。
                            </p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isAnalyzing && (
                        <div className="py-40 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 relative mb-10">
                                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full" />
                                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                                <Zap className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">DeepSeek 正在解析...</h2>
                            <div className="space-y-3 mt-6">
                                <p className="text-slate-400 font-bold flex items-center justify-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                                    正在应用风控 Prompt 规则
                                </p>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    ESTIMATED REMAINING: 2s
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Analysis Report Content */}
                    {analysisResult && !isAnalyzing && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-700">
                            {/* Model Info Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center ring-1 ring-white/20">
                                        {selectedHistory ? <History className="w-8 h-8 text-indigo-200" /> : <BrainCircuit className="w-8 h-8 text-indigo-200" />}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            {selectedCustomer?.customer_name} 分析报告
                                            {selectedHistory && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full border border-white/20">历史存档</span>}
                                        </h1>
                                        <p className="text-indigo-100 text-sm mt-1 font-medium italic opacity-80">
                                            引擎: DeepSeek-V3 {selectedHistory ? `· 归档时间: ${new Date(selectedHistory.created_at).toLocaleString()}` : `· 耗时: ${(analysisResult.processing_time_ms || 0) / 1000}秒`}
                                        </p>
                                    </div>
                                </div>
                                {!selectedHistory && (
                                    <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all" onClick={runAnalysis}>
                                        <RefreshCw className="w-5 h-5 text-indigo-100" />
                                    </button>
                                )}
                            </div>

                            {/* Core Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">推荐信用等级</span>
                                    <div className="flex items-center gap-4 mt-4">
                                        <span className="text-5xl font-black text-slate-900 tracking-tighter">{analysisResult.recommended_level}</span>
                                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase border ${analysisResult.recommended_level?.includes('A') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            (analysisResult.recommended_level === 'C' || analysisResult.recommended_level === 'D') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {analysisResult.recommended_level?.includes('A') ? 'Low Risk' : (analysisResult.recommended_level === 'C' || analysisResult.recommended_level === 'D') ? 'High Risk' : 'Medium Risk'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="px-2 py-1 bg-indigo-50 rounded-lg text-indigo-600 text-[10px] font-black uppercase">额度建议</div>
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">建议授信上限</span>
                                    <div className="flex items-center gap-4 mt-4">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                            ¥{Number(analysisResult.recommended_credit_limit_cny).toLocaleString()}
                                        </span>
                                        <span className="text-slate-400 font-bold text-sm uppercase">CNY</span>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Warnings */}
                            <div className="space-y-6">
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 px-2">
                                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                                    关键风险雷达项
                                </h2>

                                <div className="grid grid-cols-1 gap-4">
                                    {analysisResult.risk_tags?.map((tag, i) => (
                                        <div key={i} className="p-6 rounded-2xl border flex items-start gap-4 transition-all hover:translate-x-1 bg-amber-50/50 border-amber-100 text-amber-900">
                                            <div className="mt-1">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm">{tag}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Verified Data Snapshot */}
                            {analysisResult.verified_data && (
                                <div className="space-y-6">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 px-2">
                                        <Database className="w-5 h-5 text-indigo-500" />
                                        资信全景视图 (AI 智能融合)
                                    </h2>

                                    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                                        {/* Public Data Section */}
                                        <div className="p-6 md:p-8">
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                    <Search className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <h3 className="font-bold text-slate-800">基本工商与外部风险</h3>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium ml-2">系统提取 + AI 检索核对</span>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {analysisResult.verified_data.public_and_risk_info?.map((info, idx) => (
                                                    <div key={idx} className="flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2">{info.label}</span>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex justify-between items-baseline border-b border-slate-200 pb-2 border-dashed">
                                                                <span className="text-xs text-slate-500">原始数据</span>
                                                                <span className="text-sm font-semibold text-slate-700">{info.original}</span>
                                                            </div>
                                                            <div className="flex justify-between items-baseline pt-1">
                                                                <span className="text-[10px] text-blue-500/80 font-bold flex items-center gap-1">
                                                                    <Zap className="w-3 h-3" /> AI 核实结果
                                                                </span>
                                                                <span className={`text-sm font-bold ${info.ai_verified && info.ai_verified !== '无' && info.ai_verified !== info.original ? 'text-blue-600' : 'text-slate-700'}`}>
                                                                    {info.ai_verified}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 w-full" />

                                        {/* Internal Data Section */}
                                        <div className="p-6 md:p-8 bg-slate-50/50">
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <History className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <h3 className="font-bold text-slate-800">内部交易履约事实</h3>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium ml-2">原样透传</span>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {analysisResult.verified_data.internal_info?.map((info, idx) => (
                                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-50 rounded-bl-xl flex items-start justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        </div>
                                                        <span className="block text-[10px] font-bold text-slate-400 mb-1 line-clamp-1">{info.label}</span>
                                                        <span className="text-sm font-black text-slate-800">{info.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recent Important Events */}
                            {(analysisResult.recent_important_events && analysisResult.recent_important_events.length > 0) && (
                                <div className="space-y-6">
                                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 px-2">
                                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                                        近期重要事件关注 (近 30 天)
                                    </h2>

                                    <div className="grid grid-cols-1 gap-4">
                                        {analysisResult.recent_important_events.map((event, i) => (
                                            <div key={i} className="p-6 rounded-2xl border flex items-start gap-4 transition-all hover:translate-x-1 bg-white border-slate-200">
                                                <div className="mt-1 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-black text-indigo-600">{i + 1}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-700 leading-relaxed">{event}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reasoning */}
                            <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    AI 深度推理思维链 (Reasoning Path)
                                </h3>
                                <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-indigo-100">
                                    {selectedHistory ? selectedHistory.reasoning_path : (analysisResult.thinking_process || analysisResult.decision_reasoning)}
                                </div>
                            </div>

                            {/* Applied Prompt Transparency */}
                            {analysisResult.applied_prompt && (
                                <div className="bg-slate-900 rounded-[32px] p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Code2 className="w-20 h-20 text-white" />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        本次分析应用的系统指令 (System Prompt)
                                    </h3>
                                    <div className="bg-black/30 rounded-2xl p-6 font-mono text-[11px] text-emerald-400/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                        {selectedHistory ? selectedHistory.applied_prompt : analysisResult.applied_prompt}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-4 italic font-medium">
                                        注：提示词已根据当前企业背景进行了动态增强，确保分析结论更具针对性。
                                    </p>
                                </div>
                            )}

                            {/* Final Approval Action */}
                            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-2xl mt-12 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">决策审定</h3>
                                        <p className="text-sm font-bold text-slate-400 mt-1">AI 建议对该实体采取 <span className="text-indigo-600 font-black">【{analysisResult.recommended_level === 'D' ? '冻结' : analysisResult.recommended_level === 'C' ? '调减' : '维持'}】</span> 策略</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                        {['维持', '调减', '冻结'].map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setManualSuggestion(opt)}
                                                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${manualSuggestion === opt ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">最终核定额度 (CNY)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-indigo-500">¥</div>
                                            <input
                                                type="number"
                                                value={manualLimit}
                                                onChange={(e) => setManualLimit(Number(e.target.value))}
                                                className="w-full pl-8 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">审批备注</label>
                                        <textarea
                                            placeholder="输入针对此笔授信的额外审批理由..."
                                            value={manualNote}
                                            onChange={(e) => setManualNote(e.target.value)}
                                            className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-16 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <button
                                        onClick={handleReject}
                                        className="text-sm font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest px-4"
                                    >
                                        驳回评估
                                    </button>
                                    <div className="flex gap-4">
                                        <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all">
                                            <Save className="w-4 h-4" />
                                            存档
                                        </button>
                                        <button
                                            onClick={handleApplyLimit}
                                            disabled={isSaving}
                                            className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-95 disabled:opacity-50"
                                        >
                                            {isSaving ? '正在应用...' : '应用额度生效'}
                                            {!isSaving && <ArrowRight className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditAI;
