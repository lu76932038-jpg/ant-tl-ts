import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, PieChart, Table as TableIcon, History, Bot, Terminal, X, ChevronRight, Activity, Trash2, MessageSquarePlus, MessageSquare, Edit2 } from 'lucide-react';

interface Message {
    role: 'user' | 'ai';
    content: string;
    type?: 'text' | 'table' | 'chart';
    data?: any;
    sql?: string;
    debug?: any;
    id?: number; // logId for feedback
    feedback?: 'like' | 'dislike';
}

interface Session {
    id: string;
    title: string;
    updated_at: string;
}

const AtOrderChat: React.FC = () => {
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<'deepseek'>('deepseek');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            content: '你好！我是您的 A&T 订单智能助手。您可以向我询问订单状态或进行数据统计分析。',
            type: 'text'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    // Session State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(false);

    // Logs State
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [logs, setLogs] = useState<{ id: string; time: string; type: 'info' | 'success' | 'warning' | 'error'; content: string; detail?: string }[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // --- Session Logic ---
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSessions(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const createNewSession = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: '新会话' })
            });
            const result = await res.json();
            if (result.success) {
                const newSession = result.data;
                // Ensure updated_at is present, fallback to now if missing (should be fixed in backend)
                if (!newSession.updated_at) newSession.updated_at = new Date().toISOString();

                setSessions(prev => [newSession, ...prev]); // Add to top
                setCurrentSessionId(newSession.id);
                setMessages([{
                    role: 'ai',
                    content: '已创建新会话。请问有什么可以帮您？',
                    type: 'text'
                }]);
                return newSession.id;
            }
        } catch (e) {
            console.error("Failed to create session", e);
        }
        return null;
    };

    const loadSession = async (sessionId: string) => {
        if (currentSessionId === sessionId) return;

        setIsSessionLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/sessions/${sessionId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                // Tranform backend messages to UI messages
                const history: Message[] = result.data.map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'ai',
                    content: msg.content,
                    type: msg.sql ? 'table' : 'text', // Simple heuristic, refinements needed if we persisted type
                    // Ideally backend stores 'type' and 'data', but for now we reconstruct or just show text
                    // Check if content looks like JSON data? 
                    // For history, we might lose the 'data' object if we only stored 'final_answer'. 
                    // Wait, AiChatLog stores 'final_answer'. It doesn't store the raw JSON data result.
                    // So history playback will be TEXT ONLY unless we parsed it.
                    // Actually, for now, let's just show text. 
                    sql: msg.sql,
                    debug: msg.debug,
                    id: msg.id,
                    feedback: msg.feedback_score === 1 ? 'like' : msg.feedback_score === -1 ? 'dislike' : undefined
                }));

                if (history.length === 0) {
                    setMessages([{
                        role: 'ai',
                        content: '这是一个新会话。',
                        type: 'text'
                    }]);
                } else {
                    setMessages(history);
                }
            }
        } catch (e) {
            console.error("Failed to load session", e);
        } finally {
            setIsSessionLoading(false);
        }
    };

    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const startEditing = (e: React.MouseEvent, session: Session) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditingTitle(session.title);
    };

    const saveSessionTitle = async (sessionId: string) => {
        if (!editingTitle.trim() || editingTitle === sessions.find(s => s.id === sessionId)?.title) {
            setEditingSessionId(null);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: editingTitle })
            });
            const result = await res.json();
            if (result.success) {
                setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editingTitle } : s));
            }
        } catch (e) {
            console.error("Failed to update session title", e);
        } finally {
            setEditingSessionId(null);
        }
    };

    const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm("确定删除此会话吗？")) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([{ role: 'ai', content: '会话已删除。', type: 'text' }]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToLogsBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const addLog = (content: string, type: 'info' | 'success' | 'warning' | 'error', detail?: string) => {
        setLogs(prev => [...prev, {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            time: new Date().toLocaleTimeString(),
            type,
            content,
            detail
        }]);
    };

    const clearLogs = () => {
        setLogs([]);
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

    const handleFeedback = async (msgIndex: number, type: 'like' | 'dislike') => {
        const msg = messages[msgIndex];
        if (!msg.id) return;

        // Optimistic UI update
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedback: type } : m));

        try {
            const token = localStorage.getItem('token');
            // Assuming we have a feedback endpoint. 
            // Phase 2 Plan says: POST /api/rag/logs/:id/feedback
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/logs/${msg.id}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    score: type === 'like' ? 1 : -1
                })
            });
            addLog(`Feedback Submitted`, 'success', `LogID: ${msg.id}, Type: ${type}`);
        } catch (error) {
            console.error('Feedback failed:', error);
            // Revert on failure? Or just log error.
            addLog(`Feedback Failed`, 'error', String(error));
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        // Auto-create session if none selected
        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
            activeSessionId = await createNewSession();
        }

        if (!activeSessionId) {
            addLog('Session Creation Failed', 'error', 'Could not create a new session. Please try again.');
            setMessages(prev => [...prev, { role: 'ai', content: '创建会话失败，请刷新页面重试。' }]);
            return;
        }

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput('');
        setIsTyping(true);
        addLog(`Started request: ${currentInput}`, 'info', `Model: ${selectedModel}\nTimestamp: ${new Date().toISOString()}`);

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/orders/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: currentInput,
                    model: selectedModel,
                    sessionId: activeSessionId // Pass Session ID
                })
            });

            // Refresh session list to update timestamp/sort
            fetchSessions();

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
                    sql: result.sql,
                    id: result.logId
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
                            data: data
                        };
                    }
                } else if (Array.isArray(data) && data.length === 0) {
                    // 即使没有数据，也优先显示 AI 的回答（可能解释了为什么没数据）
                    aiMsg.content = result.message || '抱歉，没有找到符合条件的数据。';
                }

                setMessages(prev => [...prev, aiMsg]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', content: `查询失败: ${result.message || JSON.stringify(result)}` }]);
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

            {/* Session Sidebar */}
            <div className="w-64 bg-slate-50/50 border-r border-white/20 flex flex-col backdrop-blur-sm">
                <div className="p-4">
                    <button
                        onClick={() => createNewSession()}
                        className="w-full flex items-center justify-center gap-2 bg-[#2c2c2c] text-white py-3 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        <span className="text-xs font-bold">New Chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => loadSession(session.id)}
                            className={`group relative p-3 rounded-lg cursor-pointer transition-all border ${currentSessionId === session.id
                                ? 'bg-white border-white shadow-sm'
                                : 'hover:bg-white/50 border-transparent hover:border-white/30'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <MessageSquare className={`w-4 h-4 mt-1 ${currentSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <div className="flex-1 min-w-0">
                                    {editingSessionId === session.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onBlur={() => saveSessionTitle(session.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveSessionTitle(session.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-white border border-indigo-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <div
                                            className={`text-xs font-medium truncate ${currentSessionId === session.id ? 'text-slate-800' : 'text-slate-600'}`}
                                            onDoubleClick={(e) => startEditing(e, session)}
                                            title="Double click to rename"
                                        >
                                            {session.title || 'Untitled Session'}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        {new Date(session.updated_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => startEditing(e, session)}
                                        className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 rounded transition-all"
                                        title="Rename"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => deleteSession(e, session.id)}
                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out relative">
                {/* Floating Log Toggle */}
                <button
                    onClick={() => setIsLogOpen(!isLogOpen)}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-800 transition-all"
                    title="Toggle Logs"
                >
                    <Activity className="w-5 h-5" />
                </button>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {isSessionLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            <div className="animate-spin mr-2">
                                <Activity className="w-4 h-4" />
                            </div>
                            Loading history...
                        </div>
                    ) : messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
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

                                    {/* Feedback Buttons */}
                                    {msg.role === 'ai' && msg.id && (
                                        <div className="mt-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleFeedback(i, 'like')}
                                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'like' ? 'text-green-500' : 'text-slate-400'}`}
                                                title="有用"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(i, 'dislike')}
                                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'dislike' ? 'text-red-500' : 'text-slate-400'}`}
                                                title="无用/错误"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" /></svg>
                                            </button>
                                        </div>
                                    )}

                                    {msg.type === 'table' && msg.data && (
                                        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        {msg.data.length > 0 && Object.keys(msg.data[0]).map((key) => (
                                                            <th key={key} className="px-3 py-2 text-left font-bold text-slate-500 capitalize">
                                                                {key}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {msg.data.map((row: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            {Object.values(row).map((val: any, vIdx) => (
                                                                <td key={vIdx} className="px-3 py-2 text-slate-600">
                                                                    {typeof val === 'number' && (String(val).includes('.') || val > 1000)
                                                                        ? val.toLocaleString()
                                                                        : val}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {msg.type === 'chart' && msg.data && (
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
                                                                className={`w-[80%] max-w-[48px] bg-gradient-to-t ${gradientClass} rounded-t-lg shadow-md transition-all duration-500 ease-out group-hover:scale-y-105 origin-bottom relative overflow-hidden`}
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

                    {/* Model Selector Removed - Defaulting to DeepSeek */}
                    <div className="flex justify-center gap-4 mt-4 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                            <Bot className="w-3.5 h-3.5" />
                            DeepSeek 智能助手
                        </div>
                    </div>
                    <div className="hidden">
                        {/* Legacy Gemini Selector Hidden */}
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
