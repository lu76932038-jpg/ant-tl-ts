import React from 'react';

interface LogoProps {
    collapsed?: boolean;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ collapsed = false, className = '' }) => {
    return (
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${className}`}>
            {/* Logo 图标 */}
            <div className={`relative flex items-center justify-center transition-all duration-500 ${collapsed ? 'w-10 h-10' : 'w-9 h-9'}`}>
                {/* 外部光晕 */}
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />

                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-[#2c2c2c] drop-shadow-lg relative z-10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* 抽象的"木"字形态 - 代表树木/自然 */}
                    <path
                        d="M50 15V85M50 35C50 35 20 45 20 65M50 35C50 35 80 45 80 65M50 55C50 55 35 60 35 75M50 55C50 55 65 60 65 75"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-[draw_3s_ease-in-out_forwards]"
                    />

                    {/* 顶部年轮/能量点 - 代表神秘力量 */}
                    <circle cx="50" cy="20" r="5" className="fill-emerald-500 animate-pulse" />
                    <circle cx="20" cy="65" r="3" className="fill-slate-400" />
                    <circle cx="80" cy="65" r="3" className="fill-slate-400" />
                </svg>
            </div>

            {/* 文字标识 - 仅在展开时显示 */}
            <div className={`flex flex-col overflow-hidden transition-all duration-500 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <div className="flex flex-col leading-none">
                    <span className="text-xl font-medium tracking-[0.2em] text-[#2c2c2c] font-sans">
                        殸木
                    </span>
                    <span className="text-[10px] text-slate-400 tracking-[0.3em] font-light uppercase mt-0.5 ml-0.5">
                        QINGMU
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Logo;
