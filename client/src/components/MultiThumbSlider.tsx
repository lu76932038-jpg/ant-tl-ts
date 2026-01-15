import React, { useState, useRef, useEffect } from 'react';

interface MultiThumbSliderProps {
    min?: number;
    max?: number;
    values: number[]; // Array of values (sorted)
    onChange: (values: number[]) => void;
    colors?: string[]; // Colors for segments [0-v1, v1-v2, v2-end]
    labels?: string[]; // Labels for segments
    disabled?: boolean;
}

const MultiThumbSlider: React.FC<MultiThumbSliderProps> = ({
    min = 0,
    max = 100,
    values,
    onChange,
    colors = ['#E0E7FF', '#C7D2FE', '#818CF8'],
    labels = [],
    disabled = false
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const getPercentage = (value: number) => ((value - min) / (max - min)) * 100;

    const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
        if (disabled) return;
        setDraggingIndex(index);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingIndex === null || !trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            const percentage = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            let newValue = Math.round(percentage * (max - min) + min);

            const newValues = [...values];

            // Constraint: v[i-1] <= v[i] <= v[i+1]
            // Allow minimal gap of 1? Let's say yes.
            const GAP = 1;
            const prevVal = draggingIndex > 0 ? newValues[draggingIndex - 1] + GAP : min;
            const nextVal = draggingIndex < newValues.length - 1 ? newValues[draggingIndex + 1] - GAP : max;

            newValue = Math.max(prevVal, Math.min(newValue, nextVal));

            if (newValue !== newValues[draggingIndex]) {
                newValues[draggingIndex] = newValue;
                onChange(newValues);
            }
        };

        const handleMouseUp = () => {
            setDraggingIndex(null);
        };

        if (draggingIndex !== null) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingIndex, values, min, max, onChange]);

    return (
        <div className="relative h-12 flex items-center select-none w-full px-2">
            <div ref={trackRef} className="relative w-full h-3 bg-gray-200 rounded-full">
                {/* Segments */}
                {values.length > 0 && (
                    <>
                        {/* Segment 0: min -> val[0] */}
                        <div
                            className="absolute h-full rounded-l-full top-0 left-0 transition-all duration-75"
                            style={{
                                width: `${getPercentage(values[0])}%`,
                                backgroundColor: colors[0] || 'gray'
                            }}
                        />
                        {/* Middle Segments */}
                        {values.map((val, i) => {
                            if (i === values.length - 1) return null; // Last value handled by last segment
                            const nextVal = values[i + 1];
                            return (
                                <div
                                    key={i}
                                    className="absolute h-full top-0 transition-all duration-75"
                                    style={{
                                        left: `${getPercentage(val)}%`,
                                        width: `${getPercentage(nextVal) - getPercentage(val)}%`,
                                        backgroundColor: colors[i + 1] || 'gray'
                                    }}
                                />
                            );
                        })}
                        {/* Last Segment: val[last] -> max */}
                        <div
                            className="absolute h-full rounded-r-full top-0 right-0 transition-all duration-75"
                            style={{
                                width: `${100 - getPercentage(values[values.length - 1])}%`,
                                backgroundColor: colors[colors.length - 1] || 'gray'
                            }}
                        />
                    </>
                )}

                {/* Thumbs */}
                {values.map((val, i) => (
                    <div
                        key={i}
                        onMouseDown={handleMouseDown(i)}
                        className={`absolute w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ left: `${getPercentage(val)}%` }}
                    />
                ))}

                {/* Labels (Centered in segments) */}
                {labels.length > 0 && (
                    <div className="absolute top-5 w-full h-6 pointer-events-none">
                        {(() => {
                            const boundaries = [min, ...values, max];
                            return labels.map((label, i) => {
                                if (i >= boundaries.length - 1) return null;
                                const start = boundaries[i];
                                const end = boundaries[i + 1];
                                const center = (start + end) / 2;
                                const size = end - start;
                                if (size < 5) return null; // Hide label if too small
                                return (
                                    <div key={i} className="absolute text-[10px] font-bold text-gray-500 -translate-x-1/2 text-center whitespace-nowrap" style={{ left: `${getPercentage(center)}%` }}>
                                        {label}
                                    </div>
                                )
                            });
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiThumbSlider;
