import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface SmartTooltipProps {
    visible: boolean;
    content: React.ReactNode;
    anchorRect: DOMRect | null;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
    visible,
    content,
    anchorRect,
    className,
    onMouseEnter,
    onMouseLeave
}) => {
    const [mounted, setMounted] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useLayoutEffect(() => {
        if (!visible || !anchorRect || !tooltipRef.current) return;

        const tooltip = tooltipRef.current;
        const { width: tw, height: th } = tooltip.getBoundingClientRect();
        const { top: at, left: al, width: aw, height: ah, bottom: ab } = anchorRect;

        const padding = 8; // Space between anchor and tooltip
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Vertical Logic
        // Prefer Bottom: anchor.bottom + padding
        let top = ab + padding;

        // If bottom overflows (and top has space), flip to top
        if (top + th > viewportHeight - 10) {
            const potentialTop = at - th - padding;
            // Only flip if there is space on top (avoid cropping top if element is near header)
            if (potentialTop > 10) {
                top = potentialTop;
            } else {
                // If neither fits well, prefer the side with MORE space or clamp max height (advanced)
                // For now, stick to top clamp if forced
                top = Math.min(top, viewportHeight - th - 10);
            }
        }

        // Horizontal Logic
        // Center calculate
        let left = al + (aw / 2) - (tw / 2);

        // Clamp to viewpoint
        const minLeft = 10;
        const maxLeft = viewportWidth - tw - 10;

        // Strict clamp
        left = Math.max(minLeft, Math.min(left, maxLeft));

        setPosition({ top, left });
    }, [visible, anchorRect, content]);

    if (!mounted) return null;

    // Use Portal to render outside of any overflow-hidden containers
    return createPortal(
        <div
            ref={tooltipRef}
            className={`fixed z-[9999] transition-opacity duration-200 
                ${visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
                ${className || ''}`}
            style={{
                top: position.top,
                left: position.left,
                transformOrigin: 'center top'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Glassmorphism Container */}
            <div className="bg-[#1a1c1e]/95 backdrop-blur-xl text-white p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-black/20 relative overflow-hidden">
                {/* Subtle sheen effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                {content}
            </div>
        </div>,
        document.body
    );
};
