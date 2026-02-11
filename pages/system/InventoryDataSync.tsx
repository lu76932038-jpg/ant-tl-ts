import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Save, RefreshCw, Database, Play, CheckCircle, AlertTriangle, Clock, Code, Plus, X } from 'lucide-react';

interface SyncConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sql?: string;
    schedule?: string[]; // HH:mm array
}

const InventoryDataSync: React.FC = () => {
    const [config, setConfig] = useState<SyncConfig>({
        host: '',
        port: 3306,
        user: '',
        password: '',
        database: '',
        sql: 'SELECT warehouse_name as warehouse, sku as product_model, qty as quantity FROM inventory_table',
        schedule: ['03:00']
    });

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

        const intervalId = setInterval(() => {
            fetchLogs();
            fetchStatus();
        }, 3000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/datasync/status');
            setIsSyncing(res.data.isInventorySyncing);
        } catch (error) {
            console.error('Failed to fetch status', error);
        }
    };

    const fetchConfig = async () => {
        try {
            const data: any = await api.get('/datasync/config/inventory');
            if (data && Object.keys(data).length > 0) {
                let schedule = data.schedule;
                if (typeof schedule === 'string') {
                    schedule = [schedule];
                } else if (!Array.isArray(schedule)) {
                    schedule = ['03:00'];
                }
                setConfig({ ...data, schedule });
            }
        } catch (error) {
            console.error('Failed to fetch inventory config', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const data: any = await api.get('/datasync/logs?type=inventory');
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

    const saveDbConfig = async () => {
        try {
            setIsLoading(true);
            const { host, port, user, password, database } = config;
            await api.post('/datasync/config/inventory', { host, port, user, password, database });
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
            await api.post('/datasync/config/inventory', { sql: config.sql });
            alert('库存抽取策略已保存');
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
                config: config,
                mode: 'inventory'
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
            await api.post('/datasync/config/inventory', { schedule: config.schedule });
            alert('库存定时任务已保存');
        } catch (error) {
            alert('保存失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!confirm('确定要立即执行库存数据同步吗？')) return;
        try {
            setIsLoading(true);
            await api.post('/datasync/sync/inventory');
            alert('库存同步任务已启动，请查看日志进度。');
            fetchLogs();
        } catch (error) {
            alert('同步启动失败');
        } finally {
            setIsLoading(false);
        }
    };

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
                        <Database className="text-blue-600" />
                        库存数据同步
                    </h1>
                    <p className="text-gray-500 mt-1">配置外部数据库并同步即时库存数据到备货清单</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Database Config */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative group">
                        <div className="flex justify-between items-center mb-6">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Host 地址</label>
                                <input
                                    type="text"
                                    value={config.host}
                                    onChange={e => setConfig({ ...config, host: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">端口 Port</label>
                                <input
                                    type="number"
                                    value={config.port}
                                    onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="3306"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">用户名 User</label>
                                <input
                                    type="text"
                                    value={config.user}
                                    onChange={e => setConfig({ ...config, user: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="root"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">密码 Password</label>
                                <input
                                    type="password"
                                    value={config.password}
                                    onChange={e => setConfig({ ...config, password: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">数据库名 Database</label>
                                <input
                                    type="text"
                                    value={config.database}
                                    onChange={e => setConfig({ ...config, database: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                                    placeholder="inventory_db"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SQL Strategy */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative group">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <Code size={18} />
                                </div>
                                库存抽取策略
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={verifySql}
                                    disabled={isLoading || isSyncing}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-1.5 transition-colors
                                        ${sqlTestStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            sqlTestStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {sqlTestStatus === 'success' ? <CheckCircle size={14} /> :
                                        sqlTestStatus === 'error' ? <AlertTriangle size={14} /> :
                                            <Play size={14} className={isLoading && sqlTestStatus === 'idle' ? 'animate-spin' : ''} />}
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

                        <div className="space-y-4">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                <div className="font-bold flex items-center gap-1 mb-1">
                                    <AlertTriangle size={14} />
                                    SQL 必需列定义:
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="bg-white border border-blue-200 px-2 py-0.5 rounded"><b>warehouse</b>: 仓库名称</span>
                                    <span className="bg-white border border-blue-200 px-2 py-0.5 rounded"><b>product_model</b>: 产品型号 (SKU)</span>
                                    <span className="bg-white border border-blue-200 px-2 py-0.5 rounded"><b>quantity</b>: 当前库存数</span>
                                </div>
                                <div className="mt-2 text-[10px] text-blue-600">
                                    提示：如果备货产品库中不存在该型号，系统将根据 product_model 自动创建。
                                </div>
                            </div>
                            <textarea
                                value={config.sql}
                                onChange={e => setConfig({ ...config, sql: e.target.value })}
                                className="w-full px-4 py-4 bg-slate-900 text-slate-200 border border-slate-700 rounded-xl outline-none font-mono text-sm h-48"
                                placeholder="SELECT area as warehouse, sku as product_model, stock_qty as quantity FROM my_inventory"
                            />
                        </div>
                    </div>

                    {/* Scheduler */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <Clock size={18} />
                                </div>
                                定时同步设置
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSync}
                                    disabled={isLoading || isSyncing}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                                        ${isSyncing ? 'bg-orange-300' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                                >
                                    <Play size={14} className={isSyncing ? 'animate-spin' : ''} />
                                    {isSyncing ? '同步中...' : '立即同步'}
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

                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {config.schedule?.map((time, idx) => (
                                <div key={idx} className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 group">
                                    {time}
                                    <button onClick={() => removeTime(time)} className="text-orange-400 hover:text-orange-600 opacity-0 group-hover:opacity-100">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 max-w-xs">
                            <input
                                type="time"
                                value={newTime}
                                onChange={e => setNewTime(e.target.value)}
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                            <button onClick={addTime} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs Area */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col sticky top-8 max-h-[calc(100vh-4rem)]">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="font-bold">同步日志回顾</h2>
                            <button onClick={fetchLogs} className="p-2 hover:bg-gray-100 rounded-full">
                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] bg-slate-50 p-4 rounded-xl">
                            {logs.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">暂无库存同步日志</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-2">
                                        <span className="text-slate-400 shrink-0 min-w-[150px]">{log.time ? new Date(log.time).toLocaleString() : ''}</span>
                                        <span className={log.message.includes('fail') ? 'text-red-500' : 'text-slate-600'}>{log.message}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* SQL Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                {sqlTestStatus === 'success' ? <CheckCircle className="text-emerald-500" /> : <AlertTriangle className="text-red-500" />}
                                SQL 数据预览
                            </h3>
                            <button onClick={() => setShowPreview(false)}><X size={20} /></button>
                        </div>
                        <div className="p-4 border-b">
                            {validationResult && !validationResult.valid && (
                                <div className="text-red-600 text-xs mb-2">验证失败：{validationResult.errors.join(', ')}</div>
                            )}
                            {validationResult?.valid && <div className="text-emerald-600 text-xs">验证通过：所有必需字段均已匹配。</div>}
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {previewData.length > 0 ? (
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            {Object.keys(previewData[0]).map(k => <th key={k} className="p-2">{k}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((r, i) => (
                                            <tr key={i} className="border-b">
                                                {Object.values(r).map((v, j) => <td key={j} className="p-2">{String(v)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className="text-center py-10">未查询到数据结果</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryDataSync;
