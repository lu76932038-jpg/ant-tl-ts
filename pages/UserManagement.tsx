import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Trash2, Shield, Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, RotateCw, Search, LayoutGrid, LoaderCircle, CircleX } from 'lucide-react';
import { api } from '../services/api';

interface User {
    id: number;
    username: string;
    email: string;
    password?: string;
    raw_password?: string;
    role: 'user' | 'admin';
    permissions?: string[];
    created_at: string;
    last_login: string | null;
    is_active: boolean;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'admin' | 'user' | null>(null);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<{
        role: 'user' | 'admin';
        permissions: string[];
        password?: string;
    }>({ role: 'user', permissions: [], password: '' });

    const AVAILABLE_PERMISSIONS = [
        { key: 'inquiry_parsing', label: '询价解析' },
        { key: 'at_orders', label: 'A&T 订单' },
        { key: 'stock_list', label: '备货助手' },
        { key: 'train_invoice', label: '高铁发票助手' },
        { key: 'profile', label: '个人中心(基本信息)' },
        { key: 'change_password', label: '个人中心(修改密码)' },
    ];

    const PERMISSION_LABELS: Record<string, string> = AVAILABLE_PERMISSIONS.reduce((acc, curr) => {
        acc[curr.key] = curr.label;
        return acc;
    }, {} as Record<string, string>);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/users');
            setUsers(data as any);
        } catch (err: any) {
            console.error('Fetch users failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (userId: number) => {
        if (currentUser?.id === userId) {
            alert('不能删除自己');
            return;
        }
        if (!confirm('确定要删除这个用户吗?')) return;

        try {
            await api.delete(`/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
        } catch (err: any) {
            alert(err.message || '删除用户失败');
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({
            role: user.role,
            permissions: user.permissions || [],
            password: '' // Reset password input
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (field: string, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const togglePermission = (permissionKey: string) => {
        setEditForm(prev => {
            const hasPermission = prev.permissions.includes(permissionKey);
            return {
                ...prev,
                permissions: hasPermission
                    ? prev.permissions.filter(p => p !== permissionKey)
                    : [...prev.permissions, permissionKey]
            };
        });
    };

    const togglePasswordVisibility = (userId: number) => {
        setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const body: any = {
                role: editForm.role,
                permissions: editForm.permissions
            };
            if (editForm.password) {
                body.password = editForm.password;
            }

            await api.put(`/users/${editingUser.id}`, body);

            setIsEditModalOpen(false);
            setEditingUser(null);
            fetchUsers();
            alert('用户更新成功');
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || '更新失败');
        }
    };

    // Client-side filtering
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === null || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="flex-1 flex flex-col p-6 max-w-[1600px] mx-auto overflow-hidden w-full min-h-0">
            {/* Top Section */}
            <div className="flex-none space-y-4 pb-6 px-2">
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">系统管理 / 用户管理</h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">系统用户权限与安全中心</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm"
                        title="刷新数据"
                    >
                        <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="bg-[#f0f0f0]/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Search Input */}
                        <div className="relative min-w-[240px] w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="搜索用户名或邮箱..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-5 pr-5 py-3 bg-white border border-slate-100 text-sm rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 shadow-sm transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Search className="w-4 h-4 text-slate-300" />
                            </div>
                        </div>

                        {/* Role Filters */}
                        <div className="flex items-center gap-2 ml-auto w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {[
                                { id: null, label: '全部用户', icon: LayoutGrid, color: 'slate', count: users.length },
                                { id: 'admin', label: '管理员', icon: Shield, color: 'blue', count: users.filter(u => u.role === 'admin').length },
                                { id: 'user', label: '普通用户', icon: Users, color: 'slate', count: users.filter(u => u.role === 'user').length }
                            ].map((btn) => (
                                <button
                                    key={btn.label}
                                    onClick={() => setRoleFilter(btn.id as any)}
                                    title={btn.label}
                                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all font-black text-sm group shrink-0 whitespace-nowrap
                                    ${roleFilter === btn.id
                                            ? 'bg-black text-white shadow-lg'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-50 shadow-sm'}`}
                                >
                                    <btn.icon className={`w-4 h-4 ${roleFilter === btn.id ? 'text-white' : `text-${btn.color}-500`}`} />
                                    <span>{btn.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] min-w-[20px] text-center ml-1
                                    ${roleFilter === btn.id ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                                        {btn.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-100">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">用户名</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">角色</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">权限清单</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">登录凭证 (管理员可见)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">状态</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <Users className="w-12 h-12 opacity-20" />
                                            <p className="font-bold">未找到匹配的用户</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-100/30 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 tracking-tight">{u.username}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{u.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {u.role === 'admin' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-tight shadow-md shadow-slate-200">
                                                <Shield className="w-3 h-3 text-blue-400" /> 管理员
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-tight">
                                                用户
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                                            {u.permissions?.map(p => (
                                                <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-[9px] font-black whitespace-nowrap">
                                                    {PERMISSION_LABELS[p] || p}
                                                </span>
                                            )) || <span className="text-[10px] text-slate-300">无权限</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg font-mono text-xs font-bold text-slate-600 min-w-[120px]">
                                                {showPasswords[u.id] ? (u.raw_password || '不可用 (历史数据)') : '••••••••'}
                                            </div>
                                            <button
                                                onClick={() => togglePasswordVisibility(u.id)}
                                                className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                {showPasswords[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{u.is_active ? '活跃' : '离线'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="px-4 py-2 bg-white border border-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95"
                                            >
                                                配置
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!isLoading && filteredUsers.length > 0 && (
                    <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                        <span>显示所有用户</span>
                        <span>共 {filteredUsers.length} 位用户</span>
                    </div>
                )}
            </div>

            {/* 编辑弹窗 */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 p-8 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                        <Lock className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">安全与权限配置</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">修改用户 {editingUser?.username} 的系统参数</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 rounded-full transition-all">✕</button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* 密码重置 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">重置登录密码</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="输入新密码 (不修改请留空)"
                                        value={editForm.password}
                                        onChange={(e) => handleEditChange('password', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100/50 outline-none transition-all placeholder:text-slate-300"
                                    />
                                    {editForm.password && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase">
                                            <CheckCircle2 className="w-3 h-3" /> 点击保存后生效
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 角色 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">职能角色</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {['user', 'admin'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => handleEditChange('role', r)}
                                            className={`p-4 rounded-2xl border transition-all text-sm font-black flex items-center justify-center gap-2
                                                ${editForm.role === r ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}
                                            `}
                                        >
                                            {r === 'admin' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                            {r === 'admin' ? '系统管理员' : '普通用户'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 权限 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">高级权限分配</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <button
                                            key={perm.key}
                                            onClick={() => togglePermission(perm.key)}
                                            className={`p-4 rounded-2xl border transition-all text-xs font-bold flex items-center justify-between
                                                ${editForm.permissions.includes(perm.key) ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}
                                            `}
                                        >
                                            {perm.label}
                                            {editForm.permissions.includes(perm.key) && <CheckCircle2 className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-700">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-[10px] font-bold leading-relaxed">提示：权限变更后，用户需要在下次登录或刷新页面后才能完整使用对应模块功能。</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-sm rounded-2xl hover:bg-slate-100 transition-all"
                            >
                                取消操作
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="flex-1 py-4 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                            >
                                确认并保存配置
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
