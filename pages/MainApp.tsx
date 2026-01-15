
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Download, FileSpreadsheet, Loader2, X, Plus, ChevronDown, ChevronRight, Eye, ShieldAlert } from 'lucide-react';
import { getFileType, readExcelContent, readWordContent, fileToBase64, createExcelDownload, recognizeText } from '../services/fileUtils';
import { extractDataFromContent } from '../services/inquiryService';
import { ParsedInquiryItem, LogEntry, AIModel } from '../types';

interface ColumnHeader {
  key: string;
  label: string;
  minWidth: number;
  defaultWidth: number;
  align?: 'left' | 'right' | 'center';
}

const COLUMN_HEADERS: ColumnHeader[] = [
  { key: 'index', label: "序号", minWidth: 50, defaultWidth: 60, align: 'left' },
  { key: 'inquiryType', label: "询价类型", minWidth: 80, defaultWidth: 100, align: 'left' },
  { key: 'brand', label: "品牌", minWidth: 80, defaultWidth: 100, align: 'left' },
  { key: 'productName', label: "产品名称", minWidth: 100, defaultWidth: 150, align: 'left' },
  { key: 'model', label: "询价型号", minWidth: 120, defaultWidth: 180, align: 'left' },
  { key: 'quantity', label: "数量", minWidth: 80, defaultWidth: 110, align: 'right' },
  { key: 'unit', label: "物料单位", minWidth: 60, defaultWidth: 80, align: 'left' },
  { key: 'remarks', label: "询价备注", minWidth: 150, defaultWidth: 250, align: 'left' },
  { key: 'hasDrawing', label: "是否带图纸", minWidth: 80, defaultWidth: 100, align: 'left' },
  { key: 'customerMaterialCode', label: "客户物料编码", minWidth: 100, defaultWidth: 150, align: 'left' },
  { key: 'targetPrice', label: "目标价格", minWidth: 80, defaultWidth: 110, align: 'right' },
  { key: 'referenceLeadTime', label: "参考货期", minWidth: 80, defaultWidth: 100, align: 'left' },
  { key: 'expectedDeliveryDate', label: "期望交期(年-月-日)", minWidth: 140, defaultWidth: 160, align: 'left' },
  { key: 'estimatedAnnualUsage', label: "预计年用量", minWidth: 80, defaultWidth: 110, align: 'right' },
  { key: 'customerOrderNumber', label: "客户订单号", minWidth: 100, defaultWidth: 140, align: 'left' },
  { key: 'customerProjectNumber', label: "客户项目号", minWidth: 100, defaultWidth: 140, align: 'left' },
];

const ComplianceModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
      <div className="p-8 space-y-6">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-800">数据安全与隐私确认</h2>
          <p className="text-slate-500 text-sm leading-relaxed px-4">
            本系统由公司内部使用。为确保信息安全，我们在将数据提交给 AI 之前，会进行严格的本地脱敏处理。
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-700 text-sm">内容脱敏</div>
              <p className="text-[11px] text-slate-500">自动抹除 [公司名]、[姓名]、[电话] 等关键隐私标识。</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-700 text-sm">全链路审计</div>
              <p className="text-[11px] text-slate-500">所有解析行为将被记录，供后续安全审计与追溯。</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            我明白，确认并上传
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
          >
            暂不处理
          </button>
        </div>
      </div>
    </div>
  </div>
);

const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [isOpen, setIsOpen] = useState(false);

  const safeRender = (content: any) => {
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content, null, 2);
    }
    return String(content ?? '');
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-start group">
        <span className="text-slate-600 shrink-0 select-none opacity-50">[{log.timestamp.toLocaleTimeString()}]</span>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`break-words ${log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
                log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
              }`}>
              {log.message}
            </span>
            {log.details && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-0.5 hover:bg-white/10 rounded transition-colors text-slate-500 hover:text-white flex items-center gap-1 text-[10px]"
              >
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {isOpen ? '收起详情' : '查看详情'}
              </button>
            )}
          </div>

          {isOpen && log.details && (
            <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800 space-y-3 shadow-inner">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  [原始内容] (原始提取文本)
                </div>
                <pre className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 whitespace-pre-wrap max-h-48 overflow-auto text-[10px] leading-relaxed">
                  {safeRender(log.details.rawContent)}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-emerald-500 uppercase flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  [脱敏提示词] (脱敏后 AI 输入)
                </div>
                <pre className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400/90 whitespace-pre-wrap max-h-48 overflow-auto text-[10px] leading-relaxed">
                  {safeRender(log.details.maskedContent)}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-blue-400 uppercase flex items-center gap-1.5 font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  [AI 原始响应] (AI 原始 JSON)
                </div>
                <pre className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-blue-400/90 whitespace-pre-wrap max-h-48 overflow-auto text-[10px] leading-relaxed">
                  {safeRender(log.details.aiRawResponse)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInquiryItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  // const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek'); // Removed model selection
  const [columnWidths, setColumnWidths] = useState<number[]>(COLUMN_HEADERS.map(h => h.defaultWidth));
  const [showCompliance, setShowCompliance] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);


  // Load config from env
  const MAX_SIZE_MB = parseInt(import.meta.env.VITE_UPLOAD_MAX_SIZE_MB || '30', 10);
  const ALLOWED_TYPES = (import.meta.env.VITE_UPLOAD_ALLOWED_TYPES || 'xlsx,xls,doc,docx,pdf,jpg,jpeg,png').split(',');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', details?: any) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type,
      details
    }, ...prev]);
  }, []);

  const formatNumber = (val: string | number): string => {
    if (val === undefined || val === null || val === '' || val === '-') return "-";
    const strVal = String(val).replace(/,/g, '').trim();
    const num = parseFloat(strVal);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    addLog(`正在处理: ${file.name}`, 'info');

    try {
      // 1. 基础校验
      addLog(`校验文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`, 'info');
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB). 最大允许 ${MAX_SIZE_MB}MB`);
      }
      addLog(`文件大小校验通过`, 'info');

      const fileType = getFileType(file);
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

      addLog(`校验文件类型: ${fileExt}`, 'info');
      if (!ALLOWED_TYPES.includes(fileExt) && fileType === 'unknown') {
        throw new Error(`不支持的文件类型 .${fileExt}`);
      }
      addLog(`文件类型校验通过`, 'info');


      let contentToProcess: string | { mimeType: string; data: string };

      if (fileType === 'excel') {
        contentToProcess = await readExcelContent(file);
        addLog(`Excel 读取完成，正在脱敏并识别数据...`, 'info');
      } else if (fileType === 'word') {
        contentToProcess = await readWordContent(file);
        addLog(`Word 读取完成，正在脱敏并识别数据...`, 'info');
      } else if (fileType === 'pdf' || fileType === 'image') {
        const base64Data = await fileToBase64(file);
        contentToProcess = { mimeType: file.type, data: base64Data };
        addLog(`${fileType.toUpperCase()} 读取/转码完成`, 'info');
      } else {
        throw new Error("不支持的文件类型");
      }

      // Direct inquiry call (AI parsing only)
      const result = await extractDataFromContent(contentToProcess, file.name);
      // addLog(`contentToProcess读取成功2...`, 'info');
      const extractedItems = result.items || [];
      // addLog(`contentToProcess读取成功3...`, 'info');

      setParsedData(prev => [...prev, ...extractedItems]);
      addLog(`成功! 从 ${file.name} 提取了 ${extractedItems.length} 条数据`, 'success', result.debug);

      if (extractedItems.length > 0) {
        setTimeout(() => setIsUploadDrawerOpen(false), 500);
      }

    } catch (error: any) {
      console.error(error);
      addLog(`出错 (${file.name}): ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    setPendingFiles(fileList);
    setShowCompliance(true);

    // Reset input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmCompliance = () => {
    setShowCompliance(false);
    pendingFiles.forEach(file => handleProcessFile(file));
    setPendingFiles([]);
  };

  const handleDownload = () => {
    if (parsedData.length === 0) return;
    addLog("正在准备下载文件...", 'info');
    const exportData = parsedData.map(item => ({
      "询价类型": item.inquiryType,
      "品牌": item.brand,
      "产品名称": item.productName,
      "询价型号": item.model,
      "数量": item.quantity,
      "物料单位": item.unit,
      "询价备注": item.remarks,
      "是否带图纸": item.hasDrawing,
      "客户物料编码": item.customerMaterialCode,
      "目标价格": item.targetPrice,
      "参考货期": item.referenceLeadTime,
      "期望交期(年-月-日)": item.expectedDeliveryDate,
      "预计年用量": item.estimatedAnnualUsage,
      "客户订单号": item.customerOrderNumber,
      "客户项目号": item.customerProjectNumber
    }));
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `询价_${dateStr}_${timeStr}.xlsx`;
    createExcelDownload(exportData, filename);
    addLog(`导出成功: ${filename}`, 'success');
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(COLUMN_HEADERS[index].minWidth, startWidth + deltaX);
    setColumnWidths(prev => {
      const next = [...prev];
      next[index] = newWidth;
      return next;
    });
  }, []);

  const onMouseUp = useCallback(() => {
    if (resizingRef.current) {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [onMouseMove]);

  const startResize = (index: number, e: React.MouseEvent) => {
    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: columnWidths[index],
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  };

  const getAlignmentClass = (align?: string) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-sm bg-[#f7f5f2] text-slate-900">
      {/* Header removed and moved to Sidebar */}

      <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h2 className="text-2xl font-light text-slate-800 tracking-[0.1em]">询价任务看板</h2>
          </div>
          <div className="flex items-center gap-3">
            {parsedData.length > 0 && (
              <button
                onClick={() => setParsedData([])}
                className="text-slate-400 hover:text-red-500 font-bold transition-colors px-4 py-2 text-xs"
              >
                清空列表
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={parsedData.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${parsedData.length > 0
                ? 'bg-[#2c2c2c] text-white hover:bg-black shadow-gray-900/10'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              <Download className="w-4 h-4" />
              导出 Excel 报表
            </button>
          </div>
        </div>


        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-xl overflow-hidden flex flex-col flex-1 relative min-h-0 transition-all">
          <div className="px-6 py-4 border-b border-white/40 bg-white/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="font-bold text-slate-700">解析数据表</span>
              <span className="bg-[#2c2c2c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                {parsedData.length} 条记录
              </span>
            </div>
          </div>



          <div className="overflow-auto flex-1 bg-white relative">
            <>
              {parsedData.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">暂无数据，请点击右下角按钮上传文件</p>
                </div>
              ) : (
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full text-left table-fixed border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr className="border-b border-slate-200">
                        {COLUMN_HEADERS.map((head, i) => (
                          <th
                            key={i}
                            style={{ width: columnWidths[i] }}
                            className={`relative px-4 py-3.5 text-xs font-normal text-slate-500 uppercase tracking-wider group bg-slate-50 ${getAlignmentClass(head.align)}`}
                          >
                            <div className="truncate pr-1" title={head.label}>{head.label}</div>
                            <div
                              onMouseDown={(e) => startResize(i, e)}
                              className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-20 group-hover:bg-blue-100 transition-colors"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px]">
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3.5 text-slate-400 truncate" title={`${idx + 1}`}>{idx + 1}</td>
                          <td className="px-4 py-3.5 text-slate-400 italic truncate" title={row.inquiryType || "-"}>{row.inquiryType || "-"}</td>
                          <td className="px-4 py-3.5 text-slate-800 truncate" title={row.brand}>{row.brand}</td>
                          <td className="px-4 py-3.5 text-slate-700 truncate" title={row.productName}>{row.productName}</td>
                          <td className="px-4 py-3.5 text-slate-700 truncate font-mono text-[12px]" title={row.model}>{row.model}</td>
                          <td className="px-4 py-3.5 text-slate-900 truncate text-right" title={formatNumber(row.quantity)}>{formatNumber(row.quantity)}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate" title={row.unit}>{row.unit}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate" title={row.remarks}>{row.remarks}</td>
                          <td className="px-4 py-3.5 text-slate-400 italic truncate" title={row.hasDrawing || "-"}>{row.hasDrawing || "-"}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate text-[12px]" title={row.customerMaterialCode}>{row.customerMaterialCode}</td>
                          <td className="px-4 py-3.5 text-slate-900 truncate text-right" title={formatNumber(row.targetPrice)}>{formatNumber(row.targetPrice)}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate" title={row.referenceLeadTime}>{row.referenceLeadTime}</td>
                          <td className="px-4 py-3.5 text-blue-600 truncate" title={row.expectedDeliveryDate}>{row.expectedDeliveryDate}</td>
                          <td className="px-4 py-3.5 text-slate-900 truncate text-right" title={formatNumber(row.estimatedAnnualUsage)}>{formatNumber(row.estimatedAnnualUsage)}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate" title={row.customerOrderNumber}>{row.customerOrderNumber}</td>
                          <td className="px-4 py-3.5 text-slate-600 truncate" title={row.customerProjectNumber}>{row.customerProjectNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>

          </div>
        </div>

        <div className="bg-[#2c2c2c] rounded-[2rem] border border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[280px] shrink-0">
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">系统监控日志</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">安全加密连接</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px] scrollbar-thin bg-slate-900/50">
            {logs.length === 0 && (
              <div className="text-slate-600 italic animate-pulse">Waiting for secure data transmission...</div>
            )}
            {logs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        </div>
      </main>

      <button
        onClick={() => setIsUploadDrawerOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#2c2c2c] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-black hover:scale-110 active:scale-95 transition-all z-40 group"
        title="上传新询价单"
      >
        <Plus className={`w-8 h-8 transition-transform ${isUploadDrawerOpen ? 'rotate-45' : ''}`} />
      </button>

      {isUploadDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsUploadDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isUploadDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">批量上传询价单</h2>
          </div>
          <button onClick={() => setIsUploadDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* Model Selection Removed */}

          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 text-center flex flex-col items-center gap-4 ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) onFilesSelected(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".xlsx, .xls, .doc, .docx, .pdf, .jpg, .jpeg, .png"
              onChange={(e) => onFilesSelected(e.target.files)}
            />

            <div className={`p-5 rounded-full ${isProcessing ? 'bg-blue-100' : 'bg-slate-100'}`}>
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-700">拖拽文件或点击浏览</h3>
              <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                支持 CSV, Excel, Word, PDF 或高清图片。<br />
                单文件限制 {MAX_SIZE_MB}MB。
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-4 w-full py-3 bg-[#2c2c2c] text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-black disabled:bg-slate-300 transition-all"
            >
              {isProcessing ? '处理中...' : '选择文件'}
            </button>
          </div>

          <div className="mt-8 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">解析指南</h4>
            <div className="space-y-3">
              {[
                { label: '数值格式', desc: '数量与价格自动对齐并补全两位小数，如 1,234.00' },
                { label: '日期识别', desc: 'AI 自动转换各种日期格式为 YYYY-MM-DD' },
                { label: '隐私加密', desc: '所有上传内容在传输前会自动抹除敏感实体词' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
        </div>
      </div>

      {showCompliance && (
        <ComplianceModal
          onConfirm={handleConfirmCompliance}
          onCancel={() => {
            setShowCompliance(false);
            setPendingFiles([]);
          }}
        />
      )}
    </div>
  );
};

export default App;
