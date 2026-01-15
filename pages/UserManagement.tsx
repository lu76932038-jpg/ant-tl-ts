import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Trash2, Shield } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
    permissions?: string[];
    created_at: string;
    last_login: string | null;
    is_active: boolean;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { token } = useAuth();

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<{
        role: 'user' | 'admin';
        permissions: string[];
    }>({ role: 'user', permissions: [] });

    // Available Permissions Definition
    const AVAILABLE_PERMISSIONS = [
        { key: 'inquiry_parsing', label: '询价解析' },
        { key: 'at_orders', label: 'A&T 订单' },
        { key: 'train_invoice', label: '高铁发票助手' },
        { key: 'profile', label: '个人中心(基本信息)' },
        { key: 'change_password', label: '个人中心(修改密码)' },
    ];

    // Create a map for easy lookup
    const PERMISSION_LABELS: Record<string, string> = AVAILABLE_PERMISSIONS.reduce((acc, curr) => {
        acc[curr.key] = curr.label;
        return acc;
    }, {} as Record<string, string>);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取用户列表失败');
            }

            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('确定要删除这个用户吗?')) return;

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('删除用户失败');
            }

            setUsers(users.filter(u => u.id !== userId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({
            role: user.role,
            permissions: user.permissions || []
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (field: 'role', value: string) => {
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

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: editForm.role,
                    permissions: editForm.permissions
                })
            });

            if (!response.ok) {
                throw new Error('更新用户失败');
            }

            const updatedUser = await response.json();

            // Update local state
            setUsers(users.map(u => u.id === editingUser.id ? {
                ...u,
                role: updatedUser.user.role,
                permissions: updatedUser.user.permissions
            } : u));

            setIsEditModalOpen(false);
            setEditingUser(null);
            alert('用户更新成功');
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">加载中...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-xl">
                    <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-light text-slate-800 tracking-[0.1em]">用户管理</h2>
                    <p className="text-sm text-slate-400 font-medium">管理系统中的所有用户清单</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">用户名</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">邮箱</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">角色</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">权限</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">注册时间</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">最后登录</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-900">{user.id}</td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.username}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    {user.role === 'admin' ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#2c2c2c] text-white rounded-full text-xs font-semibold">
                                            <Shield className="w-3 h-3" />
                                            管理员
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                            普通用户
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                                    {user.permissions?.map(p => PERMISSION_LABELS[p] || p).join(', ') || '无'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {user.last_login ? new Date(user.last_login).toLocaleString('zh-CN') : '从未登录'}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="删除用户"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        暂无用户数据
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">编辑用户</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <span className="text-slate-400 text-xl">×</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                                <input
                                    type="text"
                                    value={editingUser?.username}
                                    disabled
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => handleEditChange('role', e.target.value as 'user' | 'admin')}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="user">普通用户</option>
                                    <option value="admin">管理员</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">权限设置</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto px-1">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <label key={perm.key} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={editForm.permissions.includes(perm.key)}
                                                onChange={() => togglePermission(perm.key)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="flex-1 px-4 py-2.5 bg-[#2c2c2c] text-white font-medium rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-900/10"
                            >
                                保存修改
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
