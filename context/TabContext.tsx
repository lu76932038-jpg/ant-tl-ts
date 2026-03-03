import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { menuConfig, MenuItem } from '../config/menuConfig';

export interface TabItem {
    path: string;
    title: string;
    closable: boolean;
}

interface TabContextType {
    tabs: TabItem[];
    activeKey: string;
    refreshKeyMap: Record<string, number>;
    closeTab: (path: string) => void;
    closeOtherTabs: (path: string) => void;
    closeAllTabs: () => void;
    refreshTab: (path: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [tabs, setTabs] = useState<TabItem[]>([
        { path: '/', title: '首页', closable: false }
    ]);
    const [refreshKeyMap, setRefreshKeyMap] = useState<Record<string, number>>({});

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
    React.useEffect(() => {
        const { pathname } = location;

        // 如果已存在，则无需操作
        const exists = tabs.some(tab => tab.path === pathname);
        if (exists) return;

        // 查找标题
        const titleMap = flattenMenuMap();
        let title = titleMap.get(pathname);

        // 处理动态路由或未匹配路由 (简单处理)
        if (!title) {
            if (pathname.startsWith('/inquiry/')) title = '询价详情';
            else if (pathname.startsWith('/stock/product/')) title = '产品详情';
            else if (pathname.startsWith('/community/')) title = '帖子详情';
            else if (pathname.startsWith('/credit/detail/')) title = '信用详情';
            else if (pathname.startsWith('/credit/ai')) title = '信用AI分析';
            else title = '未命名页面';
        }

        setTabs(prev => [...prev, { path: pathname, title: title!, closable: true }]);
    }, [location.pathname, flattenMenuMap]);

    const closeTab = useCallback((path: string) => {
        setTabs(prev => {
            const newTabs = prev.filter(t => t.path !== path);

            // 如果关闭的是当前激活的 Tab，则跳转到临近的 Tab
            if (path === location.pathname) {
                const index = prev.findIndex(t => t.path === path);
                // 优先找后一个，如果没有则找前一个
                // index now points to the *next* element in newTabs because the current one was removed
                // newTabs[index] is the one after, newTabs[index-1] is the one before
                // Wait, if we remove index i from prev:
                // newTabs[i] was prev[i+1]
                // newTabs[i-1] was prev[i-1]

                // Let's rely on newTabs array
                // The element at `index` in `prev` corresponds to `index` in `newTabs` (which was `index+1` in `prev`)
                // or `index-1` in `newTabs`

                let nextPath = '/';
                if (newTabs.length > 0) {
                    // 尝试跳转到右侧（原 index），如果越界则跳转到左侧（index - 1）
                    const nextTab = newTabs[index] || newTabs[index - 1] || newTabs[0];
                    nextPath = nextTab.path;
                }

                navigate(nextPath);
            }
            return newTabs;
        });
    }, [location.pathname, navigate]);

    const closeOtherTabs = useCallback((path: string) => {
        setTabs(prev => {
            const current = prev.find(t => t.path === path);
            const home = prev.find(t => t.path === '/');
            // 只保留首页和当前页
            const newTabs = [];
            if (home) newTabs.push(home);
            if (current && current.path !== '/') newTabs.push(current);

            // 如果 current 不是当前 active, 跳转过去
            if (path !== location.pathname) {
                navigate(path);
            }
            return newTabs;
        });
    }, [location.pathname, navigate]);

    const closeAllTabs = useCallback(() => {
        setTabs(prev => {
            const home = prev.find(t => t.path === '/');
            const newTabs = home ? [home] : [];
            navigate('/');
            return newTabs;
        });
    }, [navigate]);

    const refreshTab = useCallback((path: string) => {
        setRefreshKeyMap(prev => ({
            ...prev,
            [path]: (prev[path] || 0) + 1
        }));
    }, []);

    return (
        <TabContext.Provider value={{
            tabs,
            activeKey: location.pathname,
            refreshKeyMap,
            closeTab,
            closeOtherTabs,
            closeAllTabs,
            refreshTab
        }}>
            {children}
        </TabContext.Provider>
    );
};

export const useTabs = () => {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('useTabs must be used within a TabProvider');
    }
    return context;
};
