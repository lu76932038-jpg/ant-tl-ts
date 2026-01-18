import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Captcha from '../components/Captcha';
import { config } from '../config';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
            alert('验证码已发送至您的邮箱，请查收');

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
            const apiBaseUrl = config.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '重置失败');
            }

            alert('密码重置成功，请使用新密码登录');
            navigate('/login');
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

            <div className="relative z-10 w-full max-w-[400px] mx-4 md:ml-64 animate-in fade-in zoom-in duration-1000">
                <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-10 space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-light text-slate-800 tracking-[0.1em] mb-4">
                            重置密码
                        </h1>
                        <div className="h-px w-12 bg-slate-300 mx-auto" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50/80 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
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
                                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
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

                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-6 py-4 bg-white/60 border border-white/20 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-400/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                                placeholder="设置新密码"
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <Captcha onVerify={setIsCaptchaVerified} />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#2c2c2c] text-white rounded-2xl font-bold tracking-[0.3em] hover:bg-black disabled:bg-slate-400 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                        >
                            {isLoading ? '重置中...' : '确认重置'}
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

export default ForgotPassword;
