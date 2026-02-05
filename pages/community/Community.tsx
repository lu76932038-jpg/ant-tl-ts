import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageCircle, Plus, Users, Search, Loader2, X, Image as ImageIcon, UploadCloud
} from 'lucide-react';
import { api } from '../../services/api';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';

interface QuestionSummary {
    id: number;
    title: string;
    content: string;
    author_name: string;
    author_avatar?: string;
    tags: string[];
    view_count: number;
    vote_count: number;
    answer_count: number;
    last_answer_at?: string;
    created_at: string;
}

const Community: React.FC = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<QuestionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Form State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newTags, setNewTags] = useState('');

    // Search State
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    // Quill Ref
    const quillRef = useRef<ReactQuill>(null);

    const fetchQuestions = async (keyword?: string) => {
        try {
            const res = await api.get('/community/questions', {
                params: { keyword }
            });
            setQuestions(res as any);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchKeyword !== undefined) {
                setIsSearching(true);
                fetchQuestions(searchKeyword);
            }
        }, 500); // 防抖 500ms

        return () => clearTimeout(timer);
    }, [searchKeyword]);

    const handleCreateQuestion = async () => {
        if (!newTitle || !newContent) return;
        setSubmitting(true);
        try {
            const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
            const res = await api.post('/community/questions', {
                title: newTitle,
                content: newContent,
                tags: tagsArray
            });
            setIsCreateModalOpen(false);
            setNewTitle('');
            setNewContent('');
            setNewTags('');
            fetchQuestions(); // Refresh list
            navigate(`/community/${(res as any).id}`); // Go to new question
        } catch (error) {
            console.error(error);
            alert('发布失败');
        } finally {
            setSubmitting(false);
        }
    };

    const customImageHandler = () => {
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

                    // Access internal editor
                    const editor = (quillRef.current as any).getEditor();
                    const range = editor.getSelection();
                    editor.insertEmbed(range ? range.index : 0, 'image', url);
                } catch (error) {
                    console.error('Upload failed', error);
                    alert('图片上传失败');
                }
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: customImageHandler
            }
        }
    }), []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            {/* Header Area */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">殸木社区</h1>
                        <p className="text-sm text-gray-500">连接开发者与供应链专家</p>
                    </div>
                    <div className="flex items-center gap-6 flex-1 max-w-2xl mx-12">
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-violet-500 animate-pulse' : 'text-gray-400 group-focus-within:text-violet-500'}`} size={18} />
                            <input
                                type="text"
                                placeholder="搜索标题或回答内容..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all font-medium text-sm"
                            />
                            {searchKeyword && (
                                <button
                                    onClick={() => setSearchKeyword('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center gap-2 shrink-0"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span>提问</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-violet-600" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {questions.map(q => (
                            <div
                                key={q.id}
                                onClick={() => navigate(`/community/${q.id}`)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Vote Stats */}
                                    <div className="flex flex-col items-center gap-1 min-w-[60px] pt-1">
                                        <div className="text-lg font-bold text-gray-700 group-hover:text-violet-600 transition-colors">{q.vote_count}</div>
                                        <div className="text-[10px] uppercase text-gray-400 font-bold">投票</div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors flex items-center gap-3">
                                            <span className="line-clamp-1">{q.title}</span>
                                            {(() => {
                                                const lastViewed = localStorage.getItem(`q_view_${q.id}`);
                                                const lastAnswerTime = q.last_answer_at ? new Date(q.last_answer_at).getTime() : 0;
                                                const createdTime = new Date(q.created_at).getTime();
                                                const viewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;

                                                // 只有当有新回答（晚于创建时间）且 晚于 上次查看时间时才显示
                                                if (lastAnswerTime > createdTime && lastAnswerTime > viewedTime) {
                                                    return (
                                                        <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-wider rounded-md animate-pulse">
                                                            新回答
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.content.substring(0, 150) + '...' }} />

                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {q.tags && q.tags.map((tag, i) => (
                                                    <span key={i} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <MessageCircle size={14} />
                                                    <span>{q.answer_count} 回答</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span>{q.author_name}</span>
                                                    <span>•</span>
                                                    <span>{new Date(q.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">暂时没有问题</h3>
                                <p className="text-gray-500 mb-6">成为第一个提问的人吧！</p>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="text-violet-600 font-bold hover:underline"
                                >
                                    立即提问
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                            <h2 className="text-xl font-black text-gray-900">提问</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">标题</label>
                                <input
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                                    placeholder="一句话描述你的问题..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">标签 (用逗号分隔)</label>
                                <input
                                    value={newTags}
                                    onChange={e => setNewTags(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                                    placeholder="例如: React, CSS, Backend"
                                />
                            </div>
                            <div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-gray-700">详尽描述 (所见即所得编辑器)</label>
                                    </div>

                                    <div className="h-[400px] mb-12">
                                        <ReactQuill
                                            ref={quillRef}
                                            theme="snow"
                                            value={newContent}
                                            onChange={setNewContent}
                                            className="h-full rounded-xl bg-white"
                                            modules={modules}
                                            formats={[
                                                'header',
                                                'bold', 'italic', 'underline', 'strike', 'blockquote',
                                                'list', 'bullet', 'indent',
                                                'link', 'image'
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateQuestion}
                                disabled={submitting || !newTitle || !newContent}
                                className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all disabled:opacity-50"
                            >
                                {submitting ? '发布中...' : '发布问题'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Community;
