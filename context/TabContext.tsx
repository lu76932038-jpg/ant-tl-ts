import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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

const SESSION_KEY = 'ant_multitabs';

/** 从 sessionStorage 读取持久化的页签列表，若无则返回默认首页页签 */
function loadTabsFromSession(): TabItem[] {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as TabItem[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // 解析失败时忽略，使用默认值
    }
    return [{ path: '/', title: '首页', closable: false }];
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    // 初始化时从 sessionStorage 恢复历史页签
    const [tabs, setTabs] = useState<TabItem[]>(loadTabsFromSession);
    const [refreshKeyMap, setRefreshKeyMap] = useState<Record<string, number>>({});

    // 每当 tabs 变化时，同步写入 sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(tabs));
        } catch {
            // 存储失败时忽略（例如隐私模式容量限制）
        }
    }, [tabs]);

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

        // 1. 预先计算当前路径的正确标题
        const titleMap = flattenMenuMap();
        let currentTitle = titleMap.get(pathname);

        if (!currentTitle) {
            // 采用更稳健的匹配方式，并尝试提取 SKU
            const skuMatch = pathname.match(/\/(?:backtesting|ai-advice|product|command|inquiry|community|credit\/detail)\/([^/]+)/);
            const sku = skuMatch ? skuMatch[1] : '';

            if (pathname.includes('/stock/backtesting/')) currentTitle = `回测模拟${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/stock/ai-advice/')) currentTitle = `备货AI建议${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/stock/product/')) currentTitle = `产品备货配置${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/stock/command/')) currentTitle = `备货指挥中心${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/inquiry/')) currentTitle = `询价详情${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/community/')) currentTitle = `帖子详情${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/credit/detail/')) currentTitle = `信用详情${sku ? ` - ${sku}` : ''}`;
            else if (pathname.includes('/credit/ai/')) currentTitle = '信用AI分析';
            else currentTitle = '未命名页面';
        }

        // 2. 使用函数式更新确保操作的是最新的 tabs 数组
        setTabs(prev => {
            const index = prev.findIndex(t => t.path === pathname);

            if (index !== -1) {
                // 如果已存在但标题是“未命名”，且我们现在有了更好的标题，则更新它
                if (prev[index].title === '未命名页面' && currentTitle !== '未命名页面') {
                    const newTabs = [...prev];
                    newTabs[index] = { ...newTabs[index], title: currentTitle! };
                    return newTabs;
                }
                return prev;
            }

            // 3. 不存在则推入新 Tab
            return [...prev, { path: pathname, title: currentTitle!, closable: true }];
        });
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
