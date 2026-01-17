import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, MessageSquareCode } from 'lucide-react';
import Captcha from '../components/Captcha';
import { config } from '../config';

const Login: React.FC = () => {
    const [loginMethod, setLoginMethod] = useState<'password' | 'email'>('password');

    // Password Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Email Login State
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSendCode = async () => {
        if (!email) {
            setError('请输入邮箱');
            return;
        }
        if (!isCaptchaVerified) {
            setError('请先完成人机验证');
            return;
        }

        try {
            const apiBaseUrl = config.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '验证码发送失败');
            }

            setError('');
            alert('验证码已发送 (请查看控制台)');

            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (loginMethod === 'password') {
                if (!isCaptchaVerified) {
                    setError('请先完成人机验证');
                    setIsLoading(false);
                    return;
                }
                await login(username, password);
                window.location.href = import.meta.env.BASE_URL;
            } else {
                // Email login logic
                const apiBaseUrl = config.apiBaseUrl;
                const response = await fetch(`${apiBaseUrl}/api/auth/login-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || '登录失败');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                // Force reload to update auth context state
                window.location.href = import.meta.env.BASE_URL;
            }
            // If successful, login() or direct redirect handles navigation
            // navigate('/'); // Handled by refresh for now to sync state simply
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#f7f5f2] select-none">
            {/* Zen Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center md:bg-[length:100%_auto] bg-no-repeat"
                style={{
                    backgroundImage: 'url("/assets/login-bg.png")',
                    backgroundPosition: 'left center'
                }}
            />

            {/* Login Panel */}
            <div className="relative z-10 w-full max-w-[380px] mx-4 md:ml-64 animate-in fade-in zoom-in duration-1000">
                <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-light text-slate-800 tracking-[0.2em] mb-4">
                            殸木
                        </h1>
                        <div className="h-px w-12 bg-slate-300 mx-auto" />
                    </div>

                    {/* Method Toggle */}
                    <div className="flex bg-white/50 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setLoginMethod('password'); setError(''); setIsCaptchaVerified(false); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${loginMethod === 'password' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <KeyRound className="w-3 h-3" />
                            密码登录
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMethod('email'); setError(''); setIsCaptchaVerified(false); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <MessageSquareCode className="w-3 h-3" />
                            邮箱登录
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50/80 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {loginMethod === 'password' ? (
                                <>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                        placeholder="用户名"
                                        required
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                        placeholder="密码"
                                        required
                                    />
                                    <div className="pt-2">
                                        <Captcha onVerify={setIsCaptchaVerified} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-6 pr-32 py-4 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                            placeholder="电子邮箱"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={countdown > 0}
                                            className="absolute right-2 top-2 bottom-2 px-4 bg-slate-800 text-white rounded-xl text-xs font-bold disabled:bg-slate-300 disabled:cursor-not-allowed transition-all hover:bg-slate-900 shadow-sm"
                                        >
                                            {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                        placeholder="输入验证码"
                                        required
                                    />
                                    <div className="pt-2">
                                        <Captcha onVerify={setIsCaptchaVerified} />
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#2c2c2c] text-white rounded-2xl font-bold tracking-[0.3em] hover:bg-black disabled:bg-slate-400 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                        >
                            {isLoading ? '验证中...' : '进入系统'}
                        </button>

                        <div className="flex justify-between items-center px-2">
                            <Link
                                to="/forgot-password"
                                className="text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                            >
                                忘记密码?
                            </Link>
                            <Link
                                to="/register"
                                className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                注册新账户
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
