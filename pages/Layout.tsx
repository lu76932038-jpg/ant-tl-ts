import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FileSpreadsheet,
    Users,
    LogOut,
    User,
    LayoutDashboard,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    Wrench,
    Settings,
    History,
    KeyRound,
    Fingerprint,
    Train,
    Package,
    ClipboardList,
    Truck,
    ShoppingCart,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import Logo from '../components/Logo';

const SidebarLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // State for expanded menus (handling multiple levels)
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['殸木小工具', '备货小助手', '个人中心', '系统管理']);

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    const handleLogout = () => {
        logout();
        // Force full reload to verify session clear
        window.location.href = `${import.meta.env.BASE_URL}login`;
    };

    interface MenuItem {
        label: string;
        path?: string;
        icon: React.ReactNode;
        roles?: string[];
        permission?: string;
        children?: MenuItem[];
    }

    const menuConfig: MenuItem[] = [
        {
            label: '殸木小工具',
            icon: <Wrench className="w-5 h-5 text-gray-600" />,
            children: [
                { label: '询价解析', path: '/', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'inquiry_parsing' },
                { label: 'A&T 订单', path: '/at-orders', icon: <FileSpreadsheet className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'at_orders' },
                {
                    label: '备货小助手',
                    icon: <Package className="w-4 h-4" />,
                    children: [
                        { label: '备货清单', path: '/stock', icon: <ClipboardList className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                        { label: '入库清单', path: '/stock/entrylist', icon: <Package className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                        { label: '出库清单', path: '/stock/outbound', icon: <Truck className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                        { label: '采购补货', path: '/stock/purchase-orders', icon: <ShoppingCart className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                    ]
                },
                { label: '高铁发票助手', path: '/train-invoice', icon: <Train className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'train_invoice' }
            ]
        },
        {
            label: '个人中心',
            icon: <Fingerprint className="w-5 h-5 text-emerald-500" />,
            children: [
                { label: '基本信息', path: '/profile', icon: <User className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'profile' },
                { label: '修改密码', path: '/change-password', icon: <KeyRound className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'change_password' }
            ]
        },
        {
            label: '系统管理',
            icon: <Settings className="w-5 h-5 text-slate-400" />,
            children: [
                { label: '用户管理', path: '/users', icon: <Users className="w-4 h-4" />, roles: ['admin'] },
                { label: '审计日志', path: '/logs', icon: <History className="w-4 h-4" />, roles: ['admin'] }
            ]
        }
    ];

    const canShowItem = (item: MenuItem) => {
        if (!user) return false;

        // Items with children but no roles/permission defined -> visible if any child is visible (logic handled in rendering)
        // Ideally parents don't need explicit roles if they just hold children, we'll check children visibility.
        // But for this simple system, let's assume specific leaves have permissions 
        // OR the item itself has checking logic.

        // If it's a folder (has children) and no explicit roles/permission, let's say it's visible (we will filter its children anyway)
        if (item.children && !item.roles && !item.permission) return true;

        // Admin always has access
        if (user.role === 'admin') return true;

        // Check explicit permissions if present
        if (item.permission) {
            return user.permissions?.includes(item.permission) || false;
        }

        // Fallback to role-based check
        if (item.roles) {
            return item.roles.includes(user.role);
        }

        return true;
    };

    const renderMenuItem = (item: MenuItem, level: number = 0) => {
        if (!canShowItem(item)) return null;

        const hasChildren = item.children && item.children.length > 0;
        if (hasChildren) {
            const visibleChildren = item.children!.filter(child => canShowItem(child));
            if (visibleChildren.length === 0) return null;
        }

        const isExpanded = expandedMenus.includes(item.label);
        const isActive = item.path === location.pathname;

        // 根据层级动态设置样式
        const getLevelStyles = () => {
            if (isSidebarCollapsed) return 'justify-center px-2';
            switch (level) {
                case 0: return 'px-3';
                case 1: return 'pl-6 pr-3';
                default: return 'pl-10 pr-3';
            }
        };

        // 父级菜单（带子菜单的分组）
        if (hasChildren) {
            const isTopLevel = level === 0;
            return (
                <div key={item.label} className={`${isTopLevel ? 'mb-2' : ''}`}>
                    <button
                        onClick={() => {
                            if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                            toggleMenu(item.label);
                        }}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'justify-between py-2.5'} 
                            rounded-xl transition-all duration-200 group
                            ${getLevelStyles()}
                            ${isTopLevel
                                ? `${isExpanded
                                    ? 'bg-gradient-to-r from-slate-100/80 to-slate-50/60 shadow-sm'
                                    : 'hover:bg-slate-100/50'}`
                                : 'hover:bg-white/60'
                            }
                        `}
                        title={isSidebarCollapsed ? item.label : ''}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-all duration-200
                                ${isTopLevel
                                    ? `${isExpanded
                                        ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md'
                                        : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'}`
                                    : 'text-slate-500 group-hover:text-slate-700'
                                }
                            `}>
                                {React.cloneElement(item.icon as React.ReactElement, {
                                    className: isTopLevel ? 'w-4 h-4' : 'w-3.5 h-3.5'
                                })}
                            </div>
                            {!isSidebarCollapsed && (
                                <span className={`font-semibold transition-colors text-left
                                    ${isTopLevel
                                        ? `text-xs tracking-wide ${isExpanded ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`
                                        : `text-[13px] ${isExpanded ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-600'}`
                                    }
                                `}>
                                    {item.label}
                                </span>
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                <ChevronRight className={`w-3.5 h-3.5 ${isExpanded ? 'text-slate-600' : 'text-slate-400'}`} />
                            </div>
                        )}
                    </button>

                    {/* 子菜单区域 */}
                    {(!isSidebarCollapsed && isExpanded) && (
                        <div className={`
                            overflow-hidden animate-in slide-in-from-top-2 duration-200
                            ${isTopLevel ? 'mt-1 ml-5 pl-3 border-l-2 border-slate-200/80' : 'mt-0.5 ml-3 pl-2 border-l border-slate-200/50'}
                        `}>
                            <div className="space-y-0.5 py-1">
                                {item.children!.map(child => renderMenuItem(child, level + 1))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 叶子菜单项（可点击的链接）
        return (
            <Link
                key={item.label}
                to={item.path!}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'} py-2 px-3 rounded-xl transition-all duration-200 group
                    ${isActive
                        ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg shadow-slate-800/20'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'
                    }
                    ${!isSidebarCollapsed && getLevelStyles()}
                `}
                title={isSidebarCollapsed ? item.label : ''}
            >
                <div className={`p-1 rounded-md transition-all duration-200
                    ${isActive
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100/50'
                    }
                `}>
                    {React.cloneElement(item.icon as React.ReactElement, {
                        className: 'w-3.5 h-3.5'
                    })}
                </div>
                {!isSidebarCollapsed && (
                    <span className={`text-[13px] font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="h-screen bg-[#f7f5f2] flex overflow-hidden font-sans max-w-[1920px] mx-auto">
            {/* Sidebar - Desktop */}
            <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white/40 backdrop-blur-xl border-r border-white/40 shrink-0 z-30 shadow-2xl relative transition-all duration-300 print:hidden`}>
                <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'pl-6'} border-b border-white/40 relative overflow-hidden transition-all duration-300`}>
                    <Logo collapsed={isSidebarCollapsed} />
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-6 custom-scrollbar">
                    {menuConfig.map((item) => renderMenuItem(item))}
                </nav>

                {/* 底部整合控制区 (User & Collapse) */}
                <div className="p-4 border-t border-slate-200/50 relative">
                    {/* 玻璃态背景卡片 */}
                    <div className={`
                        relative overflow-hidden transition-all duration-300
                        ${isSidebarCollapsed ? 'rounded-2xl bg-white/40' : 'rounded-[20px] bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl shadow-slate-900/20'}
                    `}>
                        {/* 装饰光效 (仅展开时) */}
                        {!isSidebarCollapsed && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                        )}

                        <div className={`flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'flex-col justify-center py-3 gap-3' : 'p-3 gap-3'}`}>

                            {/* 头像区域 */}
                            <div className={`relative shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'order-2' : ''}`}>
                                <div className={`
                                    flex items-center justify-center rounded-xl text-white transition-all duration-300
                                    ${isSidebarCollapsed
                                        ? 'w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg'
                                        : 'w-11 h-11 bg-white/10 ring-1 ring-white/20'
                                    }
                                `}>
                                    <User className={isSidebarCollapsed ? "w-5 h-5" : "w-6 h-6"} />
                                </div>
                                {/* 在线状态点 */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#2c2c2c] rounded-full" />
                            </div>

                            {/* 用户信息 (仅展开时显示) */}
                            <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'opacity-100'}`}>
                                <p className="text-sm font-bold text-white truncate leading-tight">{user?.username || '用户'}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white/90 uppercase tracking-wider">
                                        {user?.role}
                                    </span>
                                </div>
                            </div>

                            {/* 操作按钮组 */}
                            <div className={`flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'flex-col order-1 gap-2 mb-1' : 'gap-1'}`}>
                                {/* 注销按钮 */}
                                {/* 注销按钮 */}
                                <button
                                    onClick={handleLogout}
                                    type="button"
                                    className={`
                                        relative z-50 cursor-pointer
                                        flex items-center justify-center rounded-lg transition-all
                                        hover:bg-red-500/20 hover:text-red-400
                                        ${isSidebarCollapsed
                                            ? 'w-8 h-8 text-slate-500'
                                            : 'w-8 h-8 text-slate-400'
                                        }
                                    `}
                                    title="退出登录"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>

                                {/* 收缩/展开按钮 */}
                                <button
                                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                    className={`
                                        flex items-center justify-center rounded-lg transition-all
                                        hover:bg-white/20 hover:text-white
                                        ${isSidebarCollapsed
                                            ? 'w-8 h-8 text-slate-500 bg-slate-200/50 rotate-180'
                                            : 'w-8 h-8 text-slate-400'
                                        }
                                    `}
                                    title={isSidebarCollapsed ? "展开菜单" : "收起菜单"}
                                >
                                    <PanelLeftClose className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Container */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#f7f5f2] relative overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SidebarLayout;
