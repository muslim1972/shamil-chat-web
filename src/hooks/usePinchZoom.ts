import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to handle pinch-to-zoom gestures.
 * Returns { zoom, ref } where ref should be attached to the element.
 */
export const usePinchZoom = (
    options: { minZoom?: number; maxZoom?: number; sensitivity?: number } = {}
) => {
    const { minZoom = 1, maxZoom = 2.5 } = options;
    const [zoom, setZoom] = useState(1);
    const [initialDistance, setInitialDistance] = useState<number | null>(null);
    const [initialZoom, setInitialZoom] = useState(1);
    const [element, setElement] = useState<HTMLElement | null>(null);

    // Callback ref to capture the element when it mounts
    const ref = useCallback((node: HTMLElement | null) => {
        setElement(node);
    }, []);

    useEffect(() => {
        if (!element) return;

        const getDistance = (touches: TouchList) => {
            const [touch1, touch2] = [touches[0], touches[1]];
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Determine if we should prevent default based on context, 
                // but usually needed for pinch.
                // We don't prevent Default here to allow scrolling if not pinching?
                // Actually, standard is: wait for move to confirm pinch.
                setInitialDistance(getDistance(e.touches));
                setInitialZoom(zoom);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialDistance !== null) {
                if (e.cancelable) e.preventDefault();
                const currentDistance = getDistance(e.touches);
                const ratio = currentDistance / initialDistance;
                let newZoom = initialZoom * ratio;
                newZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);
                setZoom(newZoom);
            }
        };

        const handleTouchEnd = () => {
            setInitialDistance(null);
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [element, minZoom, maxZoom, initialDistance, initialZoom, zoom]);

    return { zoom, ref };
};
