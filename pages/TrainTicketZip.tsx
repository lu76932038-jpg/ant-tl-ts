
import React, { useState } from 'react';
import { Upload, FileText, Download, Trash2, LayoutGrid, CheckCircle, AlertCircle, Loader2, FolderArchive } from 'lucide-react'; import JSZip from 'jszip';
import { ExtractedTicket, AppStatus } from '../types';
import { extractPdfsFromZips, mergeTicketsToA4, renderPdfToImage } from '../services/pdfServices';

const App: React.FC = () => {
    const [tickets, setTickets] = useState<ExtractedTicket[]>([]);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setStatus(AppStatus.PROCESSING);
        setError(null);

        try {
            const fileList = Array.from(files) as File[];
            const zipFiles = fileList.filter(f => f.name.toLowerCase().endsWith('.zip'));

            if (zipFiles.length === 0) {
                throw new Error("请选择有效的 .zip 文件");
            }

            const extracted = await extractPdfsFromZips(zipFiles);
            if (extracted.length === 0) {
                throw new Error("所选 ZIP 文件中未找到 PDF 发票");
            }

            setTickets(prev => [...prev, ...extracted]);

            // Generate previews in background
            extracted.forEach(t => {
                renderPdfToImage(t.data).then(url => {
                    if (url) {
                        setPreviews(prev => ({ ...prev, [t.id]: url }));
                    }
                });
            });

            setStatus(AppStatus.READY);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "文件解析出错");
            setStatus(AppStatus.ERROR);
        } finally {
            event.target.value = '';
        }
    };

    const removeTicket = (id: string) => {
        setTickets(prev => prev.filter(t => t.id !== id));
        setPreviews(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const clearAll = () => {
        setTickets([]);
        setPreviews({});
        setStatus(AppStatus.IDLE);
        setError(null);
    };

    const downloadSingle = (ticket: ExtractedTicket) => {
        try {
            const blob = new Blob([ticket.data as any], { type: 'application/pdf' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = ticket.name;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            setError(`文件下载失败: ${ticket.name}`);
        }
    };

    /**
     * Packages all individual PDFs into one ZIP for one-click downloading.
     */
    const downloadAllIndividual = async () => {
        if (tickets.length === 0) return;
        setStatus(AppStatus.PROCESSING);
        setError(null);

        try {
            const zip = new JSZip();
            const folder = zip.folder("extracted_pdfs");

            tickets.forEach((ticket, index) => {
                // Ensure unique names if multiple tickets have same filename
                const fileName = tickets.filter(t => t.name === ticket.name).length > 1
                    ? `${index + 1}_${ticket.name}`
                    : ticket.name;
                folder?.file(fileName, ticket.data);
            });

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `全部原始发票_${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            setStatus(AppStatus.READY);
        } catch (err: any) {
            console.error(err);
            setError(`打包下载失败: ${err.message || '未知原因'}`);
            setStatus(AppStatus.ERROR);
        }
    };

    const downloadMerged = async () => {
        if (tickets.length === 0) return;
        setStatus(AppStatus.PROCESSING);
        setError(null);

        try {
            const mergedData = await mergeTicketsToA4(tickets);
            const blob = new Blob([mergedData as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `合并发票A4_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            setStatus(AppStatus.READY);
        } catch (err: any) {
            console.error(err);
            setError(`合并失败: ${err.message || '未知原因'}`);
            setStatus(AppStatus.ERROR);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
            {/* Header */}
            <header className="w-full max-w-5xl mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" size={32} />
                        火车票发票提取助手
                    </h1>
                    <p className="text-slate-500 mt-2">支持批量提取 ZIP 中的 PDF，并提供单张下载、批量原始下载及 A4 合并排版。</p>
                </div>

                <div className="flex gap-2">
                    {tickets.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                            清空
                        </button>
                    )}
                    <label className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer shadow-lg shadow-blue-200 transition-all font-medium">
                        <Upload size={18} />
                        上传 ZIP 文件
                        <input type="file" multiple accept=".zip" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[60vh]">

                {/* Error Handling */}
                {error && (
                    <div className="m-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
                        <AlertCircle size={20} className="shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                    </div>
                )}

                {/* Empty State */}
                {tickets.length === 0 && status !== AppStatus.PROCESSING && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Upload size={48} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-600">暂无上传文件</h3>
                        <p className="max-w-xs mt-2">请上传包含 .pdf 发票的 ZIP 文件，程序将自动为您提取。</p>
                    </div>
                )}

                {/* Processing State */}
                {status === AppStatus.PROCESSING && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="relative">
                            <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                        </div>
                        <p className="text-slate-600 font-medium animate-pulse">正在处理文件中，请稍候...</p>
                    </div>
                )}

                {/* Ticket List */}
                {tickets.length > 0 && status !== AppStatus.PROCESSING && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tickets.map((ticket) => (
                                    <div key={ticket.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg hover:shadow-slate-100 transition-all">
                                        <div className="aspect-[1.58/1] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                                            {previews[ticket.id] ? (
                                                <img src={previews[ticket.id]} alt="preview" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText size={32} className="text-slate-300" />
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">PDF Loading</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-700 truncate flex-1" title={ticket.name}>
                                                    {ticket.name}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate mt-1">
                                                来源: {ticket.zipName}
                                            </p>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                                <button
                                                    onClick={() => downloadSingle(ticket)}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                                >
                                                    <Download size={14} /> 下载单张
                                                </button>
                                                <button
                                                    onClick={() => removeTicket(ticket.id)}
                                                    className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                                                >
                                                    <Trash2 size={14} /> 移除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <footer className="bg-white border-t border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-2 text-slate-600 font-semibold">
                                <CheckCircle className="text-green-500" size={20} />
                                <span>已提取 {tickets.length} 份 PDF 发票</span>
                            </div>
                            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                <button
                                    onClick={downloadAllIndividual}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 transition-all font-bold"
                                    title="将所有提取出的 PDF 打包成一个 ZIP 下载"
                                >
                                    <FolderArchive size={20} />
                                    一键下载全部(ZIP)
                                </button>
                                <button
                                    onClick={downloadMerged}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 transition-all font-bold"
                                    title="将所有发票合并到一个 A4 页面中，每页显示 10 张"
                                >
                                    <LayoutGrid size={20} />
                                    合并为 A4 下载
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </main>

            <div className="mt-8 text-slate-400 text-xs text-center max-w-2xl px-4">
                提示：合并功能会自动将发票按 2x5 网格排列，适合 A4 打印后进行裁剪。如果原始 PDF 受到强加密保护，合并后可能会出现空白，请尝试先将原始 PDF 虚拟打印一份后再进行上传。
            </div>
        </div>
    );
};

export default App;
