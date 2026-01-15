import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, PieChart, Table as TableIcon, History, Bot, Terminal, X, ChevronRight, Activity, Trash2 } from 'lucide-react';

interface Message {
    role: 'user' | 'ai';
    content: string;
    type?: 'text' | 'table' | 'chart';
    data?: any;
    sql?: string;
}

const AtOrderChat: React.FC = () => {
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>('deepseek');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            content: '你好！我是您的 A&T 订单智能助手。您可以向我询问订单状态或进行数据统计分析。',
            type: 'text'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [logs, setLogs] = useState<{ id: string; time: string; type: 'info' | 'success' | 'warning' | 'error'; content: string; detail?: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = (content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', detail?: string) => {
        setLogs(prev => [...prev, {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            type,
            content,
            detail
        }]);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToLogsBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        if (isLogOpen) {
            scrollToLogsBottom();
        }
    }, [logs, isLogOpen]);

    const QUICK_ACTIONS = [
        "今天延期的订单有哪些？",
        "10月哪个销售接单最多？",
        "查看本月销售占比项",
        "导出本周订单列表"
    ];

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput('');
        setIsTyping(true);
        addLog(`Started request: ${currentInput}`, 'info', `Model: ${selectedModel}\nTimestamp: ${new Date().toISOString()}`);

        try {
            const response = await fetch('/api/orders/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: currentInput, model: selectedModel })
            });

            const result = await response.json();

            if (result.success) {
                addLog('Response received', 'success', `Time: ${new Date().toLocaleTimeString()}\nAI Message: ${result.message || 'No text response'}`);

                if (result.sql) {
                    addLog('SQL Generated', 'warning', result.sql);
                } else {
                    addLog('No SQL Generated', 'info', 'This query might not require database access.');
                }

                if (result.debug) {
                    // Step 1: SQL Generation Logs
                    addLog('SQL Gen Prompt', 'info', result.debug.prompt || 'N/A');
                    addLog('SQL Gen Raw Response', 'info', result.debug.response || 'N/A');

                    // Step 2: Answer Generation Logs (if available)
                    if (result.debug.answerGen) {
                        addLog('Ans Gen Prompt', 'info', result.debug.answerGen.prompt || 'N/A');
                        addLog('Ans Gen Raw Response', 'info', result.debug.answerGen.response || 'N/A');
                    }
                }

                const data = result.data;
                let aiMsg: Message = {
                    role: 'ai',
                    content: result.message || '为您查询到以下结果：',
                    type: 'text',
                    sql: result.sql
                };

                if (Array.isArray(data) && data.length > 0) {
                    // 如果返回的是数组，且包含数值字段，尝试生成图表
                    const firstItem = data[0];
                    // 尝试寻找数值类型的字段（包括字符串形式的数字，如 "123.45"）
                    const numFields = Object.keys(firstItem).filter(key => {
                        const val = firstItem[key];
                        if (typeof val === 'number') return true;
                        if (typeof val === 'string') {
                            const sanitized = val.replace(/,/g, '');
                            if (!isNaN(parseFloat(sanitized)) && isFinite(Number(sanitized))) {
                                if (key.toLowerCase().includes('id') || key.includes('号') || key.includes('日期')) return false;
                                return true;
                            }
                        }
                        return false;
                    });

                    result.success && addLog('Chart Logic Analysis', 'info', `Numeric Fields: ${numFields.join(', ') || 'None'}\nSample Data: ${JSON.stringify(firstItem)}`);

                    if (numFields.length > 0 && data.length <= 10) {
                        // 简单启发式：数据量不大且有数字字段，显示图表
                        aiMsg = {
                            role: 'ai',
                            content: result.message || `为您整理了相关统计数据（共 ${data.length} 条）：`,
                            type: 'chart',
                            data: {
                                chartType: 'bar',
                                labels: data.map(item => item[Object.keys(item)[0]] || '未命名'),
                                values: data.map(item => {
                                    const v = item[numFields[0]];
                                    if (typeof v === 'number') return v;
                                    return parseFloat(String(v).replace(/,/g, '')) || 0;
                                })
                            }
                        };
                    } else {
                        // 否则显示表格
                        aiMsg = {
                            role: 'ai',
                            content: result.message || `查询到 ${data.length} 条符合条件的订单记录：`,
                            type: 'table',
                            data: data.map((item: any) => ({
                                id: item.订单号 || 'N/A',
                                customer: item.客户名 || item.销售员 || '佚名',
                                amount: item.未税小计 !== undefined ? `￥${item.未税小计.toLocaleString()}` : 'N/A',
                                ...item
                            }))
                        };
                    }
                } else if (Array.isArray(data) && data.length === 0) {
                    // 即使没有数据，也优先显示 AI 的回答（可能解释了为什么没数据）
                    aiMsg.content = result.message || '抱歉，没有找到符合条件的数据。';
                }

                setMessages(prev => [...prev, aiMsg]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', content: `查询失败: ${result.message}` }]);
            }
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
            addLog('Request Failed', 'error', `Error: ${errorMessage}\nPlease check your network connection or backend server status.`);
            setMessages(prev => [...prev, { role: 'ai', content: '连接服务器失败，请检查网络后再试。' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-row w-full h-full bg-white/40 overflow-hidden relative">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'ai' ? 'bg-[#2c2c2c] text-white' : 'bg-white text-slate-600 border border-white/40'
                                }`}>
                                {msg.role === 'ai' ? <Sparkles className="w-5 h-5" /> : <Send className="w-4 h-4 rotate-[-45deg]" />}
                            </div>
                            <div className={`flex-1 space-y-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`inline-block p-5 rounded-3xl border shadow-sm max-w-2xl text-left ${msg.role === 'ai'
                                    ? 'bg-white/80 border-white/40 text-slate-700'
                                    : 'bg-[#2c2c2c] border-gray-800 text-white'
                                    }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                    {msg.type === 'table' && (
                                        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-bold text-slate-500">订单号</th>
                                                        <th className="px-3 py-2 text-left font-bold text-slate-500">客户</th>
                                                        <th className="px-3 py-2 text-right font-bold text-slate-500">金额</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {msg.data.map((row: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-2 font-mono text-blue-600">{row.id}</td>
                                                            <td className="px-3 py-2 text-slate-600">{row.customer}</td>
                                                            <td className="px-3 py-2 text-right font-bold text-slate-900">{row.amount}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {msg.type === 'chart' && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-end gap-2 h-40">
                                            {msg.data.values.map((val: number, idx: number) => {
                                                const max = Math.max(...msg.data.values) || 1;
                                                const heightPx = (val / max) * 120;

                                                // 预定义一组多彩渐变
                                                const gradients = [
                                                    'from-blue-500 to-indigo-600',
                                                    'from-emerald-400 to-teal-600',
                                                    'from-violet-500 to-purple-600',
                                                    'from-amber-400 to-orange-600',
                                                    'from-rose-400 to-pink-600',
                                                    'from-cyan-400 to-blue-600',
                                                ];
                                                const gradientClass = gradients[idx % gradients.length];

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                                        <div className="relative w-full flex items-end justify-center">
                                                            <div
                                                                className={`w-[80%] bg-gradient-to-t ${gradientClass} rounded-t-lg shadow-md transition-all duration-500 ease-out group-hover:scale-y-105 origin-bottom relative overflow-hidden`}
                                                                style={{ height: `${heightPx}px` }}
                                                            >
                                                                {/* Glass shine effect */}
                                                                <div className="absolute top-0 left-0 w-full h-[30%] bg-white/20" />
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 font-bold truncate w-full text-center group-hover:text-slate-800 transition-colors">{msg.data.labels[idx]}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {msg.sql && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-400">
                                            <div className="flex items-center gap-1 mb-1 text-slate-300 font-bold uppercase tracking-wider">
                                                <span>SQL Debug</span>
                                            </div>
                                            <code className="block bg-slate-50 p-2 rounded border border-slate-100 break-all">
                                                {msg.sql}
                                            </code>
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'ai' && i === 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {QUICK_ACTIONS.map((action, idx) => (
                                            <button
                                                key={idx}
                                                className="px-4 py-2 bg-white/40 hover:bg-[#2c2c2c] hover:text-white border border-white/60 rounded-full text-xs text-slate-500 transition-all active:scale-95"
                                                onClick={() => setInput(action)}
                                            >
                                                {action}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-2xl bg-[#2c2c2c]/20 flex items-center justify-center text-white shrink-0">
                                <Sparkles className="w-5 h-5 opacity-40" />
                            </div>
                            <div className="bg-white/40 px-5 py-3 rounded-2xl border border-white/40 text-slate-400 text-xs">
                                AI 正在思考中...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white/40 border-t border-white/40 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="输入您的查询需求，例如“分析上个月的订单分布”..."
                            className="w-full bg-white/80 border border-white hover:border-slate-300 rounded-3xl px-6 py-4 pr-16 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-[#2c2c2c] transition-all shadow-xl shadow-gray-200/20 text-slate-800 placeholder:text-slate-400"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[#2c2c2c] text-white rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg group-focus-within:scale-110"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Model Selector */}
                    <div className="flex justify-center gap-4 mt-4">
                        <button
                            onClick={() => setSelectedModel('gemini')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedModel === 'gemini'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-white/40 text-slate-500 border border-transparent hover:bg-white/60'
                                }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Gemini 2.0 Flash
                        </button>
                        <button
                            onClick={() => setSelectedModel('deepseek')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedModel === 'deepseek'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-white/40 text-slate-500 border border-transparent hover:bg-white/60'
                                }`}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            DeepSeek R1
                        </button>
                        <div className="w-px h-4 bg-slate-300 mx-2" />
                        <button
                            onClick={() => setIsLogOpen(!isLogOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isLogOpen
                                ? 'bg-slate-800 text-white border border-slate-700'
                                : 'bg-white/40 text-slate-500 border border-transparent hover:bg-white/60'
                                }`}
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            Log Panel
                        </button>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-8 text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-default transition-colors"><TableIcon className="w-3.5 h-3.5" /> Data Table</div>
                        <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-default transition-colors"><PieChart className="w-3.5 h-3.5" /> Analytics</div>
                        <div className="flex items-center gap-1.5 hover:text-slate-600 cursor-default transition-colors"><History className="w-3.5 h-3.5" /> Timeframe</div>
                    </div>
                </div>
            </div>


            {/* Log Panel - Slide over */}
            <div
                className={`flex flex-col border-l border-white/20 bg-[#1e1e1e] transition-all duration-300 ease-in-out shadow-2xl z-20 ${isLogOpen ? 'w-[400px] translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0 overflow-hidden'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1e1e1e]">
                    <div className="flex items-center gap-2 text-white/90">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold tracking-wider uppercase">System Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearLogs}
                            className="p-1 text-white/50 hover:text-white transition-colors"
                            title="Clear Logs"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsLogOpen(false)}
                            className="p-1 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Log Content Area - Placeholder for now */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] dark-scrollbar">
                    {logs.length === 0 ? (
                        <div className="text-white/20 italic py-10 text-center flex flex-col items-center gap-2">
                            <Activity className="w-8 h-8 opacity-20" />
                            <span>系统监控已启动<br />等待数据流...</span>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={`p-2 rounded border bg-black/20 ${log.type === 'error' ? 'border-red-500/30 text-red-200' :
                                log.type === 'warning' ? 'border-amber-500/30 text-amber-200' :
                                    log.type === 'success' ? 'border-emerald-500/30 text-emerald-200' :
                                        'border-blue-500/30 text-blue-200'
                                } transition-all hover:bg-black/40`}>
                                <div className="flex items-center justify-between mb-1 opacity-70">
                                    <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-sm ${log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                        log.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                            log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {log.type}
                                    </span>
                                    <span className="font-sans">{log.time}</span>
                                </div>
                                <div className="leading-relaxed break-words text-white/90">
                                    {log.content}
                                </div>
                                {log.detail && (
                                    <div className="mt-2 pt-2 border-t border-white/10 text-white/50 break-all whitespace-pre-wrap bg-black/20 p-1.5 rounded">
                                        {log.detail}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div >
    );
};

export default AtOrderChat;
