import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Home, MousePointer2, RotateCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { menuConfig, MenuItem } from '../config/menuConfig';
import { useTabs } from '../context/TabContext';

interface TabItem {
    path: string;
    title: string;
    closable: boolean;
}

const MultiTabs: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [tabs, setTabs] = useState<TabItem[]>([
        { path: '/', title: '首页', closable: false }
    ]);

    // 扁平化菜单以便查找标题
    const flattenMenuMap = useCallback(() => {
        const map = new Map<string, string>();
        const traverse = (items: MenuItem[]) => {
            items.forEach(item => {
                if (item.path) {
                    map.set(item.path, item.label);
                }
                if (item.children) {
                    traverse(item.children);
                }
            });
        };
        traverse(menuConfig);
        return map;
    }, []);

    // 监听路由变化，添加新 Tab
    useEffect(() => {
        const { pathname } = location;
        const menuMap = flattenMenuMap();
        let title = menuMap.get(pathname);

        if (!title) {
            // 尝试处理子路径逻辑（针对详情页）
            if (pathname.startsWith('/inquiry/')) title = '询价详情';
            else if (pathname.startsWith('/stock/product/')) title = '产品详情';
            else if (pathname.startsWith('/community/')) title = '帖子详情';
            else if (pathname.startsWith('/credit/detail/')) title = '信用详情';
            else if (pathname.startsWith('/credit/ai')) title = '信用AI分析';
            else title = '未命名页面';
        }

        const tabTitle = title; // Create a const to ensure type safety in setter

        setTabs(prev => {
            if (prev.some(tab => tab.path === pathname)) return prev;
            return [...prev, { path: pathname, title: tabTitle, closable: true }];
        });
    }, [location.pathname, flattenMenuMap]);

    const handleClose = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();

        // 1. 关闭 Tab
        const newTabs = tabs.filter(t => t.path !== path);
        setTabs(newTabs);

        // 2. 如果关闭的是当前激活的 Tab，则跳转到临近的 Tab
        if (path === location.pathname) {
            const index = tabs.findIndex(t => t.path === path);
            const nextTab = newTabs[index] || newTabs[index - 1];
            if (nextTab) {
                navigate(nextTab.path);
            }
        }
    };

    const handleTabClick = (path: string) => {
        navigate(path);
    };

    const { refreshTab } = useTabs();

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#f7f5f2] border-b border-slate-200/50">
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Tabs 滚动区域 */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right">
                <AnimatePresence initial={false}>
                    {tabs.map((tab) => {
                        const isActive = tab.path === location.pathname;
                        return (
                            <motion.div
                                key={tab.path}
                                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, width: 0, padding: 0, margin: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                onClick={() => handleTabClick(tab.path)}
                                className={`
                                    relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none shrink-0 group
                                    ${isActive
                                        ? 'bg-white border-slate-200 text-blue-600 shadow-sm'
                                        : 'bg-white/40 border-transparent text-slate-500 hover:bg-white/80 hover:text-slate-700'
                                    }
                                `}
                            >
                                {/* 只有首页显示图标，其他显示圆点或 nothing */}
                                {tab.path === '/' ? (
                                    <Home className="w-3.5 h-3.5" />
                                ) : isActive && (
                                    <motion.div layoutId="active-dot" className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                )}

                                <span>{tab.title}</span>

                                {tab.closable && (
                                    <button
                                        onClick={(e) => handleClose(e, tab.path)}
                                        className={`
                                            opacity-0 group-hover:opacity-100 p-0.5 rounded-md transition-all
                                            ${isActive ? 'hover:bg-slate-100 text-slate-400 hover:text-red-500' : 'hover:bg-slate-200/50 text-slate-400'}
                                        `}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* 右侧功能区 */}
            <div className="flex items-center pl-2 border-l border-slate-200/50">
                <button
                    onClick={() => refreshTab(location.pathname)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all"
                    title="刷新当前页"
                >
                    <RotateCw className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default MultiTabs;
