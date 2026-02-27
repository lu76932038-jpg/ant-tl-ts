import React, { useState } from 'react';
import {
    FileText,
    BarChart3,
    Send,
    Loader2,
    Download,
    History
} from 'lucide-react';

type ReportType = 'data' | 'industry';

const ReportManagement: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [reportType, setReportType] = useState<ReportType>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        // TODO: Call backend API
        setTimeout(() => {
            setResult(`这是基于您的输入生成模拟报表内容。\n\n**请求类型**: ${reportType === 'data' ? '数据报表' : '行业报表'}\n**提示词**: ${prompt}`);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-[#f7f5f2] p-4 gap-4">
            {/* Header / Top Control Panel */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/60">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            报表管理
                        </h1>
                        <p className="text-slate-500 mt-1 ml-12">
                            通过自然语言描述，智能生成多维度数据报表与深度行业分析报告
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <History className="w-4 h-4" />
                        历史记录
                    </button>
                </div>

                {/* Input Area */}
                <div className="flex flex-col gap-4">
                    {/* Report Type Selector */}
                    <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setReportType('data')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportType === 'data'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            数据报表
                        </button>
                        <button
                            onClick={() => setReportType('industry')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportType === 'industry'
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            行业报表
                        </button>
                    </div>

                    {/* Promp Input */}
                    <div className="relative group">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={reportType === 'data'
                                ? "描述您需要的数据报表，例如：生成上个月各品类的库存周转率统计图..."
                                : "描述您关注的行业话题，例如：分析当下跨境电商物流成本的变化趋势..."}
                            className="w-full h-32 p-4 pr-32 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Enter 发送</span>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !prompt.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                生成报表
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Display Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm">
                {result ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/40">
                            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${reportType === 'data' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                生成结果预览
                            </h2>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="下载报表">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="prose max-w-none text-slate-600">
                                {/* Placeholder for markdown or charts */}
                                <pre className="whitespace-pre-wrap font-sans bg-transparent border-none">
                                    {result}
                                </pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <p className="text-sm">在此处预览生成的报表内容</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportManagement;
