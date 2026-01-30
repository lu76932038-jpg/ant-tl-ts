import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import { Upload, FileText, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../../services/api';

interface ImportDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [pasteContent, setPasteContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const parseRawData = (jsonData: any[]) => {
        return jsonData.map((row: any) => ({
            outbound_id: row['出库单号'] || row['outbound_id'] || '',
            product_model: row['产品型号'] || row['product_model'],
            product_name: row['产品名称'] || row['product_name'],
            outbound_date: row['出库日期'] || row['outbound_date'],
            quantity: row['数量'] || row['quantity'],
            customer_name: row['客户名称'] || row['客户名'] || row['客户'] || row['customer_name'],
            unit_price: row['含税单价'] || row['单价'] || row['unit_price'] || row['price'] || 0
        })).filter((item: any) => item.product_model && item.quantity);
    };

    const processFile = async (file: File) => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            let jsonData: any[] = [];

            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                const workbook = read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = utils.sheet_to_json<any>(worksheet);
            } else {
                const workbook = read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = utils.sheet_to_json<any>(worksheet);
            }

            const normalized = parseRawData(jsonData);
            if (normalized.length === 0) {
                setError('未解析到有效数据，请检查文件格式。');
            } else {
                setPreviewData(normalized);
            }
        } catch (err) {
            console.error('File parse error:', err);
            setError('文件解析失败，请检查文件是否损坏。');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) await processFile(file);
    };

    const handlePasteProcess = () => {
        if (!pasteContent.trim()) return;

        setError(null);
        try {
            // Try to parse tab-separated or comma-separated
            // Ideally, detect delimiter. Excel copy usually gives Tab separated value.
            const rows = pasteContent.trim().split('\n');
            const headers = rows[0].split('\t').map(h => h.trim());

            // Check if headers look valid, if not try comma
            let delimiter = '\t';
            if (headers.length < 2 && rows[0].includes(',')) {
                delimiter = ',';
            }

            const workbook = read(pasteContent, { type: 'string', raw: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json<any>(worksheet);

            const normalized = parseRawData(jsonData);
            if (normalized.length === 0) {
                setError('未解析到有效数据，请检查粘贴内容格式。');
            } else {
                setPreviewData(normalized);
            }
        } catch (err) {
            console.error('Paste parse error:', err);
            setError('文本解析失败，请确保格式正确。');
        }
    };

    const handleSubmit = async () => {
        if (previewData.length === 0) return;

        setIsLoading(true);
        try {
            const res: any = await api.post('/shiplist/import', previewData);
            if (res.success) {
                alert(`导入成功！\n共处理 ${res.totalImported} 条记录\n新创建 SKU: ${res.newSkusCreated}`);
                onSuccess();
                onClose();
            } else {
                setError('服务器返回错误，导入失败。');
            }
        } catch (err) {
            console.error('API Error:', err);
            setError('提交失败，请联系管理员。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">导入出库数据</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6">
                    <button
                        onClick={() => { setActiveTab('file'); setPreviewData([]); setError(null); }}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'file'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        文件上传 (Excel/CSV)
                    </button>
                    <button
                        onClick={() => { setActiveTab('paste'); setPreviewData([]); setError(null); }}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'paste'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        文本粘贴 (Paste)
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                    {activeTab === 'file' && previewData.length === 0 && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group ${isDragging
                                ? 'border-indigo-500 bg-indigo-50/30 scale-[0.99]'
                                : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/10'
                                }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx, .xls, .csv, .txt"
                            />
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                }`}>
                                <Upload size={32} />
                            </div>
                            <p className="text-slate-600 font-bold text-lg mb-1">
                                {isDragging ? '松开以上传文件' : '点击或拖拽上传文件'}
                            </p>
                            <p className="text-slate-400 text-sm">支持 .xlsx, .xls, .csv, .txt</p>
                        </div>
                    )}

                    {activeTab === 'paste' && previewData.length === 0 && (
                        <div className="flex flex-col gap-4 h-full">
                            <textarea
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                                placeholder="请直接粘贴 Excel 或 CSV 内容 (包含表头)...&#10;例:&#10;产品型号	产品名称	出库日期	数量	客户名称	含税单价"
                                className="flex-1 min-h-[200px] w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm"
                            />
                            <button
                                onClick={handlePasteProcess}
                                disabled={!pasteContent.trim()}
                                className="self-end px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                            >
                                解析内容
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Preview Table */}
                    {previewData.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700">数据预览 ({previewData.length} 条)</h3>
                                <button
                                    onClick={() => setPreviewData([])}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    清除重试
                                </button>
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[400px] overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 font-bold text-slate-500">产品型号</th>
                                            <th className="px-4 py-2 font-bold text-slate-500">名称</th>
                                            <th className="px-4 py-2 font-bold text-slate-500">日期</th>
                                            <th className="px-4 py-2 font-bold text-slate-500 text-right">数量</th>
                                            <th className="px-4 py-2 font-bold text-slate-500 text-right">含税单价</th>
                                            <th className="px-4 py-2 font-bold text-slate-500">客户</th>
                                            <th className="px-4 py-2 font-bold text-slate-500 w-24">单号</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewData.slice(0, 100).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-mono text-xs">{row.product_model}</td>
                                                <td className="px-4 py-2 truncate max-w-[150px]" title={row.product_name}>{row.product_name}</td>
                                                <td className="px-4 py-2 text-slate-500">{row.outbound_date}</td>
                                                <td className="px-4 py-2 text-right font-bold">{row.quantity}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{row.unit_price}</td>
                                                <td className="px-4 py-2 truncate max-w-[120px]">{row.customer_name}</td>
                                                <td className="px-4 py-2 text-xs text-slate-400">
                                                    {row.outbound_id ? <span className="text-emerald-600">更新</span> : '新增'}
                                                </td>
                                            </tr>
                                        ))}
                                        {previewData.length > 100 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-2 text-center text-slate-400 text-xs italic">
                                                    ... 还有 {previewData.length - 100} 条记录 ...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={previewData.length === 0 || isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                        确认导入
                    </button>
                </div>

            </div>
        </div>
    );
};
