import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface CaptchaProps {
    onVerify: (verified: boolean) => void;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify }) => {
    const [isChecked, setIsChecked] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleCheck = () => {
        if (isChecked || isVerifying) return;

        setIsVerifying(true);
        // Simulate network verification delay
        setTimeout(() => {
            setIsVerifying(false);
            setIsChecked(true);
            onVerify(true);
        }, 1000);
    };

    return (
        <div
            className="flex items-center gap-4 p-4 bg-white/80 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-default select-none"
            onClick={(e) => {
                // Allow clicking the container to trigger check if clicking label text
                if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'INPUT') {
                    // handleCheck(); // Optional: make whole card clickable, but checkbox is better UX
                }
            }}
        >
            <div
                className={`
                    w-7 h-7 border-2 rounded-md flex items-center justify-center transition-all cursor-pointer
                    ${isChecked ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300 hover:border-slate-400'}
                    ${isVerifying ? 'animate-pulse bg-slate-100 border-slate-300' : ''}
                `}
                onClick={handleCheck}
            >
                {isChecked && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                {isVerifying && <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />}
            </div>
            <div className="flex-1 pl-2">
                <p className="text-sm font-medium text-slate-700 leading-none">
                    {isChecked ? '验证成功：尊贵的碳基生物' : '我发誓，我并不是 AI 🤖'}
                </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="logo" className="w-8 h-8 object-contain opacity-50" />
                <div className="flex flex-col items-center text-[8px] text-slate-400 leading-tight">
                    <span>reCAPTCHA</span>
                    <div className="flex gap-1">
                        <span>Privacy</span>
                        <span>-</span>
                        <span>Terms</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Captcha;
