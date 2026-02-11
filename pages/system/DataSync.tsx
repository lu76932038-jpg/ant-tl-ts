
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Save, RefreshCw, Database, Play, CheckCircle, AlertTriangle, Clock, Code, Plus, X, Trash2 } from 'lucide-react';

interface SyncConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sql?: string;
    schedule?: string[]; // Changed to array of time strings HH:mm
}

const DataSync: React.FC = () => {
    const [config, setConfig] = useState<SyncConfig>({
        host: '',
        port: 3306,
        user: '',
        password: '',
        database: '',
        sql: 'SELECT * FROM view_ex_stock_out_detail WHERE outbound_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        schedule: ['02:00']
    });

    // Tab State
    const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<{ time: string; message: string }[]>([]);

    // Status States
    const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [sqlTestStatus, setSqlTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean, errors: string[], warnings: string[] } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Input States
    const [newTime, setNewTime] = useState('08:00');
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        fetchConfig();
        fetchLogs();
        fetchStatus();

        // Auto-refresh logs and status every 3 seconds
        const intervalId = setInterval(() => {
            fetchLogs();
            fetchStatus();
        }, 3000);

        return () => clearInterval(intervalId);
    }, [activeTab]);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/datasync/status');
            if (activeTab === 'outbound') {
                setIsSyncing(res.data.isSyncing);
            } else {
                setIsSyncing(res.data.isInboundSyncing);
            }
        } catch (error) {
            console.error('Failed to fetch status', error);
        }
    };

    // 强制释放同步锁
    const forceReset = async () => {
        if (!confirm('确定要强制释放同步锁吗？这会允许新的同步任务启动。')) return;
        try {
            await api.post('/datasync/force-reset');
            alert('已强制释放同步锁');
            fetchStatus();
            fetchLogs();
        } catch (error) {
            alert('解锁失败');
        }
    };

    const fetchConfig = async () => {
        try {
            const endpoint = activeTab === 'outbound' ? '/datasync/config' : '/datasync/config/inbound';
            const data: any = await api.get(endpoint);
            if (data) {
                // Ensure schedule is array
                let schedule = data.schedule;
                if (typeof schedule === 'string') {
                    schedule = [schedule]; // Fallback for old format
                } else if (!Array.isArray(schedule)) {
                    schedule = ['02:00'];
                }
                setConfig({ ...data, schedule });
            } else {
                // Default config if empty
                setConfig({
                    host: '',
                    port: 3306,
                    user: '',
                    password: '',
                    database: '',
                    sql: activeTab === 'outbound'
                        ? 'SELECT * FROM view_ex_stock_out_detail WHERE outbound_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
                        : 'SELECT * FROM view_inbound_detail WHERE arrival_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                    schedule: ['02:00']
                });
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const type = activeTab === 'outbound' ? 'outbound' : 'inbound';
            const data: any = await api.get(`/datasync/logs?type=${type}`);
            // Parse raw strings if needed, or handle array of objects if backend returned that (it returns strings now)
            const parsedLogs = Array.isArray(data) ? data.map((line: any) => {
                if (typeof line === 'string') {
                    const firstDash = line.indexOf(' - ');
                    if (firstDash === -1) return { time: '', message: line };
                    return {
                        time: line.substring(0, firstDash),
                        message: line.substring(firstDash + 3)
                    };
                }
                return line;
            }) : [];
            setLogs(parsedLogs);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    };

    // --- Actions ---

    const saveDbConfig = async () => {
        try {
            setIsLoading(true);
            const { host, port, user, password, database } = config;
            const endpoint = activeTab === 'outbound' ? '/datasync/config' : '/datasync/config/inbound';
            await api.post(endpoint, { host, port, user, password, database });
            alert('数据库配置已保存');
        } catch (error) {
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    const testDbConnection = async () => {
        try {
            setIsLoading(true);
            setDbTestStatus('idle');
            await api.post('/datasync/test', config);
            setDbTestStatus('success');
        } catch (error) {
            setDbTestStatus('error');
            alert('连接失败，请检查配置');
        } finally {
            setIsLoading(false);
        }
    };

    const saveStrategy = async () => {
        try {
            setIsLoading(true);
            const endpoint = activeTab === 'outbound' ? '/datasync/config' : '/datasync/config/inbound';
            await api.post(endpoint, { sql: config.sql });
            alert('抽取策略已保存');
        } catch (error) {
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    const verifySql = async () => {
        try {
            setIsLoading(true);
            setSqlTestStatus('idle');
            setPreviewData([]);
            setValidationResult(null);

            const result: any = await api.post('/datasync/test-sql', {
                ...config,
                sql: config.sql,
                mode: activeTab
            });

            setPreviewData(result.rows || []);
            setValidationResult(result.validation);

            if (result.validation?.valid) {
                setSqlTestStatus('success');
            } else {
                setSqlTestStatus('error');
            }

            setShowPreview(true);
        } catch (error: any) {
            setSqlTestStatus('error');
            alert('SQL 验证失败: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const saveSchedule = async () => {
        try {
            setIsLoading(true);
            const endpoint = activeTab === 'outbound' ? '/datasync/config' : '/datasync/config/inbound';
            await api.post(endpoint, { schedule: config.schedule });
            alert('定时任务配置已保存');
        } catch (error) {
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!confirm('确定要立即执行同步吗？')) return;
        try {
            setIsLoading(true);
            const endpoint = activeTab === 'outbound' ? '/datasync/sync' : '/datasync/sync/inbound';
            await api.post(endpoint);
            alert('同步任务已在后台启动，请关注右侧同步日志查看进度。');
            fetchLogs();
        } catch (error) {
            alert('同步失败，请查看日志');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helpers ---

    const addTime = () => {
        if (config.schedule?.includes(newTime)) return;
        const newSchedule = [...(config.schedule || []), newTime].sort();
        setConfig({ ...config, schedule: newSchedule });
    };

    const removeTime = (time: string) => {
        const newSchedule = config.schedule?.filter(t => t !== time) || [];
        setConfig({ ...config, schedule: newSchedule });
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="text-indigo-600" />
                        出库数据同步
                    </h1>
                    <p className="text-gray-500 mt-1">配置外部数据库并同步出库记录到系统</p>
                </div>
                <div className="flex gap-3">
                    {/* Header Actions removed as requested */}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 space-y-8">

                    {/* 1. Database Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Database size={120} />
                        </div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <Database size={18} />
                                </div>
                                数据库连接
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={testDbConnection}
                                    disabled={isLoading}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-1.5 transition-colors
                                        ${dbTestStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            dbTestStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {dbTestStatus === 'success' ? <CheckCircle size={14} /> :
                                        dbTestStatus === 'error' ? <AlertTriangle size={14} /> :
                                            <RefreshCw size={14} className={isLoading && dbTestStatus === 'idle' ? 'animate-spin' : ''} />}
                                    测试连接
                                </button>
                                <button
                                    onClick={saveDbConfig}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-1.5"
                                >
                                    <Save size={14} />
                                    保存配置
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Host 地址</label>
                                <input
                                    type="text"
                                    value={config.host}
                                    onChange={e => setConfig({ ...config, host: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">端口 Port</label>
                                <input
                                    type="number"
                                    value={config.port}
                                    onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="3306"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">用户名 User</label>
                                <input
                                    type="text"
                                    value={config.user}
                                    onChange={e => setConfig({ ...config, user: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="root"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">密码 Password</label>
                                <input
                                    type="password"
                                    value={config.password}
                                    onChange={e => setConfig({ ...config, password: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">数据库名 Database</label>
                                <input
                                    type="text"
                                    value={config.database}
                                    onChange={e => setConfig({ ...config, database: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                                    placeholder="erp_stock_db"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Extraction Strategy */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Code size={120} />
                        </div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <Code size={18} />
                                </div>
                                抽取策略
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={verifySql}
                                    disabled={isLoading || isSyncing}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-1.5 transition-colors
                                        ${sqlTestStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            sqlTestStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                                isSyncing ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' :
                                                    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {sqlTestStatus === 'success' ? <CheckCircle size={14} /> :
                                        sqlTestStatus === 'error' ? <AlertTriangle size={14} /> :
                                            <Play size={14} className={(isLoading && sqlTestStatus === 'idle') || isSyncing ? 'animate-spin' : ''} />}
                                    验证 SQL
                                </button>
                                <button
                                    onClick={saveStrategy}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-1.5"
                                >
                                    <Save size={14} />
                                    保存策略
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 mb-3 text-xs text-amber-800 flex items-start gap-2">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <div>
                                        请确保 Select 结果包含以下别名列:
                                        <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                                            <span className="font-bold mr-1">必填:</span>
                                            {activeTab === 'outbound' ? (
                                                ['outbound_id', 'product_model', 'product_name', 'quantity', 'customer_name', 'outbound_date'].map(field => (
                                                    <span key={field} className="bg-white border border-red-200 text-red-700 px-1 py-0.5 rounded">{field}</span>
                                                ))
                                            ) : (
                                                ['entry_id', 'product_model', 'product_name', 'quantity', 'arrival_date', 'supplier'].map(field => (
                                                    <span key={field} className="bg-white border border-red-200 text-red-700 px-1 py-0.5 rounded">{field}</span>
                                                ))
                                            )}

                                            <span className="font-bold mx-1">选填:</span>
                                            {activeTab === 'outbound' ? (
                                                ['unit_price', 'warehouse', 'customer_code', 'product_type'].map(field => (
                                                    <span key={field} className="bg-white border border-amber-200 text-amber-700 px-1 py-0.5 rounded">{field}</span>
                                                ))
                                            ) : (
                                                ['unit_price', 'purchase_date'].map(field => (
                                                    <span key={field} className="bg-white border border-amber-200 text-amber-700 px-1 py-0.5 rounded">{field}</span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <textarea
                                    value={config.sql}
                                    onChange={e => setConfig({ ...config, sql: e.target.value })}
                                    className="w-full px-4 py-4 bg-slate-900 text-slate-200 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none font-mono text-sm h-48 leading-relaxed custom-scrollbar shadow-inner"
                                    placeholder="SELECT id as outbound_id, model as product_model..."
                                />
                            </div>
                        </div>

                        {/* SQL Preview Modal/Area */}
                        {showPreview && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            {sqlTestStatus === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                                            SQL 数据预览 & 验证
                                        </h3>
                                        <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                            <X size={20} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="px-4 pt-4">
                                        {validationResult && !validationResult.valid && (
                                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                                                <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-1">
                                                    <AlertTriangle size={16} />
                                                    验证失败：缺少必需列
                                                </div>
                                                <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 ml-1">
                                                    {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {validationResult && validationResult.warnings.length > 0 && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
                                                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                                                    <AlertTriangle size={16} />
                                                    警告：缺少可选列 (建议提供)
                                                </div>
                                                <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5 ml-1">
                                                    {validationResult.warnings.map((err, i) => <li key={i}>{err}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {validationResult && validationResult.valid && validationResult.warnings.length === 0 && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 mb-4 text-emerald-700 text-sm flex items-center gap-2">
                                                <CheckCircle size={16} />
                                                验证通过：所有必需列均已匹配
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                        {previewData.length > 0 ? (
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        {Object.keys(previewData[0]).map(key => (
                                                            <th key={key} className="py-2 px-3 font-semibold text-slate-500">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.map((row, i) => (
                                                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                            {Object.values(row).map((val: any, j) => (
                                                                <td key={j} className="py-2 px-3 text-slate-700 font-mono">
                                                                    {String(val)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-center py-12 text-slate-400">
                                                未查询到数据
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-slate-100">
                                        <div className="flex gap-4 mt-6">
                                            <button
                                                onClick={verifySql}
                                                disabled={isSyncing}
                                                className={`flex items-center gap-2 px-6 py-2 border rounded-lg transition-colors ${isSyncing
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Code size={18} />
                                                验证 SQL
                                            </button>
                                            <button
                                                onClick={handleSync}
                                                disabled={isSyncing}
                                                className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors ${isSyncing
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                                    }`}
                                            >
                                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                                {isSyncing ? '同步中...' : '手动同步'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Scheduler */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Clock size={120} />
                        </div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <Clock size={18} />
                                </div>
                                定时同步
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSync}
                                    disabled={isLoading || isSyncing}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all
                                        ${isSyncing
                                            ? 'bg-indigo-300 text-white cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    <Play size={14} className={isSyncing ? 'animate-spin' : ''} />
                                    {isSyncing ? '同步中...' : '立即执行'}
                                </button>
                                <button
                                    onClick={saveSchedule}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-1.5"
                                >
                                    <Save size={14} />
                                    保存设置
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">每日同步时间点</label>

                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                {config.schedule?.map((time, idx) => (
                                    <div key={idx} className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 group/chip">
                                        {time}
                                        <button
                                            onClick={() => removeTime(time)}
                                            className="text-orange-400 hover:text-orange-600 opacity-0 group-hover/chip:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 max-w-xs">
                                <div className="relative flex-1">
                                    <input
                                        type="time"
                                        value={newTime}
                                        onChange={e => setNewTime(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                    />
                                    <Clock className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                                </div>
                                <button
                                    onClick={addTime}
                                    className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col sticky top-8 max-h-[calc(100vh-4rem)]">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold">同步日志</h2>
                                {isSyncing ? (
                                    <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                        同步运行中...
                                        <button
                                            onClick={forceReset}
                                            className="ml-1 text-xs text-red-500 hover:text-red-700 underline"
                                            title="强制释放同步锁"
                                        >
                                            解锁
                                        </button>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                        空闲
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={fetchLogs}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <RefreshCw size={18} className={`text-gray-500 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-100 p-4 font-mono text-[11px] space-y-3 custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-slate-400 text-center py-20 flex flex-col items-center gap-2">
                                    <RefreshCw size={24} className="opacity-50" />
                                    暂无日志记录
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 group">
                                        <div className="text-slate-400 shrink-0 select-none min-w-[150px]">{log.time ? new Date(log.time).toLocaleString() : ''}</div>
                                        <div className={`break-all ${log.message.includes('failed') || log.message.includes('Error') ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                            {log.message}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataSync;
