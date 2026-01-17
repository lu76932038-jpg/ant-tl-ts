import React, { useState } from 'react';
import { History, ChevronLeft, ChevronDown } from 'lucide-react';
import { AuditLog } from '../types';

interface OperationLogsProps {
    logs: AuditLog[];
}

const OperationLogs: React.FC<OperationLogsProps> = ({ logs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());

    const toggleLogExpansion = (index: number) => {
        const next = new Set(expandedLogIds);
        if (next.has(index)) {
            next.delete(index);
        } else {
            next.add(index);
        }
        setExpandedLogIds(next);
    };

    // 字段名称映射（中文化）
    const fieldLabels: Record<string, string> = {
        safety_stock_days: '安全库存月份',
        benchmark_type: '预测基准类型',
        mom_range: '环比参考范围',
        yoy_range: '同比参考范围',
        ratio_adjustment: '比率调整',
        forecast_overrides: '手动预测覆盖',
        calculated_forecasts: '系统计算预测',
        supplier_info: '供应商信息',
        start_year_month: '起始年月',
        forecast_year_month: '预测截止年月',
    };

    // 格式化值显示
    const formatValue = (key: string, val: any): string => {
        if (val === null || val === undefined) return '-';
        if (key === 'benchmark_type') return val === 'mom' ? '环比' : '同比';
        if (key === 'safety_stock_days') return `${val} 个月`;
        if (key === 'ratio_adjustment') return `${val}%`;
        if (typeof val === 'object') return `${Object.keys(val).length} 项数据`;
        return String(val);
    };

    // 获取操作类型的友好名称
    const actionLabels: Record<string, { label: string; color: string }> = {
        'UPDATE_STRATEGY': { label: '策略配置更新', color: 'bg-blue-100 text-blue-700' },
        'CREATE_PO': { label: '生成采购单', color: 'bg-green-100 text-green-700' },
        'UPDATE_FORECAST': { label: '预测数据更新', color: 'bg-purple-100 text-purple-700' },
    };

    return (
        <div className="mt-8 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden print:hidden">
            <div
                className="flex items-center justify-between p-6 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <History size={20} className="text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-900">操作日志</h3>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">{logs.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <ChevronLeft size={20} className={`text-gray-400 transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-0'}`} />
                </div>
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0">
                    <div className="relative pl-4 border-l-2 border-gray-200 space-y-6 my-4">
                        {logs.map((log, index) => {
                            // 解析日志内容
                            let parsedContent: { desc?: string; diff?: Record<string, any> } = {};
                            try {
                                parsedContent = JSON.parse(log.content);
                            } catch {
                                parsedContent = { desc: log.content };
                            }

                            const actionInfo = actionLabels[log.action_type] || { label: log.action_type, color: 'bg-gray-100 text-gray-700' };

                            return (
                                <div key={log.id} className="relative group">
                                    {/* 时间线圆点 */}
                                    <div className="absolute -left-[23px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm z-10 group-hover:scale-110 transition-transform"></div>

                                    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all">
                                        {/* 头部：时间 + 操作类型 */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${actionInfo.color}`}>
                                                    {actionInfo.label}
                                                </span>
                                                <span className="text-xs text-gray-400">操作人: admin</span>
                                            </div>
                                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                {log.created_at}
                                            </span>
                                        </div>

                                        {/* 操作描述 */}
                                        {parsedContent.desc && (
                                            <p className="text-sm text-gray-700 font-medium mb-3">
                                                {parsedContent.desc}
                                            </p>
                                        )}

                                        {/* 变更详情 */}
                                        {parsedContent.diff && Object.keys(parsedContent.diff).length > 0 && (
                                            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">变更详情</span>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {Object.entries(parsedContent.diff)
                                                        .slice(0, expandedLogIds.has(index) ? undefined : 6)
                                                        .map(([key, value]) => (
                                                            <div key={key} className="flex items-center justify-between px-3 py-2 text-xs">
                                                                <span className="text-gray-500">{fieldLabels[key] || key}</span>
                                                                <span className="font-medium text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                                                                    {formatValue(key, value)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    {Object.keys(parsedContent.diff).length > 6 && (
                                                        <button
                                                            onClick={() => toggleLogExpansion(index)}
                                                            className="w-full px-3 py-2 text-[10px] text-gray-500 hover:text-blue-600 hover:bg-gray-50 text-center transition-colors border-t border-gray-50 flex items-center justify-center gap-1"
                                                        >
                                                            {expandedLogIds.has(index) ? (
                                                                <>
                                                                    收起详细信息
                                                                    <ChevronDown size={10} className="rotate-180" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    还有 {Object.keys(parsedContent.diff).length - 6} 项变更 (点击展开)
                                                                    <ChevronDown size={10} />
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {logs.length === 0 && (
                            <div className="text-center text-gray-400 py-8 text-sm">暂无操作日志</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OperationLogs;
