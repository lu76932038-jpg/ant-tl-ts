import React, { useState } from 'react';
import {
    Search, BookOpen, ChevronRight, ChevronDown,
    FileText, HelpCircle, Lightbulb, AlertTriangle,
    ArrowUpRight, MousePointer2, Settings, Users,
    Info
} from 'lucide-react';

interface DocSection {
    id: string;
    title: string;
    icon: any;
    subsections: {
        id: string;
        title: string;
        items: {
            id: string;
            title: string;
            content: string;
            image?: string;
            fields?: { name: string; desc: string; tips?: string }[];
        }[];
    }[];
}

const docsData: DocSection[] = [
    {
        id: 'getting-started',
        title: '基础入门',
        icon: BookOpen,
        subsections: [
            {
                id: 'account',
                title: '账号与权限',
                items: [
                    {
                        id: 'login-guide',
                        title: '如何登录',
                        content: '在首页输入您的用户名和密码。如果您忘记密码，请点击“忘记密码”并通过邮箱重置。'
                    },
                    {
                        id: 'permissions',
                        title: '权限分级',
                        content: '管理员（Admin）拥有所有操作权限；普通用户（User）仅能访问被分配的功能模块。'
                    }
                ]
            }
        ]
    },
    {
        id: 'inquiry-help',
        title: '询价解析指引',
        icon: FileText,
        subsections: [
            {
                id: 'inquiry-list',
                title: '列表页操作',
                items: [
                    {
                        id: 'list-fields',
                        title: '列表字段含义',
                        content: '询价解析列表展示了所有任务的生命周期状态。通过该列表您可以快速定位并管理您的询价历史。',
                        fields: [
                            { name: '任务 ID', desc: '系统自动生成的唯一流水号，前 8 位用于快速搜索。' },
                            { name: '文件名', desc: '您上传的最原始文件的名称，点击可快速跳转详情。' },
                            { name: '状态', desc: '包含：解析成功（绿色）、正在处理（蓝色）、已终止（灰色）、解析失败（红色）。' },
                            { name: '耗时', desc: '从上传成功到 AI 给出结果的总时间，单位为秒。' }
                        ]
                    }
                ]
            },
            {
                id: 'inquiry-detail',
                title: '详情与工作流',
                items: [
                    {
                        id: 'workflow-guide',
                        title: 'AI 工作流解析',
                        content: '点击详情进入全透明的 AI 处理过程展示区。在这里您可以监控 AI 的每一个决策步骤。',
                        image: '/inquiry_detail_workflow_ui.png',
                        fields: [
                            { name: 'Prompt (模型输入)', desc: '系统发送给 DeepSeek 的精确指令，包含背景上下文和约束条件。', tips: '开发者常用此工具排查解析偏差。' },
                            { name: 'Response (模型输出)', desc: 'AI 返回的 JSON 格式原始数据，是生成 Excel 的直接依据。' },
                            { name: '备注评价', desc: '用户手动输入的纠错信息或给 AI 的反馈，会同步给模型进行后续优化。' }
                        ]
                    }
                ]
            }
        ]
    }
];

const HelpDocs: React.FC = () => {
    const [activeSection, setActiveSection] = useState(docsData[0].id);
    const [activeSub, setActiveSub] = useState(docsData[0].subsections[0].id);
    const [expandedSections, setExpandedSections] = useState<string[]>([docsData[0].id]);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const currentDoc = docsData.find(s => s.id === activeSection)
        ?.subsections.find(sub => sub.id === activeSub);

    return (
        <div className="flex-1 flex overflow-hidden bg-[#f8fafc]">
            {/* 左侧三级导航栏 */}
            <div className="w-80 flex-none border-r border-slate-100 bg-white flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        <HelpCircle size={24} className="text-blue-500" />
                        帮助与操作指引
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索操作教程..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all font-bold"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                    {docsData.map(section => (
                        <div key={section.id} className="space-y-1">
                            {/* 一级菜单 */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all
                                    ${activeSection === section.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <section.icon size={18} strokeWidth={activeSection === section.id ? 3 : 2} />
                                    <span className="text-sm font-black">{section.title}</span>
                                </div>
                                {expandedSections.includes(section.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {/* 二级菜单 */}
                            {expandedSections.includes(section.id) && (
                                <div className="ml-5 border-l-2 border-slate-50 pl-3 space-y-1 py-1">
                                    {section.subsections.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                setActiveSection(section.id);
                                                setActiveSub(sub.id);
                                            }}
                                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all
                                                ${activeSub === sub.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}
                                            `}
                                        >
                                            {sub.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 中间内容区 */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto p-12 py-16">
                    {currentDoc ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                                    <Info size={14} />
                                    {docsData.find(s => s.id === activeSection)?.title} / {currentDoc.title}
                                </div>
                                <h1 className="text-4xl font-black text-slate-800">{currentDoc.title}</h1>
                                <p className="text-slate-400 font-bold text-lg">详细的步骤指引与常见问题解答</p>
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            {/* 三级内容 (具体项) */}
                            <div className="space-y-16">
                                {currentDoc.items.map(item => (
                                    <div key={item.id} className="scroll-mt-24 space-y-6">
                                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm">
                                                {item.title.charAt(0)}
                                            </div>
                                            {item.title}
                                        </h3>
                                        <div className="prose prose-slate max-w-none">
                                            <p className="text-slate-600 leading-relaxed text-lg font-medium">
                                                {item.content}
                                            </p>
                                        </div>

                                        {/* 字段解释表格 */}
                                        {item.fields && (
                                            <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-100/50 border-b border-slate-100">
                                                            <th className="px-6 py-4 text-left font-black text-slate-800 w-48">字段/操作名称</th>
                                                            <th className="px-6 py-4 text-left font-black text-slate-600">含义及使用说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {item.fields.map((f, i) => (
                                                            <tr key={i} className="hover:bg-white transition-colors">
                                                                <td className="px-6 py-4 font-black text-blue-600">{f.name}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-slate-600 font-bold">{f.desc}</div>
                                                                    {f.tips && (
                                                                        <div className="mt-1 text-[10px] text-amber-500 font-black uppercase tracking-widest">💡 小贴士: {f.tips}</div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* 操作截图 */}
                                        {item.image && (
                                            <div className="group relative">
                                                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-90 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                                                <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-slate-50 shadow-2xl shadow-slate-200/50">
                                                    <img src={item.image} alt={item.title} className="w-full h-auto" />
                                                    <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-between">
                                                        <span>界面操作预览图 (Screen Capture Preview)</span>
                                                        <div className="flex gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-white/40"></div>
                                                            <div className="w-2 h-2 rounded-full bg-white/40"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 示例提示框 */}
                                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex gap-4">
                                            <Lightbulb className="text-blue-500 flex-none" size={24} />
                                            <div>
                                                <h4 className="font-black text-blue-900 mb-1 leading-none">操作技巧</h4>
                                                <p className="text-sm text-blue-700 font-bold">在该步骤中，您可以尝试使用快捷键 Ctrl+V 直接从剪贴板上传截图，系统会自动识别其中的表格内容。</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <BookOpen size={64} className="mb-4 opacity-20" />
                            <p className="font-black">请在左侧选择一个章节进行阅读</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 右侧小目录 (辅助导航) */}
            <div className="w-64 flex-none border-l border-slate-100 bg-slate-50/30 p-8 hidden xl:block">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">本页目录</h4>
                <div className="space-y-3">
                    {currentDoc?.items.map(item => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="block text-xs font-bold text-slate-500 hover:text-blue-500 transition-all truncate"
                        >
                            {item.title}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HelpDocs;
