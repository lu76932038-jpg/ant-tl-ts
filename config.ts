/// <reference types="vite/client" />
// 全局配置类型定义
declare global {
    interface Window {
        APP_CONFIG?: {
            VITE_API_BASE_URL: string;
        };
    }
}

// 优先使用 window.APP_CONFIG (运行时配置)，降级使用 import.meta.env (构建时配置)
const apiBaseUrl = window.APP_CONFIG?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export const config = {
    apiBaseUrl,
};
