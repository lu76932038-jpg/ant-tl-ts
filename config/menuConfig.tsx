import React from 'react';
import {
    FileSpreadsheet,
    Users,
    User,
    LayoutGrid,
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
    BookOpen,
    Layers,
    Database,
    MessageSquare,
    BarChart3,
    FileText
} from 'lucide-react';

export interface MenuItem {
    label: string;
    path?: string;
    icon: React.ReactNode;
    roles?: string[];
    permission?: string;
    children?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
    {
        label: '殸木社区',
        path: '/community',
        icon: <Users className="w-5 h-5 text-violet-600" />,
        roles: ['user', 'admin']
    },
    {
        label: '殸木小工具',
        icon: <Wrench className="w-5 h-5 text-gray-600" />,
        children: [
            {
                label: '询价管理',
                icon: <LayoutGrid className="w-4 h-4" />,
                children: [
                    { label: '询价解析列表', path: '/inquiry-history', icon: <ClipboardList className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'inquiry_parsing' },
                    { label: '操作指引', path: '/help', icon: <BookOpen className="w-4 h-4" /> }
                ]
            },
            {
                label: 'RAG 智能管理',
                icon: <Database className="w-4 h-4" />,
                roles: ['user', 'admin'],
                children: [
                    { label: 'RAG 问答', path: '/rag/chat', icon: <MessageSquare className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'at_orders' },
                    { label: '对话审计日志', path: '/rag/logs', icon: <History className="w-4 h-4" />, roles: ['admin'] },
                    { label: 'RAG 训练管理', path: '/rag/training', icon: <Settings className="w-4 h-4" />, roles: ['admin'] }
                ]
            },
            {
                label: '备货助手',
                icon: <Package className="w-4 h-4" />,
                children: [
                    { label: '备货清单', path: '/stock', icon: <ClipboardList className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                    { label: '采购计划', path: '/stock/purchase-plans', icon: <Layers className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                    { label: '采购订单', path: '/stock/purchase-orders', icon: <ShoppingCart className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                    { label: '入库清单', path: '/stock/entrylist', icon: <Package className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },
                    { label: '出库清单', path: '/stock/outbound', icon: <Truck className="w-4 h-4" />, roles: ['user', 'admin'], permission: 'stock_list' },

                    { label: '操作指引', path: '/stock/help', icon: <BookOpen className="w-4 h-4" /> },
                ]
            },
            {
                label: '报表管理',
                icon: <BarChart3 className="w-4 h-4" />,
                children: [
                    { label: '智能报表', path: '/report-management', icon: <FileText className="w-4 h-4" />, roles: ['user', 'admin'] }
                ]
            },
            {
                label: '客户管理',
                icon: <Users className="w-4 h-4" />,
                children: [
                    { label: '客户列表', path: '/customer/list', icon: <ClipboardList className="w-4 h-4" />, roles: ['user', 'admin'] }
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
            {
                label: '数据同步',
                icon: <History className="w-4 h-4" />,
                roles: ['admin'],
                children: [
                    { label: '出库数据同步', path: '/system/data-sync/outbound', icon: <Truck className="w-4 h-4" />, roles: ['admin'] },
                    { label: '出库计划同步', path: '/system/data-sync/outbound-plan', icon: <Truck className="w-4 h-4" />, roles: ['admin'] },
                    { label: '库存数据同步', path: '/system/data-sync/inventory', icon: <Database className="w-4 h-4" />, roles: ['admin'] },
                    { label: '入库数据同步', path: '/system/data-sync/inbound', icon: <Database className="w-4 h-4" />, roles: ['admin'] }
                ]
            },
            { label: '登录日志', path: '/login-logs', icon: <History className="w-4 h-4" />, roles: ['admin'] }
        ]
    }
];
