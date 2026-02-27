import React, { useEffect, useState } from 'react';
import { Settings, Save, Database, FileCode, Lightbulb, Check, X } from 'lucide-react';

interface AiPrompt {
    id: number;
    prompt_key: string;
    content: string;
    description: string;
}

interface AiSchemaDoc {
    id: number;
    table_name: string;
    description: string;
    column_info: string;
}

interface AiSuggestion {
    id: number;
    log_id: number;
    score: number;
    issues: string[]; // JSON parsed
    suggestion: string;
    created_at: string;
}

const RagTraining: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'prompts' | 'schema' | 'suggestions'>('prompts');
    const [prompts, setPrompts] = useState<AiPrompt[]>([]);
    const [schemaDocs, setSchemaDocs] = useState<AiSchemaDoc[]>([]);
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
    const [editingSchema, setEditingSchema] = useState<AiSchemaDoc | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [promptsRes, schemaRes, suggestionsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/prompts`, { headers }),
                fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/schema`, { headers }),
                fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/optimization/suggestions`, { headers })
            ]);

            const promptsData = await promptsRes.json();
            const schemaData = await schemaRes.json();
            const suggestionsData = await suggestionsRes.json();

            if (promptsData.success) setPrompts(promptsData.data);
            if (schemaData.success) setSchemaDocs(schemaData.data);
            if (suggestionsData.success) setSuggestions(suggestionsData.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrompt = async () => {
        if (!editingPrompt) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/prompts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editingPrompt)
            });
            const data = await res.json();
            if (data.success) {
                alert('Prompt Saved!');
                fetchData();
                setEditingPrompt(null);
            }
        } catch (error) {
            alert('Failed to save');
        }
    };

    const handleSaveSchema = async () => {
        if (!editingSchema) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rag/schema`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editingSchema)
            });
            const data = await res.json();
            if (data.success) {
                alert('Schema Saved!');
                fetchData();
                setEditingSchema(null);
            }
        } catch (error) {
            alert('Failed to save');
        }
    };

    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="w-6 h-6 text-purple-600" />
                            RAG 训练管理
                        </h1>
                        <p className="text-slate-500 mt-1">微调 System Prompt 和 Schema 描述以优化回答效果</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setActiveTab('prompts')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'prompts' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Prompt 提示词
                        </button>
                        <button
                            onClick={() => setActiveTab('schema')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'schema' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Schema 知识库
                        </button>
                        <button
                            onClick={() => setActiveTab('suggestions')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'suggestions' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-1">
                                <Lightbulb className="w-4 h-4" />
                                优化建议
                            </span>
                        </button>
                    </div>
                </div>

                {activeTab === 'prompts' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <FileCode className="w-5 h-5 text-blue-500" />
                                提示词列表
                            </h2>
                            <div className="space-y-3">
                                {prompts.map(p => (
                                    <div
                                        key={p.id}
                                        className="p-3 border border-slate-100 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                                        onClick={() => setEditingPrompt(p)}
                                    >
                                        <div className="font-medium text-slate-800">{p.prompt_key}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2 mt-1">{p.content}</div>
                                    </div>
                                ))}
                                {prompts.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">暂无提示词</div>
                                )}
                            </div>
                            <button
                                onClick={() => setEditingPrompt({ id: 0, prompt_key: 'NEW_KEY', content: '', description: '' })}
                                className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors"
                            >
                                + 新增提示词
                            </button>
                        </div>

                        {/* Editor */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
                            {editingPrompt ? (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Key (唯一标识)</label>
                                        <input
                                            type="text"
                                            value={editingPrompt.prompt_key}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, prompt_key: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                                        <input
                                            type="text"
                                            value={editingPrompt.description || ''}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">内容 (System Prompt)</label>
                                        <textarea
                                            value={editingPrompt.content}
                                            onChange={e => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                                            className="w-full h-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none bg-slate-50"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setEditingPrompt(null)}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSavePrompt}
                                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-200"
                                        >
                                            <Save className="w-4 h-4" />
                                            保存修改
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <Settings className="w-16 h-16 mb-4 opacity-20" />
                                    <p>在左侧选择或新增提示词进行编辑</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'schema' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <Database className="w-5 h-5 text-emerald-500" />
                                Schema 列表
                            </h2>
                            <div className="space-y-3">
                                {schemaDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="p-3 border border-slate-100 rounded-lg hover:border-emerald-300 cursor-pointer transition-colors"
                                        onClick={() => setEditingSchema(doc)}
                                    >
                                        <div className="font-medium text-slate-800">{doc.table_name}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2 mt-1">{doc.description}</div>
                                    </div>
                                ))}
                                {schemaDocs.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">暂无 Schema 文档</div>
                                )}
                            </div>
                            <button
                                onClick={() => setEditingSchema({ id: 0, table_name: 'NEW_TABLE', description: '', column_info: '' })}
                                className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                            >
                                + 新增 Schema 描述
                            </button>
                        </div>

                        {/* Editor */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
                            {editingSchema ? (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">表名 (Table Name)</label>
                                        <input
                                            type="text"
                                            value={editingSchema.table_name}
                                            onChange={e => setEditingSchema({ ...editingSchema, table_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">描述 (给 AI 看的表用途)</label>
                                        <textarea
                                            value={editingSchema.description || ''}
                                            onChange={e => setEditingSchema({ ...editingSchema, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none h-20 resize-none"
                                        />
                                    </div>
                                    <div className="flex-1 mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">字段信息 (JSON 或文本)</label>
                                        <textarea
                                            value={editingSchema.column_info}
                                            onChange={e => setEditingSchema({ ...editingSchema, column_info: e.target.value })}
                                            className="w-full h-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none bg-slate-50"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setEditingSchema(null)}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveSchema}
                                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200"
                                        >
                                            <Save className="w-4 h-4" />
                                            保存修改
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <Database className="w-16 h-16 mb-4 opacity-20" />
                                    <p>在左侧选择或新增 Schema 进行编辑</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'suggestions' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-semibold text-slate-700 mb-6 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            智能优化建议列表
                        </h2>

                        <div className="grid grid-cols-1 gap-4">
                            {suggestions.map(item => (
                                <div key={item.id} className="border border-slate-100 rounded-lg p-4 hover:border-amber-200 transition-colors bg-amber-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-mono">Log #{item.log_id}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.score > 80 ? 'bg-green-100 text-green-700' : item.score > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                Score: {item.score}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-sm font-medium text-slate-700 mb-1">Detected Issues:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {item.issues && item.issues.map((issue, idx) => (
                                                <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                                                    {issue}
                                                </span>
                                            ))}
                                            {(!item.issues || item.issues.length === 0) && <span className="text-xs text-slate-400 italic">None</span>}
                                        </div>
                                    </div>

                                    <div className="bg-white p-3 rounded border border-slate-200 mb-3">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Suggestion</div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{item.suggestion}</p>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded text-xs hover:bg-slate-50 flex items-center gap-1">
                                            <X className="w-3 h-3" /> 忽略
                                        </button>
                                        <button className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 flex items-center gap-1 shadow-sm shadow-amber-200">
                                            <Check className="w-3 h-3" /> 采纳建议 (跳转编辑)
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {suggestions.length === 0 && (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>暂无优化建议</p>
                                    <p className="text-xs mt-1">当系统检测到低质量回答或收到用户差评时，会自动生成建议。</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default RagTraining;
