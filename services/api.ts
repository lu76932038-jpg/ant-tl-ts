import axios from 'axios';

// Get base URL from env
const envBase = import.meta.env.VITE_API_BASE_URL || '';
// 确保 baseURL 包含 /api 前缀。
// 如果 VITE_API_BASE_URL 是 /ant-tool，则结果为 /ant-tool/api
// 如果未定义，则结果为 /api
const baseURL = envBase
    ? (envBase.endsWith('/api') ? envBase : `${envBase.replace(/\/+$/, '')}/api`)
    : '/api';

export const api = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 180000,
});

// Add interceptor for auth token if needed
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(response => {
    return response.data;
}, error => {
    if (error.response && error.response.status === 401) {
        // Redirect to login if unauthorized
        // window.location.href = '/login'; 
        // Better to handle in AuthContext or components
    }
    return Promise.reject(error);
});
