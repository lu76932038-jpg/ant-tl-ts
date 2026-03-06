import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Home, RotateCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTabs } from '../context/TabContext';

const MultiTabs: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // 直接从 TabContext 读取，刷新后可从 sessionStorage 恢复历史页签
    const { tabs, closeTab, refreshTab } = useTabs();

    const handleClose = useCallback((e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        closeTab(path);
    }, [closeTab]);

    const handleTabClick = (path: string) => {
        navigate(path);
    };



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
