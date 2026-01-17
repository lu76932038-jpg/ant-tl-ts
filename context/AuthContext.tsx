import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { config } from '../config';

interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
    permissions?: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 从 localStorage 恢复登录状态
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            fetchCurrentUser(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchCurrentUser = async (authToken: string) => {
        try {
            const apiBaseUrl = config.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                // Token 无效,清除
                localStorage.removeItem('token');
                setToken(null);
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        // Force use correct IP
        const apiBaseUrl = config.apiBaseUrl;
        const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '登录失败');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
    };

    const register = async (username: string, email: string, password: string) => {
        const apiBaseUrl = config.apiBaseUrl;
        const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '注册失败');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
