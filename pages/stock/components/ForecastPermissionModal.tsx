import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Check, Search, ShieldAlert, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';

interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
}

interface ForecastPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    authorizedIds: number[];
    onSave: (ids: number[]) => void;
}

const ForecastPermissionModal: React.FC<ForecastPermissionModalProps> = ({
    isOpen,
    onClose,
    authorizedIds = [],
    onSave
}) => {
    const [selectedIds, setSelectedIds] = useState<number[]>(authorizedIds);
    const [searchTerm, setSearchTerm] = useState('');

    // Task 48: Real data state
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(authorizedIds);
            fetchUsers();
        }
    }, [isOpen, authorizedIds]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Task 48: Call backend users API
            const data = await api.get('/users');
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const toggleUser = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(uid => uid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSave = () => {
        onSave(selectedIds);
        onClose();
    };

    const filteredUsers = users.filter(u =>
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                        <ShieldAlert className="text-blue-600" size={20} />
                        预测数据访问权限
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        仅被勾选的用户可以查看此产品的销售预测数据。管理员(Admin)无需配置，默认拥有所有权限。
                    </p>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索用户 (用户名/邮箱)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    {/* User List */}
                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-sm">加载用户列表中...</span>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                未找到匹配用户
                            </div>
                        ) : (
                            filteredUsers.map(user => {
                                const isSelected = selectedIds.includes(user.id);
                                const isAdmin = user.role === 'admin';
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => !isAdmin && toggleUser(user.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                                            ${isAdmin ? 'bg-gray-50 border-gray-100 opacity-70 cursor-not-allowed' :
                                                isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold 
                                                ${isAdmin ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {(user.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                                    {user.username}
                                                    {isAdmin && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Admin</span>}
                                                </div>
                                                <div className="text-xs text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                            ${isSelected || isAdmin ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                            {(isSelected || isAdmin) && <Check size={12} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">
                        取消
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm active:scale-95 transition">
                        保存权限设置
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForecastPermissionModal;
