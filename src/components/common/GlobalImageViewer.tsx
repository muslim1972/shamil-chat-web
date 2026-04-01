import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';
import { useImageViewerStore } from '../../stores/useImageViewerStore';
import { createPortal } from 'react-dom';

export const GlobalImageViewer: React.FC = () => {
    const { isOpen, src, alt, closeImage } = useImageViewerStore();
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // حدود التكبير
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;

    // إعادة تعيين الحالة عند الفتح
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
        } else {
            document.body.style.overflow = 'unset';
            // مهلة قصيرة لحذف الصورة لتجنب الوميض عند الإغلاق
            const timer = setTimeout(() => {
                // Cleanup if needed
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // معالج التكبير بالعجلة + Ctrl
    const handleWheel = useCallback((e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.01;
            const newScale = Math.min(Math.max(MIN_SCALE, scale + delta), MAX_SCALE);
            setScale(newScale);
        }
    }, [scale]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [handleWheel]);

    // معالجة اللمس (Double Tap & Pinch)
    const lastTouchEnd = useRef<number>(0);
    const lastDist = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // بداية القرص (Pinch)
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastDist.current = dist;
        } else if (e.touches.length === 1) {
            // Drag Start
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            });

            // Double Tap Logic
            const now = Date.now();
            if (now - lastTouchEnd.current < 300) {
                handleDoubleTap();
            }
            lastTouchEnd.current = now;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch to Zoom
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            if (lastDist.current > 0) {
                const delta = dist - lastDist.current;
                const newScale = Math.min(Math.max(MIN_SCALE, scale + delta * 0.01), MAX_SCALE);
                setScale(newScale);
            }
            lastDist.current = dist;
        } else if (e.touches.length === 1 && scale > 1 && isDragging) {
            // Pan zoomed image
            const x = e.touches[0].clientX - dragStart.x;
            const y = e.touches[0].clientY - dragStart.y;
            setPosition({ x, y });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastDist.current = 0;
    };

    // Mouse Dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            const x = e.clientX - dragStart.x;
            const y = e.clientY - dragStart.y;
            setPosition({ x, y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleDoubleTap = () => {
        if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setScale(2.5);
        }
    };

    if (!isOpen || !src) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center overflow-hidden touch-none"
            ref={containerRef}
        >
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
                <button onClick={closeImage} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors">
                    <X size={24} />
                </button>
                <div className="flex gap-4">
                    <button onClick={() => setScale(s => Math.min(s + 0.5, MAX_SCALE))} className="p-2 text-white hover:text-cyan-400">
                        <ZoomIn size={24} />
                    </button>
                    <button onClick={() => setScale(s => Math.max(s - 0.5, MIN_SCALE))} className="p-2 text-white hover:text-cyan-400">
                        <ZoomOut size={24} />
                    </button>
                    <button onClick={handleDoubleTap} className="p-2 text-white hover:text-cyan-400">
                        {scale > 1 ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div
                className="w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt || 'Zoomable'}
                    className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out select-none"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                    draggable={false}
                />
            </div>

            {/* Helper Text */}
            {scale === 1 && (
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-50">
                    <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        انقر مرتين للتكبير أو استخدم أصابعك
                    </span>
                </div>
            )}
        </div>,
        document.body
    );
};
