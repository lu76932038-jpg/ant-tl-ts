import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Captcha from '../components/Captcha';
import { config } from '../config';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Auth context now needs to support phone register, or we call API directly 
    // Ideally update useAuth, but for now direct fetch is faster to implement then refactor
    const { login } = useAuth(); // We might need to auto-login after register
    const navigate = useNavigate();

    const handleSendCode = async () => {
        console.log('FRONTEND: handleSendCode called. email:', email, 'isCaptchaVerified:', isCaptchaVerified);
        if (!email) {
            setError('请输入邮箱');
            return;
        }
        if (!isCaptchaVerified) {
            setError('请先完成人机验证');
            return;
        }

        setIsSendingCode(true);

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

            setIsCodeSent(true);
            setError('');
            alert('验证码已发送至您的邮箱，请查收');

            // Start countdown
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
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('FRONTEND: handleSubmit called. Payload:', { username, email, password, code });
        setError('');

        if (password.length < 6) {
            setError('密码长度至少为6位');
            return;
        }

        setIsLoading(true);

        try {
            const apiBaseUrl = config.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/auth/register-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, code })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '注册失败');
            }

            const data = await response.json();
            // Assuming the API returns token and user, we should update auth context
            // But AuthContext.register expects generic args. 
            // For simplicity, let's just redirect to login or auto-login if possible
            // To properly update context we would need to expose a setSession method or similar
            // Or just use the existing login method which calls API. 
            // Let's just navigate to login for now, or use the token to set storage manually (hacky).
            // Better: update AuthContext later. For now, redirect to login page with pre-filled info?
            // Actually, let's just use the returned token to "login"

            localStorage.setItem('token', data.token);
            // Reload page to correct state or use internal method if we refactor AuthContext
            window.location.href = import.meta.env.BASE_URL;

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
                    backgroundImage: `url("${import.meta.env.BASE_URL}assets/login-bg.png")`,
                    backgroundPosition: 'left center'
                }}
            />

            {/* Register Panel */}
            <div className="relative z-10 w-full max-w-[420px] mx-4 md:ml-64 animate-in fade-in zoom-in duration-1000">
                <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-10 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-light text-slate-800 tracking-[0.2em] mb-4">
                            殸木 · 注册
                        </h1>
                        <div className="h-px w-12 bg-slate-300 mx-auto" />
                    </div>

                    <form onSubmit={handleSubmit} className="p-0 space-y-5">
                        {error && (
                            <div className="bg-red-50/80 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-6 py-3.5 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                placeholder="用户名"
                                required
                            />

                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-6 py-3.5 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                    placeholder="电子邮箱"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={countdown > 0 || isSendingCode}
                                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-colors whitespace-nowrap ${(countdown > 0 || isSendingCode)
                                            ? 'bg-slate-300 cursor-not-allowed text-white'
                                            : !isCaptchaVerified
                                                ? 'bg-slate-500/50 text-white cursor-pointer hover:bg-slate-600'
                                                : 'bg-slate-800 text-white hover:bg-slate-900'
                                        }`}
                                >
                                    {isSendingCode ? '发送中' : (countdown > 0 ? `${countdown}s` : '发送验证码')}
                                </button>
                            </div>



                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-6 py-3.5 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                placeholder="验证码"
                                required
                            />

                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-6 py-3.5 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                placeholder="设置密码"
                                required
                            />

                            <div className="pt-2">
                                <Captcha onVerify={setIsCaptchaVerified} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#2c2c2c] text-white rounded-2xl font-bold tracking-[0.3em] hover:bg-black disabled:bg-slate-400 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                        >
                            {isLoading ? '注册中...' : '注册并登录'}
                        </button>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                返回登录
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
