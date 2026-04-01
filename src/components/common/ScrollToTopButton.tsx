import React, { useState, useEffect, useCallback } from 'react';
import { ChevronsUp, ChevronsDown } from 'lucide-react';

interface ScrollButtonsProps {
    containerId?: string;
    threshold?: number;
    bottom?: string;
    right?: string;
    left?: string;
}

const ScrollToTopButton: React.FC<ScrollButtonsProps> = ({
    containerId,
    threshold = 300,
    bottom = 'bottom-24',
    right,
    left
}) => {
    const positionClass = left || right || 'right-4';
    const [showScrollUp, setShowScrollUp] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);

    const checkScrollPosition = useCallback(() => {
        let scrollTop = 0;
        let scrollHeight = 0;
        let clientHeight = 0;

        if (containerId) {
            const element = document.getElementById(containerId);
            if (element) {
                scrollTop = element.scrollTop;
                scrollHeight = element.scrollHeight;
                clientHeight = element.clientHeight;
            }
        } else {
            scrollTop = window.scrollY;
            scrollHeight = document.documentElement.scrollHeight;
            clientHeight = window.innerHeight;
        }

        // إظهار زر الأعلى إذا تجاوز المستخدم الـ threshold
        setShowScrollUp(scrollTop > threshold);

        // إظهار زر الأسفل إذا لم يصل المستخدم لنهاية الصفحة
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setShowScrollDown(!isAtBottom && scrollHeight > clientHeight + threshold);
    }, [containerId, threshold]);

    useEffect(() => {
        const target = containerId ? document.getElementById(containerId) : window;

        if (target) {
            target.addEventListener('scroll', checkScrollPosition);
            // فحص أولي عند التحميل
            checkScrollPosition();
        }

        return () => {
            if (target) {
                target.removeEventListener('scroll', checkScrollPosition);
            }
        };
    }, [containerId, checkScrollPosition]);

    const scrollToTop = () => {
        if (containerId) {
            const element = document.getElementById(containerId);
            if (element) {
                element.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = () => {
        if (containerId) {
            const element = document.getElementById(containerId);
            if (element) {
                element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
            }
        } else {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
    };

    const buttonBaseClass = `
        p-2 rounded-full
        bg-brand-green/80 backdrop-blur-md
        text-white shadow-lg border border-white/20
        transform transition-all duration-300 ease-in-out
        hover:bg-brand-green hover:scale-110 hover:shadow-2xl
        active:scale-95
    `;

    return (
        <div className={`fixed ${bottom} ${positionClass} z-[9999] flex flex-col gap-2`}>
            {/* زر التمرير للأعلى */}
            <button
                onClick={scrollToTop}
                className={`
                    ${buttonBaseClass}
                    ${showScrollUp ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}
                `}
                aria-label="التمرير للأعلى"
            >
                <ChevronsUp size={18} />
            </button>

            {/* زر التمرير للأسفل */}
            <button
                onClick={scrollToBottom}
                className={`
                    ${buttonBaseClass}
                    ${showScrollDown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}
                `}
                aria-label="التمرير للأسفل"
            >
                <ChevronsDown size={18} />
            </button>
        </div>
    );
};

export default ScrollToTopButton;
