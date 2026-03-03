import React, { useState } from 'react';
import {
    Search,
    Terminal,
    Cpu,
    Globe,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Code2,
    Database,
    Zap,
    Scale,
    RefreshCw
} from 'lucide-react';
import { testSub2ApiConnection } from '../../utils/creditApi';

const CreditApiTest: React.FC = () => {
    const [companyName, setCompanyName] = useState('爱安特（常州）精密机械有限公司');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [dataSource, setDataSource] = useState<'qichacha' | 'tianyancha'>('tianyancha');

    const handleRunTest = async () => {
        if (!companyName.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setActiveStep(1);

        try {
            await new Promise(r => setTimeout(r, 800));
            setActiveStep(2);

            const response = await testSub2ApiConnection(companyName, dataSource);

            await new Promise(r => setTimeout(r, 600));
            setActiveStep(3);

            setResult(response);
            setActiveStep(4);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || '抓取失败，请检查服务端配置');
            setActiveStep(0);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            title: dataSource === 'qichacha' ? '准备 Prompt 指令' : '构造 API 请求',
            icon: <Terminal className="w-4 h-4" />,
            desc: dataSource === 'qichacha' ? '注入公司名与校对规则' : '封装 Authorization 头'
        },
        {
            title: dataSource === 'qichacha' ? 'API 联网检索' : '官方接口直连',
            icon: <Globe className="w-4 h-4" />,
            desc: dataSource === 'qichacha' ? '穿透官方页面抓取' : '调用天眼查 OpenAPI'
        },
        {
            title: '结果数据映射',
            icon: <Cpu className="w-4 h-4" />,
            desc: dataSource === 'qichacha' ? 'AI 解析为系统 JSON' : '映射至统一征信模型'
        },
        {
            title: '完成检测',
            icon: <CheckCircle2 className="w-4 h-4" />,
            desc: '返回最终结果报文'
        },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 bg-slate-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/20">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    外部资信数据抓取实验室
                </h1>
                <p className="text-slate-500 font-medium ml-12">多通道（企查查联网/天眼查官方）抓取全过程模拟，验证数据准确性。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input & Steps */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => setDataSource('tianyancha')}
                                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'tianyancha' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    天眼查(官方)
                                </button>
                                <button
                                    onClick={() => setDataSource('qichacha')}
                                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${dataSource === 'qichacha' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    企查查(智能)
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">公司全称</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="输入要抓取的公司名称..."
                                        className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                            <button
                                onClick={handleRunTest}
                                disabled={loading}
                                className={`w-full h-14 ${loading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20'} rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95`}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        正在抓取中...
                                    </>
                                ) : (
                                    <>
                                        开始测试实时模拟
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Visual Steps */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            {steps.map((step, idx) => (
                                <div key={idx} className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${activeStep === idx + 1 ? 'bg-indigo-50 border-2 border-indigo-100 shadow-sm' : 'opacity-40'}`}>
                                    <div className={`mt-0.5 p-2 rounded-xl ${activeStep === idx + 1 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-black ${activeStep === idx + 1 ? 'text-indigo-900' : 'text-slate-700'}`}>{step.title}</h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase italic mt-0.5">{step.desc}</p>
                                    </div>
                                    {activeStep > idx + 1 && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>

                {/* Right: Detailed Process & Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Simulation Process Card */}
                    <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group min-h-[400px]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />

                        <div className="flex items-center justify-between mb-8 relative">
                            <div className="flex items-center gap-3">
                                <Code2 className="w-5 h-5 text-indigo-400" />
                                <h2 className="text-lg font-black text-white tracking-widest uppercase">实时数据采集流 (Console)</h2>
                            </div>
                            {loading && <div className="flex gap-1.5"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /><div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-75" /><div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse delay-150" /></div>}
                        </div>

                        <div className="space-y-6 relative font-mono">
                            {activeStep >= 1 && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-left-4">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <ChevronRight className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase group-hover:text-emerald-300 transition-colors">[STEP 1] 后端 System Prompt 真实指令集</span>
                                    </div>
                                    <div className="bg-black/60 p-5 rounded-2xl text-[10px] text-slate-300 font-mono leading-relaxed border border-emerald-500/10 whitespace-pre-wrap shadow-inner overflow-y-auto max-h-48 custom-scrollbar">
                                        {result ? result.data.appliedPrompt : `正在动态生成针对【${companyName}】的抓取策略...\n注入校对规则...\n穿透工商节点策略已准备就绪...`}
                                    </div>
                                </div>
                            )}

                            {activeStep >= 2 && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-left-4">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <ChevronRight className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase group-hover:text-indigo-300 transition-colors">[STEP 2] 发起 API 请求 (JSON Payload)</span>
                                    </div>
                                    <div className="bg-black/60 p-5 rounded-2xl text-[10px] text-indigo-300 font-mono leading-relaxed border border-indigo-500/10 shadow-inner overflow-y-auto max-h-48 custom-scrollbar">
                                        {result ? (
                                            dataSource === 'qichacha' ? (
                                                JSON.stringify({
                                                    method: 'POST',
                                                    url: 'https://vpsairobot.com/v1/responses',
                                                    payload: result.data.requestPayload
                                                }, null, 2)
                                            ) : (
                                                JSON.stringify({
                                                    method: 'GET',
                                                    url: 'http://open.api.tianyancha.com/services/open/ic/baseinfo/normal',
                                                    params: { keyword: companyName },
                                                    headers: { Authorization: 'eca290ee-df1d-***' }
                                                }, null, 2)
                                            )
                                        ) : (
                                            dataSource === 'qichacha' ?
                                                `正在构建 POST 请求实体...\n封装 Authorization: Bearer sk-29ba...\n模型配置: gpt-5.3-codex-spark\n正在执行联网检索逻辑...` :
                                                `正在构建 GET 请求...\n封装天眼查专属授信 Header...\n指定查询目标: ${companyName}\n正在连接天眼查官方 API 节点...`
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeStep >= 3 && activeStep < 4 && !result && (
                                <div className="text-xs text-slate-500 animate-pulse mt-4 ml-6">
                                    [RECEIVING_DATA_STREAM]...
                                </div>
                            )}

                            {result && (
                                <div className="space-y-4 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <ChevronRight className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">[STEP 3] 抓取结果响应 (JSON)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/60 p-5 rounded-2xl border border-white/10 space-y-3">
                                            <div className="pb-2 border-b border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">工商注册数据</span>
                                                <Database className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">统一代码:</span> <span className="text-[10px] text-white font-bold">{result.data.businessRegistration.registrationNumber || '未获悉'}</span></div>
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">注册资本:</span> <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">¥ {result.data.businessRegistration.registCapi || '--'} 万</span></div>
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">经营状态:</span> <span className="text-[10px] text-white font-bold">{result.data.businessRegistration.bizStatus || '未获悉'}</span></div>
                                            </div>
                                        </div>

                                        <div className="bg-black/60 p-5 rounded-2xl border border-white/10 space-y-3">
                                            <div className="pb-2 border-b border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">司法风险评估</span>
                                                <Scale className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">司法评级:</span> <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${result.data.judicialRisk.level === 'safe' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{result.data.judicialRisk.level || '未知'}</span></div>
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">诉讼次数:</span> <span className="text-[10px] text-white font-bold">{result.data.judicialRisk.lawsuitCount ?? 0}</span></div>
                                                <div className="flex justify-between"><span className="text-[10px] text-slate-400">罚款金额:</span> <span className="text-[10px] text-white font-bold">{result.data.penaltyAmount ?? 0} 万</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Search className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] font-black text-indigo-300 uppercase">最新工商变更记录</span>
                                        </div>
                                        <p className="text-[11px] text-indigo-100 leading-relaxed italic">
                                            "{result.data.businessRegistration.recentChanges || '未抓取到有效变更记录'}"
                                        </p>
                                    </div>

                                    {/* 原始报文展示区 */}
                                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-slate-500" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SUB2API 原始响应内容 (Raw Response)</span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 font-mono">Size: {JSON.stringify(result.data.rawResponse || '').length} chars</span>
                                        </div>
                                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                                            <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
                                                {result.data.rawResponse || '// 接口未返回原始报文内容'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditApiTest;
