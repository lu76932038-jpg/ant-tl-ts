import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    MessageCircle, Share2, MoreHorizontal, ThumbsUp,
    ChevronLeft, Loader2, Eye, Calendar, User as UserIcon,
    Sparkles, BrainCircuit, Lightbulb, Zap, Info, X as CloseIcon,
    ArrowRight, Terminal, Search
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';

interface Answer {
    id: number;
    content: string;
    author_name: string;
    author_avatar?: string;
    is_accepted: boolean;
    vote_count: number;
    created_at: string;
}

interface Question {
    id: number;
    title: string;
    content: string;
    author_name: string;
    author_avatar?: string;
    tags: string[];
    view_count: number;
    vote_count: number;
    created_at: string;
}

const processContent = (content: string) => {
    if (!content) return '';
    let processed = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    processed = processed.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" class="rounded-xl shadow-md border border-gray-100 my-4 max-w-full hover:shadow-lg transition-all" />`;
    });
    const fileNameOnlyRegex = /^(?:https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.gif))$/i;
    if (fileNameOnlyRegex.test(processed.trim())) {
        return `<img src="${processed.trim()}" class="rounded-xl shadow-md border border-gray-100 my-4 max-w-full" />`;
    }
    return processed;
};

const CommunityDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const quillRef = useRef<ReactQuill>(null);

    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAnswer, setNewAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // AI Analysis State
    const [aiAnalyzing, setAiAnalyzing] = useState(true);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiRating, setAiRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [aiAnalysis, setAiAnalysis] = useState<{
        summary: string;
        pros: string[];
        suggestion: string;
        thought: string[];
        rawInput: string;
    } | null>(null);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                ['bold', 'italic', 'underline', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                    input.onchange = async () => {
                        const file = input.files ? input.files[0] : null;
                        if (file && quillRef.current) {
                            const formData = new FormData();
                            formData.append('image', file);
                            try {
                                const res = await api.post('/upload/image', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const url = (res as any).url;
                                const editor = (quillRef.current as any).getEditor();
                                const range = editor.getSelection();
                                editor.insertEmbed(range ? range.index : 0, 'image', url);
                            } catch (error) {
                                console.error('Upload failed', error);
                                alert('图片上传失败');
                            }
                        }
                    };
                }
            }
        }
    }), []);

    const fetchDetail = async () => {
        try {
            const res = await api.get(`/community/questions/${id}`);
            const data = res as any;
            setQuestion(data.question);
            setAnswers(data.answers);

            // Trigger AI Analysis simulation (inclusive of answers)
            simulateAIAnalysis(data.question, data.answers);

            // Record view time to clear "New" badge in list
            const viewKey = `q_view_${id}`;
            localStorage.setItem(viewKey, new Date().toISOString());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const simulateAIAnalysis = (q: Question, currentAnswers: Answer[]) => {
        setAiAnalyzing(true);
        setTimeout(() => {
            const lowTitle = q.title.toLowerCase();
            const lowContent = q.content.toLowerCase();
            const answersText = currentAnswers.map(a => a.content).join(' ');
            const allText = lowTitle + ' ' + lowContent + ' ' + answersText;

            // 全系统功能关键词匹配
            const isStock = /备货|库存|补货|销量|sku|stock/.test(allText);
            const isInquiry = /询价|价格|报价|pdf|解析|inquiry/.test(allText);
            const isOrder = /a&t|at|订单|合同|order/.test(allText);
            const isInvoice = /高铁|发票|打车|商旅|invoice|train/.test(allText);
            const isAccount = /密码|账号|权限|个人|profile|password/.test(allText);

            let analysis = {
                summary: '',
                pros: [] as string[],
                suggestion: '',
                thought: [] as string[],
                rawInput: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    context: "殸木全系统集成环境 v1.0",
                    input_payload: {
                        question: {
                            id: q.id,
                            title: q.title,
                            content: q.content,
                            tags: q.tags
                        },
                        answersCount: currentAnswers.length,
                        answersData: currentAnswers.map(a => ({
                            author: a.author_name,
                            content: a.content.substring(0, 200) + "...",
                            votes: a.vote_count
                        }))
                    },
                    system_prompts: [
                        "Role: DeepSeek Business Logic Consultant (Comprehensive Review Mode)",
                        "Inventory_Algorithm: ROP_v2.1",
                        "Cross_Module_Dependency: [Stock, Order, Inquiry, Invoice]"
                    ]
                }, null, 4)
            };

            if (isStock) {
                analysis.summary = "DeepSeek 检测到高度关联的 **殸木备货决策流**。该问题核心涉及动销数据与供应链稳定。";
                analysis.pros = [
                    "殸木 ROP 算法已集成核心动销数据，支持【最低销售期】动态预警",
                    "关联功能：‘备货助手’可实时自动生成采购建议，无需人工二次核算",
                    "进阶链路：备货清单生成的加单记录可一键同步至‘A&T 订单’模块进行跟踪"
                ];
                analysis.suggestion = "建议您通过【备货助手 -> 备货清单】调整补货周期，并结合【A&T 订单】模块监控到货异常，实现全链路库存管控。";
                analysis.thought = [
                    "1. 接收全量数据流：扫描 payload.question 与 payload.answersData (共 " + currentAnswers.length + " 条回答)。",
                    "2. 语义综合判定：在多方互动上下文中，确认 [备货/库存] 维度的业务逻辑优先级。",
                    "3. 注入系统规则库：基于当前各回答提及的补货周期，加载 ROP_v2.1 动销修正参数。",
                    "4. 全链路方案生成：交叉验证 Stock 与 Order 模块的数据依赖，输出包含补充建议的综合方案。"
                ];
            } else if (isInquiry) {
                analysis.summary = "识别到 **询价解析与成本管控** 场景。系统致力于解决繁琐的人工录入工作。";
                analysis.pros = [
                    "核心功能：支持 PDF 询价单一键解析，AI 自动提取型号、数量与目标价",
                    "协作链路：解析后的询价记录可在‘询价解析列表’中查看历史轨迹，防止重复询价",
                    "系统闭环：最终确定的供应商报价可辅助后续备货环节的成本基准设定"
                ];
                analysis.suggestion = "如需提升效率，建议在【殸木小工具 -> 询价管理】中批量上传原件，并利用 Excel 导出功能快速同步至您的协同工作组。";
                analysis.thought = [
                    "1. 全量扫描启动：解析 payload.question 与 payload.answersData 中的询价意图特征。",
                    "2. 定位功能子集：通过上下文语义关联映射至 PDF_Structure_Recognizer_v4 引擎。",
                    "3. 痛点深度研判：基于问答互动中的报错/效率反馈，锁定识别精度与导出链路优化点。",
                    "4. 闭环策略交付：推荐跨模块询价自动化插件，实现报价到成本基准的自动映射。"
                ];
            } else if (isOrder) {
                analysis.summary = "检测到关于 **A&T 订单链路** 的咨询。该模块是殸木系统的核心业务中枢。";
                analysis.pros = [
                    "数据闭环：支持从外部订单同步至殸木内部系统，实现订单状态全生命周期监控",
                    "功能联动：订单发货状态将直接影响‘备货助手’中的【在途库存】计算逻辑",
                    "合规记录：所有合同与订单改动均记录在系统日志，确保业务动作可追溯"
                ];
                analysis.suggestion = "建议在【A&T 订单】模块中开启到货通知，这能帮助您在【备货助手】中更精准地预测未来的缺货风险。";
                analysis.thought = [
                    "1. 模式识别：检测到 A&T/Order 业务关键标识。",
                    "2. 全局拓扑扫描：识别 Order 模块作为关键核心节点 (Hub Nodes)。",
                    "3. 数据影响评估：判定订单状态对 Stock 模块在途量的全局影响比重。",
                    "4. 交付业务洞察：输出订单-库存闭环监控方案。"
                ];
            } else if (isInvoice) {
                analysis.summary = "识别到 **高铁发票/财务辅助** 相关场景。该功能旨在简化零碎的报销流程。";
                analysis.pros = [
                    "便捷解析：支持扫码或上传 PDF 原始凭证，AI 自动结构化发票核心信息",
                    "效率工具：批量打包功能可一键生成标准报销清单，减少手工录入错误",
                    "系统位置：位于‘殸木小工具 -> 高铁发票助手’，是出差商旅、项目成本核算的得力助手"
                ];
                analysis.suggestion = "推荐将解析后的发票清单定期导出，并结合【个人中心】的历史记录进行对比，确保报销周期与公司流程对齐。";
                analysis.thought = [
                    "1. 语义识别：命财务辅助分类元数据 [Invoice/Train]。",
                    "2. 模块定向：路由至殸木小工具库 -> 发票助手功能子集。",
                    "3. 效益建模：计算自动化解析对手工录入的提效比重。",
                    "4. 工具推荐：输出一键打包导出与报销流程对齐建议。"
                ];
            } else if (isAccount) {
                analysis.summary = "识别到 **账户安全与系统设置** 范畴。保障您的工作环境稳定与数据安全。";
                analysis.pros = [
                    "权限管控：系统根据‘用户管理’设定的角色分配库存、询价等的特定操作权",
                    "信息维护：支持在【个人中心 -> 修改密码】处定期更新凭证，加固账户安全",
                    "异常追溯：所有登录行为均记录在‘登录日志’中，支持管理员实时审计"
                ];
                analysis.suggestion = "如遇权限缺失，请联系系统管理员在【系统管理 -> 用户管理】中为您配置对应的模块访问许可。";
                analysis.thought = [
                    "1. 识别安全域动作：[Password/Permission/Log]。",
                    "2. 系统权限自检：映射到用户管理与底层审计日志模块。",
                    "3. 合规性分析：判定为多租户隔离环境下的权限申请诉求。",
                    "4. 路由指引：推荐管理员层级的权限加固方案。"
                ];
            } else {
                analysis.summary = "DeepSeek 已扫描殸木全系统功能矩阵。识别到该问题属于 **社区综合互动与经验交流**。";
                analysis.pros = [
                    "知识沉淀：您的每一次提问都将成为社区‘帮助文档’的潜在素材",
                    "全能建议：建议结合‘备货助手’与‘询价管理’实现业务能力的闭环提升",
                    "平台协作：良好的标签分类能帮助专家更精准地定位您的业务板块"
                ];
                analysis.suggestion = "您可以尝试搜索社区内的关键词，或在【殸木小工具】中寻找是否有直接对应的自动化插件来解决当前痛点。";
                analysis.thought = [
                    "1. 全域特征扫描：业务关键词匹配率 < 0.3。",
                    "2. 语义模糊匹配：判定为非结构化知识交流场景。",
                    "3. 全系统资源检索：未发现强关联的垂直功能模块。",
                    "4. 生成启发式洞察：提供社区式互助经验指引。"
                ];
            }

            setAiAnalysis(analysis);
            setAiAnalyzing(false);
        }, 2000);
    };

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const handlePostAnswer = async () => {
        if (!newAnswer.trim() || newAnswer === '<p><br></p>') return;
        setSubmitting(true);
        try {
            await api.post(`/community/questions/${id}/answers`, { content: newAnswer });
            setNewAnswer('');
            fetchDetail();
        } catch (error) {
            console.error(error);
            alert('发布回答失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (targetType: 'question' | 'answer', targetId: number) => {
        try {
            await api.post('/community/vote', { targetType, targetId });
            fetchDetail();
        } catch (error) {
            console.error(error);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
        );
    }

    if (!question) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
                <p className="text-gray-500 mb-4">该问题可能已被删除或不存在</p>
                <button onClick={() => navigate('/community')} className="text-violet-600 font-bold">返回社区</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/community')}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">返回社区</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-8 space-y-8 min-w-0">
                        {/* Question Card */}
                        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden group">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 -mr-32 -mt-32 rounded-full blur-3xl transition-all group-hover:bg-violet-600/10" />

                            <div className="flex flex-wrap gap-2 mb-6">
                                {question.tags && question.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-6 leading-tight relative">
                                {question.title}
                            </h1>

                            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-50">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-bold border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                                    {question.author_avatar ? <img src={question.author_avatar} className="w-full h-full object-cover" /> : question.author_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-bold text-gray-900 truncate">{question.author_name}</div>
                                    <div className="text-xs text-gray-400 font-medium whitespace-nowrap">发布于 {new Date(question.created_at).toLocaleString()}</div>
                                </div>
                            </div>

                            <div
                                className="prose prose-slate max-w-none text-gray-700 text-lg leading-relaxed mb-10 overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: processContent(question.content) }}
                            />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => handleVote('question', question.id)}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all ${question.vote_count > 0 ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <ThumbsUp size={18} className={question.vote_count > 0 ? "fill-white" : ""} />
                                        <span>{question.vote_count}</span>
                                    </button>
                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                                        <Eye size={16} /> <span>{question.view_count} 次浏览</span>
                                    </div>
                                </div>
                                <button onClick={handleShare} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-colors">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Answers List Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-2xl font-black text-gray-900">
                                    {answers.length} {answers.length <= 1 ? '回答' : '回答'}
                                </h3>
                            </div>

                            {answers.map((answer, index) => (
                                <div
                                    key={`${answer.id}-${index}`}
                                    className={`bg-white rounded-3xl p-8 border transition-all shadow-sm hover:shadow-md ${answer.is_accepted ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-100'}`}
                                >
                                    <div className="flex gap-6">
                                        <div className="flex flex-col items-center gap-3">
                                            <button
                                                onClick={() => handleVote('answer', answer.id)}
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${answer.vote_count > 0 ? 'bg-violet-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                            >
                                                <ThumbsUp size={20} className={answer.vote_count > 0 ? "fill-white" : ""} />
                                            </button>
                                            <span className={`font-black text-xl ${answer.vote_count > 0 ? 'text-violet-600' : 'text-gray-300'}`}>
                                                {answer.vote_count}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden text-sm uppercase flex-shrink-0">
                                                        {answer.author_avatar ? <img src={answer.author_avatar} className="w-full h-full object-cover" /> : answer.author_name.substring(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-900 truncate">{answer.author_name}</div>
                                                        <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(answer.created_at).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                {answer.is_accepted && (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">
                                                        Best Answer
                                                    </span>
                                                )}
                                            </div>

                                            <div
                                                className="prose prose-slate max-w-none text-gray-700 leading-relaxed overflow-hidden"
                                                dangerouslySetInnerHTML={{ __html: processContent(answer.content) }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {answers.length === 0 && (
                                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-inner">
                                    <MessageCircle size={40} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-medium">暂无回答，抢占沙发~</p>
                                </div>
                            )}
                        </div>

                        {/* Write Answer Card */}
                        <div id="answer-section" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-black text-gray-900 mb-6">编写你的回答</h3>
                            <div className="mb-6 h-[250px] richness-editor">
                                <ReactQuill
                                    ref={quillRef}
                                    theme="snow"
                                    value={newAnswer}
                                    onChange={setNewAnswer}
                                    modules={modules}
                                    className="h-full bg-white"
                                    placeholder="分享你的见解..."
                                    formats={[
                                        'header',
                                        'bold', 'italic', 'underline', 'strike', 'blockquote',
                                        'list', 'bullet', 'indent',
                                        'link', 'image'
                                    ]}
                                />
                            </div>
                            <div className="flex justify-end pt-12 md:pt-4">
                                <button
                                    onClick={handlePostAnswer}
                                    disabled={submitting || !newAnswer.trim() || newAnswer === '<p><br></p>'}
                                    className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-violet-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                                    {submitting ? '提交中...' : '发布回答'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                        {/* DeepSeek AI Analysis Module */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-1 shadow-2xl shadow-indigo-200 relative overflow-hidden group/ai">
                            {/* AI Sparkle Effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl -mr-16 -mt-16 animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-600/10 blur-xl -ml-12 -mb-12" />

                            <div className="bg-slate-900/40 rounded-[22px] p-6 relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg animate-float">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-base tracking-wide flex items-center gap-2">
                                                DeepSeek AI 洞察
                                            </h3>
                                            <p className="text-indigo-300/60 text-[10px] font-bold uppercase tracking-[0.2em] leading-none">Intelligence Engine</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!aiAnalyzing && (
                                            <button
                                                onClick={() => setShowAiModal(true)}
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                title="查看推理详情"
                                            >
                                                <Info size={16} />
                                            </button>
                                        )}
                                        {aiAnalyzing && (
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-75" />
                                                <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-150" />
                                                <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-300" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {aiAnalyzing ? (
                                    <div className="space-y-4 py-4">
                                        <div className="h-3 bg-slate-800 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-3 bg-slate-800 rounded-full w-full animate-pulse " />
                                        <div className="h-3 bg-slate-800 rounded-full w-5/6 animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <p className="text-slate-300 text-sm font-medium leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 italic">
                                            "{aiAnalysis?.summary}"
                                        </p>

                                        <div className="space-y-3">
                                            <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <BrainCircuit size={14} className="opacity-70" /> 关键洞察
                                            </h4>
                                            <ul className="space-y-3">
                                                {aiAnalysis?.pros.map((pro, i) => (
                                                    <li key={i} className="flex gap-3 text-xs text-slate-400 font-medium leading-normal">
                                                        <Zap size={12} className="text-amber-400 shrink-0 mt-0.5" />
                                                        {pro}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="pt-4 border-t border-slate-700/50">
                                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
                                                <h4 className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Lightbulb size={14} /> 技术建议
                                                </h4>
                                                <p className="text-xs text-indigo-100/80 leading-relaxed">
                                                    {aiAnalysis?.suggestion}
                                                </p>
                                            </div>
                                        </div>

                                        {/* AI Rating Section */}
                                        <div className="pt-2 flex flex-col items-center gap-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">您对本次 AI 洞察满意吗？</p>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setAiRating(star)}
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        className="transition-all active:scale-90"
                                                    >
                                                        <Zap
                                                            size={18}
                                                            className={`transition-colors ${star <= (hoverRating || aiRating)
                                                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                                                : 'text-slate-700'
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            {aiRating > 0 && (
                                                <span className="text-[10px] text-indigo-400 font-bold animate-in fade-in slide-in-from-top-1">
                                                    感谢您的反馈！
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Author Brief Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12" />

                            <h4 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6 relative">关于作者</h4>
                            <div className="flex items-center gap-4 mb-4 relative">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                                    {question.author_avatar ? <img src={question.author_avatar} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-gray-900 truncate">{question.author_name}</div>
                                    <div className="text-xs text-gray-400 font-bold">殸木资深专家</div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium relative">
                                致力于打通殸木系统各链路，擅长解决复杂的逻辑与集成问题。
                            </p>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                                        <Eye size={20} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-gray-900">{question.view_count}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">浏览次数</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">活跃中</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">问题状态</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsFollowing(!isFollowing)}
                                className={`w-full mt-8 py-4 rounded-2xl font-black transition-all text-sm uppercase tracking-widest border-2 ${isFollowing ? 'bg-violet-50 text-violet-600 border-violet-100 shadow-inner' : 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-200 hover:-translate-y-0.5 active:scale-[0.98]'}`}
                            >
                                {isFollowing ? '已关注此问题' : '关注问题'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Reasoning Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAiModal(false)} />

                    <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                    <BrainCircuit size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">AI 推理详情</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">DeepSeek Chain-of-Thought</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAiModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                            {/* Input Source */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <Terminal size={14} /> 原始输入详情
                                </div>
                                <div className="bg-slate-900 rounded-2xl p-5 font-mono text-sm text-indigo-300/80 leading-relaxed border border-slate-800 shadow-inner">
                                    {aiAnalysis?.rawInput}
                                </div>
                            </section>

                            {/* Thought Process */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <Search size={14} /> 逻辑解析链
                                </div>
                                <div className="space-y-4 ml-2">
                                    {aiAnalysis?.thought.map((step, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                                                    {i + 1}
                                                </div>
                                                {i !== aiAnalysis.thought.length - 1 && (
                                                    <div className="w-0.5 h-10 bg-indigo-50" />
                                                )}
                                            </div>
                                            <div className="pt-0.5 text-sm text-slate-600 font-medium leading-relaxed">
                                                {step}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Final Output */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <Sparkles size={14} /> 结构化响应结论
                                </div>
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-indigo-600 text-white rounded-lg"><ArrowRight size={16} /></div>
                                        <div className="text-sm text-slate-700 font-bold leading-relaxed">{aiAnalysis?.summary}</div>
                                    </div>
                                    <div className="pl-12 text-xs text-indigo-600/70 font-medium italic">
                                        * 分析已根据殸木全系统功能矩阵完成对齐
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-top border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowAiModal(false)}
                                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                完成阅读
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                
                .richness-editor .ql-container {
                    border-bottom-left-radius: 1.5rem;
                    border-bottom-right-radius: 1.5rem;
                    font-size: 1rem;
                    min-height: 180px;
                }
                .richness-editor .ql-toolbar {
                    border-top-left-radius: 1.5rem;
                    border-top-right-radius: 1.5rem;
                    background: #fdfdfd;
                    border-color: #f1f5f9 !important;
                }
                .richness-editor .ql-container.ql-snow {
                    border-color: #f1f5f9 !important;
                }
                .prose img {
                    max-width: 100%;
                    height: auto;
                    object-fit: contain;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}} />
        </div>
    );
};

export default CommunityDetail;
