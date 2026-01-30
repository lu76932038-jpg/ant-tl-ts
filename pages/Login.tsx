import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, MessageSquareCode, ShieldCheck, Mail, Lock, User, Sparkles, ChevronRight } from 'lucide-react';
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
                window.location.href = import.meta.env.BASE_URL;
            }
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#f7f5f2] font-sans selection:bg-slate-900 selection:text-white">

            {/* Immersive Background Container */}
            <div className="absolute inset-0 z-0">
                {/* 1. Artist Backdrop (Generated Image placeholder or gradient) */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                    style={{
                        backgroundImage: `url("${import.meta.env.BASE_URL}assets/login-bg.png")`,
                        backgroundColor: '#f7f5f2' // Fallback
                    }}
                />

                {/* 2. Soft Dynamic Overlays */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full animate-pulse delay-700" />
            </div>

            {/* Layout Wrapper */}
            <div className="relative z-10 w-full max-w-7xl px-8 flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Brand Side (Visible on Desktop) */}
                <div className="hidden lg:flex flex-col max-w-lg space-y-8 animate-in slide-in-from-left-8 duration-1000">
                    {/* Left side text removed as per user request */}
                </div>

                {/* Login Container */}
                <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-1000">
                    <div className="bg-white/40 backdrop-blur-3xl border border-white/80 rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.08)] p-10 relative overflow-hidden group">

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="relative z-10 space-y-8">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">欢迎回来</h2>
                                    <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">V{import.meta.env.VITE_APP_VERSION}</span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium italic">殸木系统：让决策回归数据</p>
                            </div>

                            {/* Login Method Toggle */}
                            <div className="flex bg-slate-200/40 p-1.5 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('password'); setError(''); setIsCaptchaVerified(false); }}
                                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${loginMethod === 'password' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <KeyRound size={14} strokeWidth={3} />
                                    静态密码
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('email'); setError(''); setIsCaptchaVerified(false); }}
                                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <MessageSquareCode size={14} strokeWidth={3} />
                                    邮箱验证
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold text-center animate-shake flex items-center justify-center gap-2">
                                        <ShieldCheck size={14} />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {loginMethod === 'password' ? (
                                        <>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                                    <User size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full pl-14 pr-6 py-5 bg-white/60 border border-white rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
                                                    placeholder="用户名"
                                                    required
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                                    <Lock size={18} />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full pl-14 pr-6 py-5 bg-white/60 border border-white rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
                                                    placeholder="密码"
                                                    required
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-slate-900 transition-colors">
                                                    <Mail size={18} />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-14 pr-32 py-5 bg-white/60 border border-white rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
                                                    placeholder="电子邮箱"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSendCode}
                                                    disabled={countdown > 0}
                                                    className="absolute right-3 top-3 bottom-3 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-black transition-all shadow-lg active:scale-95"
                                                >
                                                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="w-full px-6 py-5 bg-white/60 border border-white rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold text-center tracking-[0.5em]"
                                                placeholder="••••••"
                                                maxLength={6}
                                                required
                                            />
                                        </>
                                    )}
                                    <div className="pt-2">
                                        <Captcha onVerify={setIsCaptchaVerified} />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:bg-black active:scale-[0.98] disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    {isLoading ? '登录中...' : (
                                        <>
                                            验证登录
                                            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                <div className="flex justify-between items-center px-2">
                                    <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                                        忘记密码？
                                    </Link>
                                    <Link to="/register" className="text-[10px] font-black uppercase tracking-widest text-slate-900 group flex items-center gap-1">
                                        注册账户 <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;
