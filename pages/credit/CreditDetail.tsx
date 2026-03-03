import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText,
    Share2,
    Download,
    RefreshCw,
    Activity,
    ShieldCheck,
    AlertCircle,
    TrendingUp,
    Info,
    CheckCircle2,
    Briefcase,
    Zap,
    History as HistoryIcon,
    Clock,
    ArrowUpRight,
    Search
} from 'lucide-react';
import {
    fetchQichachaData,
    refreshQichachaData,
    fetchCreditDetail,
    fetchCreditAiHistory,
    CreditExternalData,
    CreditDetailData,
    CreditAiHistory
} from '../../utils/creditApi';


const CreditDetail: React.FC = () => {
    // 从路由参数中动态读取客户代码（路由定义为 /credit/detail/:id）
    const { id: customerCode = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [externalData, setExternalData] = useState<CreditExternalData | null>(null);
    const [basicData, setBasicData] = useState<CreditDetailData | null>(null);
    const [aiHistory, setAiHistory] = useState<CreditAiHistory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
    const [dataSource, setDataSource] = useState<'qichacha' | 'tianyancha'>('tianyancha');

    const loadData = async (source: 'qichacha' | 'tianyancha' = dataSource) => {
        setLoading(true);
        setError(null);
        try {
            const [ext, intData, hist] = await Promise.all([
                fetchQichachaData(customerCode, source).catch(err => {
                    const msg = err.response?.data?.message || err.message || '获取外部数据失败';
                    setError(msg);
                    return null;
                }),
                fetchCreditDetail(customerCode).catch(() => null),
                fetchCreditAiHistory(customerCode).catch(() => [])
            ]);
            if (ext) setExternalData(ext);
            if (intData) setBasicData(intData);
            if (hist) setAiHistory(hist);
        } catch (err: any) {
            setError(err.message || '获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setError(null);
        setRefreshSuccess(false);
        try {
            // 调用强制刷新接口，带上选定的数据源
            const data = await refreshQichachaData(customerCode, dataSource);
            setExternalData(data);
            setRefreshSuccess(true);
            setTimeout(() => setRefreshSuccess(false), 3000);
        } catch (err: any) {
            // 尝试提取后端返回的详细错误 message
            const serverMsg = err.response?.data?.message || err.message || '刷新失败';
            setError(serverMsg);
            console.error('[Refresh Error]', err.response?.data || err);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (customerCode) loadData(dataSource);
    }, [customerCode, dataSource]);

    // 计算相对时间
    const getRelativeTime = (isoString: string) => {
        const diff = Date.now() - new Date(isoString).getTime();
        if (diff < 60000) return '刚刚更新';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${Math.floor(diff / 86400000)}天前`;
    };

    // --- 动态雷达图逻辑 ---
    const getRadarPoints = () => {
        const center = { x: 50, y: 55 };
        const maxRadius = 45;

        // 1. 资本实力 (向上 0°)
        const registCapiStr = externalData?.businessRegistration.registCapi || '';
        const capiMatch = registCapiStr.match(/(\d+(\.\d+)?)/);
        const capi = capiMatch ? parseFloat(capiMatch[0]) : 0;
        const capiScore = Math.min(Math.max((capi / 1000) * 100, 20), 100); // 以1000万为满分基准

        // 2. 偿债能力 (基础分来自等级)
        const rating = basicData?.rating || 'B';
        const debtScoreMap: Record<string, number> = { 'A+': 100, 'A': 85, 'B': 65, 'C': 40, 'D': 10 };
        const debtScore = debtScoreMap[rating] || 50;

        // 3. 内部履约 (基于营收和合作时长)
        const rev = (basicData?.revenue_ttm || 0) / 10000;
        const months = basicData?.cooperation_months || 0;
        const perfScore = Math.min(Math.max((rev / 200) * 80 + (months / 24) * 20, 20), 100);

        // 4. 外部风险 (基于风险等级)
        const riskLevel = externalData?.judicialRisk.level || 'safe';
        const riskScoreMap: Record<string, number> = { 'safe': 100, 'warning': 50, 'danger': 15 };
        const riskScore = riskScoreMap[riskLevel] || 80;

        const points = [
            { x: center.x, y: center.y - (capiScore / 100) * maxRadius }, // Top
            { x: center.x + (debtScore / 100) * maxRadius, y: center.y }, // Right
            { x: center.x, y: center.y + (perfScore / 100) * maxRadius }, // Down
            { x: center.x - (riskScore / 100) * maxRadius, y: center.y }, // Left
        ];

        return points.map(p => `${p.x},${p.y}`).join(' ');
    };

    // 动态计算综合评分 (350-850分制)
    const calculateCreditScore = () => {
        // 如果有 AI 生成的推荐额度，可以作为参考
        // 目前算法：(350基础分) + (加权得分 * 500)
        const ratingWeight: Record<string, number> = { 'A+': 0.95, 'A': 0.85, 'B': 0.65, 'C': 0.40, 'D': 0.20 };
        const weight = ratingWeight[basicData?.rating || 'B'] || 0.5;

        // 微调：如果有逾期，额外扣分
        const overduePenalty = (basicData?.overdue_amount || 0) > 0 ? 0.1 : 0;

        const finalScore = 350 + (weight - overduePenalty) * 500;
        return Math.round(finalScore);
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-full">
            {/* Top Breadcrumb & Actions */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="hover:text-indigo-600 cursor-pointer">信用管理</span>
                        <span>/</span>
                        <span className="text-slate-600">信用详情</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{basicData?.customer_name || '获取客户信息...'}</h1>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded uppercase tracking-wider border border-emerald-500/20">活跃客户</span>
                    </div>
                    <p className="text-slate-500 font-medium">企业信用管理档案 · ID: {basicData?.customer_code || customerCode}</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Share2 className="w-4 h-4" />
                        分享档案
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Download className="w-4 h-4" />
                        导出 PDF
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Credit Score */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">综合信用评分</span>
                        <div className="group/tip relative">
                            <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
                            <div className="absolute left-full -translate-x-[90%] bottom-full mb-2 w-56 p-2.5 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all z-[100] pointer-events-none border border-white/10 leading-relaxed translate-y-2 group-hover/tip:translate-y-0">
                                <p className="font-bold mb-1 text-indigo-300">评分引擎逻辑</p>
                                采用 350-850 分制。分值由等级权重 ({basicData?.rating})、履约稳定性、外部司法风险及 AI 评估结论加权计算得出。
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                            {calculateCreditScore()}
                        </span>
                        <span className="text-slate-400 font-bold text-sm">/ 850</span>
                    </div>
                    <div className={`text-sm font-black mt-1 uppercase ${calculateCreditScore() > 700 ? 'text-emerald-500' : calculateCreditScore() > 600 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {calculateCreditScore() > 800 ? '极好' : calculateCreditScore() > 700 ? '优秀' : calculateCreditScore() > 600 ? '良好' : '风险'}
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                            style={{ width: `${((calculateCreditScore() - 350) / 500) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Remaining Limit */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">授信额度</span>
                        <div className="group/tip relative">
                            <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
                            <div className="absolute left-full -translate-x-[90%] bottom-full mb-2 w-56 p-2.5 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all z-[100] pointer-events-none border border-white/10 leading-relaxed translate-y-2 group-hover/tip:translate-y-0">
                                <p className="font-bold mb-1 text-indigo-300">额度核定逻辑</p>
                                可用额度 = 总授信额度 - 未结清应收。目前应收数据暂由财务接口手动对接。
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">¥{basicData ? (Number(basicData.available_limit) / 10000).toFixed(1) : '0'}万</span>
                    </div>
                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase">总额度: ¥{basicData ? (Number(basicData.total_limit) / 10000).toFixed(1) : '0'}万</div>
                    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                            style={{ width: `${basicData && basicData.total_limit > 0 ? (Number(basicData.available_limit) / Number(basicData.total_limit)) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Risk Assessment */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">风险等级</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-emerald-600 text-sm">
                            {basicData?.rating || '-'}
                        </div>
                        <div>
                            <div className="text-lg font-black text-slate-900">
                                {basicData?.risk_status === 'High' ? '高风险' : basicData?.risk_status === 'Medium' ? '中风险' : '低风险'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                                评估: {basicData?.last_evaluation_date ? new Date(basicData.last_evaluation_date).toLocaleDateString() : '暂无'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-orange-50/30">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">待处理事项</h3>
                        {basicData?.todo_list && basicData.todo_list.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-lg uppercase">
                                {basicData.todo_list.length} 条建议
                            </span>
                        )}
                    </div>
                    <ul className="space-y-4">
                        {basicData?.todo_list ? basicData.todo_list.map((item, i) => (
                            <li key={i} className="flex items-center gap-3 group/item cursor-pointer">
                                <div className={`w-2 h-2 rounded-full transition-transform group-hover/item:scale-125 ${item.color === 'rose' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                    item.color === 'orange' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                                        item.color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
                                    }`} />
                                <span className={`text-xs font-bold transition-colors group-hover/item:text-slate-900 ${item.type === 'critical' ? 'text-rose-600' : 'text-slate-600'
                                    }`}>
                                    {item.label}
                                </span>
                            </li>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-4 opacity-20">
                                <CheckCircle2 className="w-8 h-8 mb-2" />
                                <p className="text-[10px] font-black uppercase">暂无紧急任务</p>
                            </div>
                        )}
                    </ul>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: External & Transaction Data */}
                <div className="lg:col-span-2 space-y-8">
                    {/* External API Data */}
                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <Activity className="w-5 h-5 text-indigo-500" />
                                外部 API 数据同步
                            </h2>
                            <div className="flex items-center gap-3">
                                {refreshSuccess && <span className="text-xs font-bold text-emerald-500 animate-pulse">✓ 刷新成功</span>}
                                <div className="relative group/select">
                                    <select
                                        value={dataSource}
                                        onChange={(e) => setDataSource(e.target.value as any)}
                                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 pl-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-white"
                                    >
                                        <option value="qichacha">数据源: 企查查(智能)</option>
                                        <option value="tianyancha">数据源: 天眼查(官方)</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowUpRight className="w-3 h-3 rotate-90" />
                                    </div>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className={`flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl hover:bg-indigo-100 transition-all shadow-sm active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? '同步中...' : '刷新 API'}
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            // 骨架屏
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between">
                                                <div className="h-4 bg-slate-200 rounded w-1/4" />
                                                <div className="h-3 bg-slate-200 rounded w-12" />
                                            </div>
                                            <div className="h-3 bg-slate-200 rounded w-3/4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            // 错误兜底
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col items-center justify-center text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                                <h4 className="font-bold text-amber-900 mb-1">外部数据同步超时</h4>
                                <p className="text-xs text-amber-700/80 font-medium">当前显示为系统缓存的历史数据，您可稍后再试。</p>
                                <p className="text-xs text-slate-400 mt-2 font-mono">{error}</p>
                            </div>
                        ) : externalData && (
                            <div className="space-y-4">
                                {/* Card 0: 企业基本信息 (新增) */}
                                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl border bg-indigo-50/30 border-indigo-100/50">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">所属行业</span>
                                        <p className="text-sm font-bold text-slate-700">{externalData.businessRegistration.industry || '未分类'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">注册资本</span>
                                        <p className="text-sm font-bold text-slate-700">
                                            {externalData.businessRegistration.registCapi?.includes('万')
                                                ? externalData.businessRegistration.registCapi
                                                : `¥ ${externalData.businessRegistration.registCapi} 万`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">经营状态</span>
                                        <p className="text-sm font-bold text-emerald-600">{externalData.businessRegistration.bizStatus || '存续'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">行政处罚</span>
                                        <p className={`text-sm font-bold ${externalData.penaltyAmount && externalData.penaltyAmount !== '0' ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {externalData.penaltyAmount ? `¥ ${externalData.penaltyAmount} 万` : '暂无处罚记录'}
                                        </p>
                                    </div>
                                </div>

                                {/* Card 1: 工商 */}
                                <div className={`flex gap-4 p-5 rounded-2xl border transition-all group ${externalData.businessRegistration.status === 'abnormal' ? 'bg-orange-50 border-orange-100 hover:border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                                    <div className={`p-3 bg-white rounded-xl shadow-sm transition-transform group-hover:scale-110 ${externalData.businessRegistration.status === 'abnormal' ? 'text-orange-500' : 'text-blue-500'}`}>
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className={`font-bold ${externalData.businessRegistration.status === 'abnormal' ? 'text-orange-900' : 'text-slate-800'}`}>
                                                工商登记变更
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {getRelativeTime(externalData.lastSyncTime)}
                                            </span>
                                        </div>
                                        <p className={`text-sm mt-1 font-medium ${externalData.businessRegistration.status === 'abnormal' ? 'text-orange-700/80' : 'text-slate-500'}`}>
                                            {externalData.businessRegistration.recentChanges}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-2">注册号: {externalData.businessRegistration.registrationNumber}</p>
                                    </div>
                                </div>
                                {/* Card 2: 司法 */}
                                <div className={`flex gap-4 p-5 rounded-2xl border group ${externalData.judicialRisk.level === 'danger' || externalData.judicialRisk.isDishonest ? 'bg-rose-50 border-rose-100' : externalData.judicialRisk.level === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className={`p-3 bg-white rounded-xl shadow-sm transition-transform group-hover:scale-110 ${externalData.judicialRisk.level === 'danger' || externalData.judicialRisk.isDishonest ? 'text-rose-500' : externalData.judicialRisk.level === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className={`font-bold ${externalData.judicialRisk.level === 'danger' || externalData.judicialRisk.isDishonest ? 'text-rose-900' : externalData.judicialRisk.level === 'warning' ? 'text-amber-900' : 'text-emerald-900'}`}>
                                                司法诉讼与执行风险
                                            </h4>
                                            <div className="flex gap-2">
                                                {externalData.judicialRisk.isDishonest && (
                                                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded uppercase">失信记录</span>
                                                )}
                                                <span className={`px-2 py-0.5 text-white text-[10px] font-black rounded uppercase ${externalData.judicialRisk.level === 'danger' ? 'bg-rose-600' : externalData.judicialRisk.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                                    {externalData.judicialRisk.level === 'danger' ? '高危' : externalData.judicialRisk.level === 'warning' ? '警告' : '安全'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className={`text-sm mt-1 font-medium italic ${externalData.judicialRisk.level === 'danger' || externalData.judicialRisk.isDishonest ? 'text-rose-600/70' : externalData.judicialRisk.level === 'warning' ? 'text-amber-700/80' : 'text-emerald-600/70'}`}>
                                            {externalData.judicialRisk.latestCaseSummary}
                                        </p>
                                        <div className="flex gap-4 mt-2">
                                            {externalData.judicialRisk.lawsuitCount !== undefined && (
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">近三年诉讼: <span className="text-slate-600">{externalData.judicialRisk.lawsuitCount} 起</span></p>
                                            )}
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">当前执行中: <span className={externalData.judicialRisk.pendingCasesCount > 0 ? "text-rose-500" : "text-slate-600"}>{externalData.judicialRisk.pendingCasesCount} 起</span></p>
                                        </div>
                                    </div>
                                </div>
                                {/* Card 3: 税务 */}
                                <div className={`flex gap-4 p-5 rounded-2xl border group ${['A', 'B'].includes(externalData.taxRating.grade) ? 'bg-emerald-50 border-emerald-100' : ['C', 'D'].includes(externalData.taxRating.grade) ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className={`p-3 bg-white rounded-xl shadow-sm transition-transform group-hover:scale-110 ${['A', 'B'].includes(externalData.taxRating.grade) ? 'text-emerald-500' : ['C', 'D'].includes(externalData.taxRating.grade) ? 'text-rose-500' : 'text-amber-500'}`}>
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className={`font-bold ${['A', 'B'].includes(externalData.taxRating.grade) ? 'text-emerald-900' : ['C', 'D'].includes(externalData.taxRating.grade) ? 'text-rose-900' : 'text-amber-900'}`}>
                                                    纳税信用等级
                                                </h4>
                                                <p className={`text-xs font-medium mt-0.5 ${['A', 'B'].includes(externalData.taxRating.grade) ? 'text-emerald-600/60' : ['C', 'D'].includes(externalData.taxRating.grade) ? 'text-rose-600/60' : 'text-amber-600/60'}`}>
                                                    评定年份: {externalData.taxRating.evaluatedYear}
                                                </p>
                                            </div>
                                            <div className={`text-2xl font-black ${['A', 'B'].includes(externalData.taxRating.grade) ? 'text-emerald-600' : ['C', 'D'].includes(externalData.taxRating.grade) ? 'text-rose-600' : 'text-amber-600'}`}>
                                                {externalData.taxRating.grade}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Internal Transaction Chart */}
                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-8">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">内部交易数据</h2>
                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">基于备货清单统计 (关联代码: {customerCode})</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">近一年交易额 (TTM)</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-slate-900">¥{(Number(basicData?.revenue_ttm || 0) / 10000).toFixed(1)}万</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">持续合作时长</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-slate-900">{basicData?.cooperation_months || 0}</span>
                                        <span className="text-xs font-bold text-slate-400">个月</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rolling 12-Month Sales Bar Chart */}
                        <div className="flex items-end justify-between h-48 gap-px">
                            {(() => {
                                const salesData = basicData?.monthly_sales || [];
                                if (salesData.length === 0) {
                                    return (
                                        <div className="flex-1 flex flex-col items-center justify-center h-full opacity-20">
                                            <p className="text-[10px] font-black uppercase">暂无过去12个月交易记录</p>
                                        </div>
                                    );
                                }

                                const maxAmount = Math.max(...salesData.map(d => Number(d.amount)), 1000);

                                return salesData.map((data, i) => {
                                    const amount = Number(data.amount);
                                    const heightPercent = maxAmount > 0 ? Math.max((amount / maxAmount) * 100, 2) : 2;
                                    const parts = data.month.split('-');
                                    const displayLabel = `${parts[1]}/${parts[0].slice(2)}`;

                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                                                {amount > 0 ? `¥${(amount / 10000).toFixed(1)}万 (${data.month})` : '暂无交易'}
                                            </div>
                                            <div
                                                className={`w-full rounded-t-lg transition-all relative overflow-hidden ${amount > 0 ? 'bg-indigo-500/20 group-hover:bg-indigo-600' : 'bg-slate-100'}`}
                                                style={{ height: `${amount > 0 ? heightPercent : 2}%` }}
                                            >
                                                {amount > 0 && <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 mt-3 group-hover:text-slate-900 transition-colors uppercase">{displayLabel}月</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right: Risk Radar & AI */}
                <div className="space-y-8">
                    {/* Risk Dimensions */}
                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-8">
                        <h2 className="text-lg font-black text-slate-900 mb-8">风险维度自画像</h2>

                        <div className="relative aspect-square flex items-center justify-center">
                            <svg viewBox="0 0 100 110" className="w-[90%] h-[90%] overflow-visible">
                                {/* Base Grid */}
                                <polygon points="50,10 85,32.5 85,77.5 50,100 15,77.5 15,32.5" className="fill-none stroke-slate-100 stroke-[0.5]" />
                                <polygon points="50,32.5 67.5,43.75 67.5,66.25 50,77.5 32.5,66.25 32.5,43.75" className="fill-none stroke-slate-50 stroke-[0.5]" />

                                {/* Axis Labels */}
                                <text x="50" y="0" textAnchor="middle" className="text-[7px] font-black fill-slate-400">资本实力</text>
                                <text x="102" y="55" textAnchor="start" className="text-[7px] font-black fill-slate-400">偿债能力</text>
                                <text x="50" y="115" textAnchor="middle" className="text-[7px] font-black fill-slate-400">内部履约</text>
                                <text x="-2" y="55" textAnchor="end" className="text-[7px] font-black fill-slate-400">外部风险</text>

                                {/* Dynamic Data Area */}
                                <polygon
                                    points={getRadarPoints()}
                                    className="fill-indigo-500/20 stroke-indigo-600 stroke-[1.5] drop-shadow-xl transition-all duration-1000 ease-out"
                                />

                                {/* Current Points Dots */}
                                {getRadarPoints().split(' ').map((p, i) => {
                                    const [x, y] = p.split(',');
                                    return <circle key={i} cx={x} cy={y} r="1.5" className="fill-indigo-600 animate-pulse" />;
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* AI Insights & History */}
                    <div className="space-y-8">
                        {/* Summary of Latest AI Decision */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-900/40 relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
                            <div className="flex items-center gap-3 mb-6 relative">
                                <div className="p-2.5 bg-white/10 backdrop-blur-xl rounded-2xl ring-1 ring-white/20">
                                    <Zap className="w-5 h-5 text-indigo-200" />
                                </div>
                                <h2 className="text-lg font-black tracking-tight">AI 智能研判</h2>
                            </div>
                            <div className="space-y-4 relative">
                                <p className="text-sm font-medium text-indigo-100 leading-relaxed">
                                    {aiHistory.length > 0 ? (
                                        aiHistory[0].reasoning_path.substring(0, 120) + '...'
                                    ) : (
                                        '当前客户尚未进行 AI 深度风险推演。启动 AI 分析可结合全网大数据获取更精准的信用评级建议。'
                                    )}
                                </p>
                                <div className="pt-4 border-t border-white/10">
                                    <button
                                        onClick={() => navigate(`/credit/ai-analysis?customerCode=${customerCode}`)}
                                        className="w-full py-3 bg-white text-indigo-900 text-xs font-black rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                    >
                                        信用AI分析
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Logs / Update History */}
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-8">
                            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <HistoryIcon className="w-5 h-5 text-indigo-500" />
                                    信用更新轨迹
                                </div>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">LOGS</span>
                            </h2>

                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-indigo-50 before:to-transparent">
                                {/* Last Sync Log */}
                                <div className="relative pl-10 group/log">
                                    <div className="absolute left-0 mt-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center -translate-x-1/2 z-10 transition-transform group-hover/log:scale-110">
                                        <Search className="w-3.5 h-3.5 text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-800">外部征信数据扫描</span>
                                            <span className="text-[9px] font-black text-emerald-500 uppercase px-1.5 py-0.5 bg-emerald-50 rounded">COMPLETED</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            系统已从外部企查查节点同步了最新的工商司法数据。抓取维度：{externalData?.businessRegistration.registCapi ? '注册资本、行业分类、风险摘要' : '全量同步'}。
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {externalData?.lastSyncTime ? new Date(externalData.lastSyncTime).toLocaleString() : '最近未同步'}
                                        </span>
                                    </div>
                                </div>

                                {/* AI Assessment History */}
                                {aiHistory.map((hist, idx) => (
                                    <div key={idx} className="relative pl-10 group/log">
                                        <div className="absolute left-0 mt-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center -translate-x-1/2 z-10 transition-transform group-hover/log:scale-110">
                                            <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-800">AI 信用价值评估</span>
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${hist.analysis_result.recommended_level?.startsWith('A') ? 'text-emerald-500 bg-emerald-50' : 'text-indigo-500 bg-indigo-50'
                                                    }`}>
                                                    LEVEL {hist.analysis_result.recommended_level}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed italic">
                                                “{hist.analysis_result.decision_reasoning}”
                                            </p>
                                            <span className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(hist.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Initial Registration Log */}
                                <div className="relative pl-10 group/log opacity-60">
                                    <div className="absolute left-0 mt-1.5 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center -translate-x-1/2 z-10 transition-transform group-hover/log:scale-110">
                                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-400">信用档案初始化</span>
                                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                            客户代码 {customerCode} 正式列入受控信用白名单。
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-300 mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            档案建立时间: {basicData?.created_at ? new Date(basicData.created_at).toLocaleDateString() : '历史留存'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreditDetail;
