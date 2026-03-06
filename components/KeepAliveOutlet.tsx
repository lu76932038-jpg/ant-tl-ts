import React, { useRef, useEffect, useState } from 'react';
import { useOutlet, useLocation, matchPath } from 'react-router-dom';
import { useTabs } from '../context/TabContext';

const KeepAliveOutlet: React.FC = () => {
    const { tabs, refreshKeyMap } = useTabs();
    const location = useLocation();
    const element = useOutlet();

    // 缓存已渲染的组件 { pathname: ReactElement }
    // 使用 ref 存储 cache，避免重新渲染导致 cache 丢失（虽然组件本身不卸载）
    // 但我们需要强制 KeepAliveOutlet 重新渲染以更新 display
    const componentCache = useRef<Map<string, React.ReactNode>>(new Map());

    // 强制更新状态
    const [, setTick] = useState(0);

    // 获取当前匹配到的组件并存入 Cache
    // 注意：element 本身是 Outlet 渲染出的子路由组件
    if (element) {
        // key 使用 pathname，确保唯一性
        // 如果需要支持同一个组件不同参数（如 /detail/1, /detail/2），pathname 天然支持
        componentCache.current.set(location.pathname, element);
    }

    // 每次 activeKey 变化或 tabs 变化（关闭 tab）时，清理 cache 中不再存在的 tab
    useEffect(() => {
        const currentPaths = new Set(tabs.map(t => t.path));
        for (const path of componentCache.current.keys()) {
            if (!currentPaths.has(path)) {
                componentCache.current.delete(path);
            }
        }
        setTick(t => t + 1);
    }, [tabs, location.pathname, refreshKeyMap]);

    return (
        <>
            {Array.from(componentCache.current.entries()).map(([path, component]) => {
                const isActive = path === location.pathname;
                const refreshKey = (refreshKeyMap && refreshKeyMap[path]) || 0;
                return (
                    <div
                        key={`${path}-${refreshKey}`}
                        style={{
                            display: isActive ? 'block' : 'none',
                            height: '100%',
                            width: '100%'
                        }}
                    >
                        {component}
                    </div>
                );
            })}
        </>
    );
};

export default KeepAliveOutlet;
