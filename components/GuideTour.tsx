import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export interface GuideStep {
    targetId: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

interface GuideTourProps {
    steps: GuideStep[];
    onComplete: () => void;
    tourKey: string;
}

const GuideTour: React.FC<GuideTourProps> = ({ steps, onComplete, tourKey }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const hasCompleted = localStorage.getItem(`has_completed_guide_${tourKey}`);
        if (!hasCompleted) {
            // 延迟一点显示，等待页面渲染和数据加载
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [tourKey]);

    useLayoutEffect(() => {
        if (isVisible && steps[currentStep]) {
            const updateRect = () => {
                const element = document.getElementById(steps[currentStep].targetId);
                if (element) {
                    // 核心修复：自动滚动到目标元素，使其在视口中居中
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });

                    // 稍微给一点延迟让滚动动画完成再计算 rect，或者由 scroll 监听处理
                    setTimeout(() => {
                        setTargetRect(element.getBoundingClientRect());
                    }, 500);
                } else {
                    // 如果目标元素不存在（例如列表为空），直接跳到下一步或结束
                    handleNext();
                }
            };

            updateRect();
            window.addEventListener('resize', updateRect);
            window.addEventListener('scroll', updateRect);
            return () => {
                window.removeEventListener('resize', updateRect);
                window.removeEventListener('scroll', updateRect);
            };
        }
    }, [isVisible, currentStep, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(`has_completed_guide_${tourKey}`, 'true');
        setIsVisible(false);
        onComplete();
    };

    if (!isVisible || !targetRect) return null;

    const step = steps[currentStep];

    // 计算提示框位置
    const getPopoverStyle = (): React.CSSProperties => {
        if (!targetRect) return {};

        const padding = 20;
        const arrowSize = 10;
        const popoverWidth = 384; // w-96 = 384px

        // 预设位置
        let top = 0;
        let left = 0;
        let transform = '';

        if (step.position === 'bottom') {
            top = targetRect.bottom + arrowSize + padding;
            left = targetRect.left + targetRect.width / 2;
            transform = 'translateX(-50%)';
        } else if (step.position === 'top') {
            top = targetRect.top - arrowSize - padding;
            left = targetRect.left + targetRect.width / 2;
            transform = 'translate(-50%, -100%)';

            // 安全限制：如果离顶部太近（< 100px），强制改到下方显示
            if (top < 100) {
                top = targetRect.bottom + arrowSize + padding;
                transform = 'translateX(-50%)';
            }
        } else if (step.position === 'left') {
            top = targetRect.top + targetRect.height / 2;
            left = targetRect.left - arrowSize - padding;
            transform = 'translate(-100%, -50%)';
        } else { // right
            top = targetRect.top + targetRect.height / 2;
            left = targetRect.right + arrowSize + padding;
            transform = 'translateY(-50%)';
        }

        // 横向越界修正
        const halfWidth = popoverWidth / 2;
        if (left < halfWidth + 20) left = halfWidth + 20;
        if (left > window.innerWidth - halfWidth - 20) left = window.innerWidth - halfWidth - 20;

        return {
            top,
            left,
            transform,
            minWidth: `${popoverWidth}px`,
            position: 'absolute'
        };
    };

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* SVG 遮罩与切口 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                <defs>
                    <mask id="guide-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - 4}
                            y={targetRect.top - 4}
                            width={targetRect.width + 8}
                            height={targetRect.height + 8}
                            rx="8"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.6)"
                    mask="url(#guide-mask)"
                    className="backdrop-blur-[2px] transition-all duration-300"
                />
            </svg>

            {/* 提示内容卡片 */}
            <div
                className="absolute bg-white/95 backdrop-blur-xl text-slate-800 p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-96 pointer-events-auto animate-in fade-in zoom-in-95 duration-500 border border-white/20"
                style={getPopoverStyle()}
            >
                {/* 装饰性箭头 */}
                <div className={`absolute w-4 h-4 bg-white/95 rotate-45 
                    ${step.position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2' : ''}
                    ${step.position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2' : ''}
                    ${step.position === 'left' ? '-right-2 top-1/2 -translate-y-1/2' : ''}
                    ${step.position === 'right' ? '-left-2 top-1/2 -translate-y-1/2' : ''}
                `} />

                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
                            New User Guide
                        </span>
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-100'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={handleComplete} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>

                <h4 className="text-2xl font-black text-slate-900 mb-2 tracking-tight leading-tight">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-bold mb-10">{step.content}</p>

                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all
                            ${currentStep === 0 ? 'opacity-0 invisible' : 'text-slate-400 hover:bg-slate-50'}
                        `}
                    >
                        <ChevronLeft size={16} strokeWidth={3} /> 上一步
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex-1 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-sm font-black"
                    >
                        {currentStep === steps.length - 1 ? (
                            <>开启体验 <Check size={18} strokeWidth={3} /></>
                        ) : (
                            <>下一步 <ChevronRight size={18} strokeWidth={3} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideTour;
